import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkMinimumBalance, deductChapterCost } from "@/lib/ai/cost-engine";
import { estimateChapterCoins } from "@/lib/ai/pricing";
import { fetchSearchContext } from "@/lib/ai/search-context";
import { generateWithFallback } from "@/lib/ai/model-fallback";
import {
  detectGenre,
  shouldGroundWithWebSearch,
  buildChapterSystemPrompt,
} from "@/lib/ai/book-style";
import { sanitizeGeneratedHtml } from "@/lib/ai/sanitize-html";
import { resolveWorkType, chapterNounFor, isImageDrivenWorkType } from "@/lib/book/work-type";
import { visionInstruction } from "@/lib/book/book-blueprint";
import { assignChapterLabels } from "@/lib/book/chapter-heading";
import type { BookBible } from "@/lib/book/book-bible";
import { demoteUnsourcedKeyFigures } from "@/lib/ai/factuality";
import { auditChapter, buildRepairPrompt, wordCount as countWords } from "@/lib/book/chapter-audit";
import { advanceBookJob, checkBookJobLease, stopBookJob, type BookJobStatus } from "@/lib/ai/book-job-lease";

/**
 * Génération de livre complet — pipeline serveur résilient.
 *
 * Remplace la boucle côté client (redaction/page.tsx) qui générait chapitre
 * après chapitre via `fetch` depuis le NAVIGATEUR : fermer l'onglet ou perdre
 * le réseau interrompait la génération sans façon de la reprendre proprement,
 * et la "continuité" entre chapitres ne reposait que sur une liste de TITRES.
 *
 * Ici, un job persisté en base (book_generation_jobs) avance chapitre par
 * chapitre entièrement côté serveur, sous un bail (voir book-job-lease et
 * book-job-runner) : un worker écrit plusieurs chapitres par invocation puis
 * passe le relais, et un job dont le worker s'est tu est repris
 * automatiquement. Le client n'a plus qu'à interroger le statut du job
 * (polling) — fermer l'onglet n'arrête plus rien.
 *
 * La continuité inter-chapitres utilise un VRAI résumé (2-3 phrases générées
 * par IA, pas juste le titre) des N derniers chapitres, plus la bible de
 * personnages/instructions du projet quand elle existe.
 */

export interface BookJobChapterPlan {
  chapterId: string;
  /** Numéro de STOCKAGE (ordre en base) — pas le numéro affiché au lecteur. */
  number: number;
  title: string;
  brief: string;
  /**
   * Titre canonique affiché (« Chapitre 1 : … », « Introduction »), calculé à
   * la préparation du plan. Facultatif pour les jobs créés avant son ajout :
   * il est alors recalculé ici, au démarrage du chapitre.
   */
  heading?: string;
}

export interface BookJobSettings {
  title: string;
  synopsis?: string;
  tone?: string;
  category?: string;
  characters?: string;
  instructions?: string;
  bookOutline?: string;
  model: string;
  targetWords?: number;
  useWebSearch?: boolean;
  /** Forme de l'ouvrage : "livre" | "guide" | "ebook" | "storybook". */
  workType?: string;
  /** Public vise — pilote la tranche d'age d'un album illustre. */
  audience?: string;
  /**
   * Visuels importés par l'auteur (flux « Vision-to-Story » du blueprint
   * Storybook), dans l'ordre de l'histoire. Ils sont RÉPARTIS entre les
   * chapitres : chaque chapitre ne reçoit que ses propres images, sinon le
   * modèle réutiliserait les mêmes visuels d'un chapitre à l'autre.
   */
  imageUrls?: string[];
}

/**
 * Part d'images revenant au chapitre d'indice `chapterIndex`, en répartissant
 * `imageUrls` aussi équitablement que possible entre `totalChapters`.
 * Les images restantes sont distribuées aux premiers chapitres.
 */
export function imagesForChapter(
  imageUrls: string[] | undefined,
  chapterIndex: number,
  totalChapters: number
): string[] {
  const urls = (imageUrls || []).filter(Boolean);
  if (urls.length === 0 || totalChapters <= 0) return [];

  const base = Math.floor(urls.length / totalChapters);
  const remainder = urls.length % totalChapters;

  // Les `remainder` premiers chapitres reçoivent une image de plus.
  const start =
    chapterIndex * base + Math.min(chapterIndex, remainder);
  const count = base + (chapterIndex < remainder ? 1 : 0);

  return urls.slice(start, start + count);
}

export function getServiceRoleClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Nombre de résumés de chapitres précédents transmis au rédacteur.
 *
 * C'était 4. Résultat : en écrivant le chapitre 9, le modèle ignorait tout des
 * chapitres 1 à 4 — d'où les redites, les définitions répétées et les
 * contradictions. Un résumé pèse 2 à 3 phrases : même un livre de 24 chapitres
 * tient dans quelques kilo-octets, une fraction négligeable de la fenêtre de
 * contexte. On garde donc TOUT l'historique, avec une borne haute de sécurité.
 */
const MAX_RECENT_SUMMARIES = 24;
const MAX_ATTEMPTS_PER_CHAPTER = 3;

function buildSystemPrompt(
  settings: BookJobSettings,
  chapter: BookJobChapterPlan,
  chapterHeading: string,
  job: BookJobRow,
  recentSummaries: { number: number; title: string; summary: string }[],
  searchContext: string,
  wordsTarget: number,
  /** Visuels analyses revenant a CE chapitre (blueprint Storybook). */
  storybookAssets?: Array<{ file_url: string; ai_analysis?: string | null }>
): string {
  // Les résumés de continuité sont référencés par leur TITRE, jamais par un
  // numéro de stockage : c'est ce numéro décalé qui faisait dire au modèle
  // « le chapitre 2 » en parlant de l'introduction.
  const previousSummary = recentSummaries.length
    ? recentSummaries.map((s) => `« ${s.title} » : ${s.summary}`).join("\n")
    : "";

  const genre = detectGenre(settings.category, settings.tone);
  // Plan COMPLET du livre : le rédacteur voit ce qui est déjà écrit, ce qui
  // viendra, et donc ce qu'il doit laisser aux autres chapitres.
  const allHeadings = job.plan.map((c, i) => c.heading || headingForChapter(job, i));
  const allBriefs = job.plan.map((c) => c.brief);

  return buildChapterSystemPrompt({
    genre,
    bible: job.bible,
    allHeadings,
    allBriefs,
    chapterIndex: job.current_index,
    workType: resolveWorkType({
      explicit: settings.workType,
      category: settings.category,
      title: settings.title,
    }),
    title: settings.title,
    synopsis: settings.synopsis,
    tone: settings.tone,
    characters: settings.characters,
    bookOutline: settings.bookOutline,
    chapterBrief: chapter.brief,
    instructions: settings.instructions,
    chapterNumber: chapter.number,
    chapterTitle: chapter.title,
    chapterHeading,
    previousSummary,
    searchContext,
    wordsTarget: wordsTarget || undefined,
    storybookAssets: storybookAssets && storybookAssets.length ? storybookAssets : undefined,
    audience: settings.audience,
  });
}

/**
 * Titre canonique du chapitre en cours de traitement.
 *
 * On privilégie le `heading` calculé à la préparation du plan. S'il manque
 * (job démarré avant l'ajout du champ), on le RECALCULE sur tout le plan —
 * jamais à partir de `chapter.number`, qui est un rang de stockage décalé par
 * le chapitre-sommaire et qui produisait des titres comme
 * « Chapitre 2 : Introduction ».
 */
function headingForChapter(job: BookJobRow, index: number): string {
  const chapter = job.plan[index];
  if (chapter?.heading) return chapter.heading;

  const genre = detectGenre(job.settings.category, job.settings.tone);
  const workType = resolveWorkType({
    explicit: job.settings.workType,
    category: job.settings.category,
    title: job.settings.title,
  });
  const labels = assignChapterLabels(
    job.plan.map((c) => ({ title: c.title })),
    chapterNounFor(workType, genre)
  );
  return labels[index]?.heading || chapter?.title || `Chapitre ${index + 1}`;
}

/**
 * Résume un chapitre fraîchement généré en 2-3 phrases orientées "suite de
 * l'histoire" (personnages, événements clés, état final), pour nourrir la
 * continuité du chapitre suivant. Toujours sur un modèle rapide/économique,
 * quel que soit le modèle choisi pour l'écriture, avec un filet de sécurité
 * heuristique si l'appel échoue ou dépasse le délai — un résumé imparfait ne
 * doit jamais bloquer la suite de la génération du livre.
 */
async function summarizeChapterForContinuity(chapterTitle: string, text: string): Promise<string> {
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const heuristicFallback = plain.slice(0, 400);

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // Le résumé ne doit pas dépendre d'un seul fournisseur (clé Gemini morte =
    // perte de continuité sur tout le livre) : on passe par le repli, borné en
    // temps pour ne jamais bloquer le job.
    const { text: summary } = await Promise.race([
      generateWithFallback({
        preferred: "gemini-3.6-flash",
        system: "Tu résumes des chapitres de livre de façon factuelle et concise.",
        prompt: `Résume ce chapitre de livre ("${chapterTitle}") en 2 à 3 phrases MAXIMUM, orientées suite de l'histoire : personnages impliqués, événements clés, état final. Réponds UNIQUEMENT avec le résumé, sans préambule.\n\nTexte du chapitre :\n${plain.slice(0, 6000)}`,
        maxAttempts: 2,
      }),
      new Promise<{ text: string }>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("timeout résumé")), 12_000);
      }),
    ]);
    return summary?.trim() || heuristicFallback;
  } catch (err) {
    console.warn("[book-job] Résumé de continuité indisponible, repli heuristique:", err);
    return heuristicFallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export interface BookJobRow {
  id: string;
  project_id: string;
  user_id: string;
  status: "running" | "completed" | "failed" | "canceled";
  settings: BookJobSettings;
  plan: BookJobChapterPlan[];
  current_index: number;
  total: number;
  chapter_summaries: { number: number; title: string; summary: string }[];
  attempt_count: number;
  last_error: string | null;
  /** Fiche de référence de l'ouvrage, produite au démarrage (voir book-bible). */
  bible?: BookBible | null;
}

/**
 * Issue d'un chapitre : on enchaîne sur le suivant (`job` à jour), ou on
 * s'arrête — job terminé, en échec, annulé, remplacé, ou bail perdu (`lost` :
 * un autre worker a repris le job, celui-ci ne doit plus rien écrire).
 */
export type ChapterStep =
  | { next: "continue"; job: BookJobRow }
  | { next: "stop"; status: BookJobStatus | "lost" };

/**
 * Génère UN chapitre du job (avec retries), le sauvegarde, débite le coût et
 * fait avancer le job — le tout sous le bail `token` : rien n'est écrit ni
 * facturé par un worker qui a perdu la main.
 */
export async function processNextChapter(
  db: SupabaseClient,
  job: BookJobRow,
  token: string
): Promise<ChapterStep> {
  const stop = async (status: "completed" | "failed" | "canceled", reason: string | null): Promise<ChapterStep> => {
    const final = await stopBookJob(db, job.id, token, status, reason);
    return { next: "stop", status: final ?? "lost" };
  };

  if (job.current_index >= job.total) return stop("completed", null);

  // Annulé ou repris par un autre worker depuis le chapitre précédent : on ne
  // démarre (ni ne facture) aucun chapitre de plus. Rafraîchit aussi le signe de vie.
  const lease = await checkBookJobLease(db, job.id, token);
  if (lease.owned === false) return { next: "stop", status: "lost" };
  if (lease.owned === true && lease.status !== "running") return stop("canceled", null);

  const chapter = job.plan[job.current_index];
  const settings = job.settings;
  const wordsTarget = Math.max(400, Math.min(4000, Number(settings.targetWords) || 800));
  const selectedModelName = settings.model || "gemini-3.6-flash";

  const requiredCoins = estimateChapterCoins(wordsTarget, selectedModelName);
  const hasEnoughCoins = await checkMinimumBalance(job.user_id, requiredCoins, db);
  if (!hasEnoughCoins) return stop("failed", "insufficient_funds");

  const recentSummaries = job.chapter_summaries.slice(-MAX_RECENT_SUMMARIES);
  // Pas de recherche web en fiction (les sources n'ont rien à faire dans un roman).
  const genre = detectGenre(settings.category, settings.tone);

  // Part d'images revenant à CE chapitre (flux « Vision-to-Story »). Sans cette
  // répartition, chaque chapitre recevrait toutes les images et les
  // réutiliserait toutes : le conte tournerait en boucle sur les mêmes visuels.
  const workType = resolveWorkType({
    explicit: settings.workType,
    category: settings.category,
    title: settings.title,
  });
  const chapterImages = isImageDrivenWorkType(workType)
    ? imagesForChapter(settings.imageUrls, job.current_index, job.total)
    : [];

  // Descriptions mises en cache à l'import, pour les images de CE chapitre.
  // Quand elles existent, le chapitre s'écrit à partir du texte plutôt que des
  // images : pas de re-téléversement, et un modèle non multimodal suffit.
  let chapterAssets: Array<{ file_url: string; ai_analysis?: string | null }> = [];
  if (chapterImages.length > 0) {
    const { data: assetRows } = await db
      .from("project_assets")
      .select("file_url, ai_analysis")
      .eq("project_id", job.project_id)
      .in("file_url", chapterImages);
    // On réordonne selon `chapterImages` : c'est cet ordre qui porte la
    // chronologie du conte, pas celui que renvoie la base.
    const rows = (assetRows || []) as Array<{ file_url: string; ai_analysis: string | null }>;
    chapterAssets = chapterImages.flatMap((url) => {
      const row = rows.find((a) => a.file_url === url);
      return row ? [{ file_url: row.file_url, ai_analysis: row.ai_analysis }] : [];
    });
  }

  const hasCachedAnalyses = chapterAssets.some((a) => (a.ai_analysis || "").trim().length > 0);
  // Les images ne repartent en pièce jointe que si aucune analyse n'existe.
  const visionImages = hasCachedAnalyses ? [] : chapterImages;

  const searchContext = await fetchSearchContext(
    selectedModelName,
    shouldGroundWithWebSearch(genre, settings.useWebSearch),
    `${settings.title} - ${chapter.title} ${settings.synopsis || ""}`
  );

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CHAPTER; attempt++) {
    try {
      const chapterHeading = headingForChapter(job, job.current_index);
      const system = buildSystemPrompt(settings, chapter, chapterHeading, job, recentSummaries, searchContext, wordsTarget, chapterAssets);
      // REPLI AUTOMATIQUE : si la clé du modèle demandé est morte / en quota /
      // surchargée, on bascule sur un autre fournisseur au lieu de faire échouer
      // tout le livre. On facture ensuite le modèle qui a réellement écrit.
      const result = await generateWithFallback({
        preferred: selectedModelName,
        system,
        prompt:
          "Rédige ce chapitre maintenant en HTML en respectant scrupuleusement les consignes et le style." +
          // Avec des analyses en cache, le prompt systeme porte deja les
          // images et leurs descriptions : on ne les repete pas ici.
          (visionImages.length
            ? `${visionInstruction(workType, visionImages.length)}\n\nURL des images de ce chapitre, dans l'ordre — réutilise-les EXACTEMENT, une par page :\n${visionImages
                .map((u, i) => `${i + 1}. ${u}`)
                .join("\n")}`
            : ""),
        images: visionImages,
      });
      if (result.fellBack) {
        console.warn(`[book-job] Repli sur ${result.modelUsed} (chapitre ${chapter.number}) :`, result.errors.join(" | "));
      }

      // Nettoyage AVANT enregistrement : blocs ```html oubliés, Markdown
      // résiduel, lettrine cassée, encadré au milieu d'une phrase, titre écrit
      // deux fois. Le titre canonique est réimposé ici, donc le manuscrit
      // stocké est déjà propre pour l'éditeur ET pour tous les exports.
      // Nettoyage puis garde-fou factuel : un chiffre non sourcé mis en exergue
      // dans un encadré est bien pire qu'un chiffre noyé dans un paragraphe.
      let text = demoteUnsourcedKeyFigures(
        sanitizeGeneratedHtml(result.text || "", { expectedHeading: chapterHeading }),
        searchContext
      );

      // RELECTURE. L'audit est déterministe et gratuit : il ne détecte que des
      // défauts vérifiables (chapitre tronqué, coupé en pleine phrase, chiffres
      // non sourcés, redite d'un chapitre précédent, absence de respiration).
      // Une reprise IA n'est déclenchée QUE s'il en trouve, et une seule fois —
      // un chapitre correct, le cas courant, ne coûte pas un jeton de plus.
      // Le worker dispose de 300 s par chapitre et en consomme une fraction :
      // il y a largement la place pour cette seconde passe.
      const defects = auditChapter({
        html: text,
        wordsTarget,
        previousSummaries: recentSummaries.map((s) => s.summary),
        searchContext,
        isNarrativeBook: genre === "fiction",
      });

      if (defects.length > 0) {
        console.warn(
          `[book-job] Chapitre « ${chapterHeading} » : ${defects.map((d) => d.kind).join(", ")} → reprise`
        );
        try {
          const repaired = await generateWithFallback({
            preferred: selectedModelName,
            system,
            prompt: buildRepairPrompt(text, defects, chapterHeading),
          });
          const cleaned = demoteUnsourcedKeyFigures(
            sanitizeGeneratedHtml(repaired.text || "", { expectedHeading: chapterHeading }),
            searchContext
          );
          // On ne garde la révision que si elle laisse un chapitre au moins
          // aussi substantiel : une reprise qui ampute le texte est un recul.
          if (countWords(cleaned) >= countWords(text) * 0.9) {
            text = cleaned;
          } else {
            console.warn(`[book-job] Reprise écartée (chapitre appauvri) : ${chapterHeading}`);
          }
        } catch (repairErr) {
          // La reprise est un bonus : son échec ne doit jamais perdre le
          // chapitre déjà écrit ni interrompre le livre.
          console.warn(`[book-job] Reprise impossible pour « ${chapterHeading} » :`, repairErr);
        }
      }

      const wordCount = countWords(text);

      // Résumé de continuité AVANT d'enregistrer : entre le débit et
      // l'avancement du job, il ne reste ainsi qu'un appel en base. Un worker
      // coupé dans cet intervalle ferait réécrire — et refacturer — le chapitre.
      const summary = await summarizeChapterForContinuity(chapterHeading, text);

      // Toujours titulaire du bail ? Si ce worker a été cru mort, un autre a
      // repris le job : on n'écrit ni ne facture rien.
      const lease = await checkBookJobLease(db, job.id, token);
      if (lease.owned === false) {
        console.warn(`[book-job] Bail perdu avant l'enregistrement du chapitre ${chapter.number} (job ${job.id}) : abandon.`);
        return { next: "stop", status: "lost" };
      }

      const { data: savedRows, error: chapterError } = await db
        .from("chapters")
        .update({
          content: text,
          // Le titre en base devient le titre canonique : la liste des
          // chapitres, la table des matières et le <h1> du manuscrit affichent
          // désormais rigoureusement la même chose.
          title: chapterHeading,
          status: "Terminé",
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chapter.chapterId)
        .select("id");
      if (chapterError) throw chapterError;
      if (!savedRows || savedRows.length === 0) {
        // Chapitre supprimé : le livre a été recréé depuis (nouvelle
        // génération). Ce job est caduc, et surtout rien n'est facturé pour un
        // texte que l'auteur ne verra jamais.
        console.warn(`[book-job] Chapitre ${chapter.chapterId} introuvable (job ${job.id}) : job remplacé, rien n'est facturé.`);
        return stop("canceled", "superseded");
      }

      const deducted = await deductChapterCost(
        job.user_id,
        result.modelUsed,
        result.usage,
        `Génération Chapitre ${chapter.number}: ${chapter.title}`,
        { projectId: job.project_id, outputText: text, client: db }
      );
      if (!deducted) {
        console.error(`[book-job] Échec du débit pour le job ${job.id}, chapitre ${chapter.number}`);
      }

      const nextSummaries = [...job.chapter_summaries, { number: chapter.number, title: chapterHeading, summary }];
      const status = await advanceBookJob(db, job.id, token, job.current_index, nextSummaries);
      if (status === null) return { next: "stop", status: "lost" };
      if (status !== "running") return { next: "stop", status };

      return {
        next: "continue",
        job: {
          ...job,
          current_index: job.current_index + 1,
          chapter_summaries: nextSummaries,
          attempt_count: 0,
          last_error: null,
        },
      };
    } catch (err) {
      lastError = err;
      console.warn(`[book-job] Tentative ${attempt}/${MAX_ATTEMPTS_PER_CHAPTER} échouée (chapitre ${chapter.number}, job ${job.id}):`, err);
      if (attempt < MAX_ATTEMPTS_PER_CHAPTER) {
        await new Promise((r) => setTimeout(r, attempt * 4000));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  return stop("failed", message.slice(0, 500));
}
