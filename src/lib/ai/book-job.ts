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
import { resolveWorkType, chapterNounFor } from "@/lib/book/work-type";
import { assignChapterLabels } from "@/lib/book/chapter-heading";

/**
 * Génération de livre complet — pipeline serveur résilient.
 *
 * Remplace la boucle côté client (redaction/page.tsx) qui générait chapitre
 * après chapitre via `fetch` depuis le NAVIGATEUR : fermer l'onglet ou perdre
 * le réseau interrompait la génération sans façon de la reprendre proprement,
 * et la "continuité" entre chapitres ne reposait que sur une liste de TITRES.
 *
 * Ici, un job persisté en base (book_generation_jobs) avance chapitre par
 * chapitre entièrement côté serveur : chaque chapitre déclenche, une fois
 * terminé, un appel serveur-à-serveur vers lui-même pour le suivant (voir
 * /api/generate-book/process). Le client n'a plus qu'à interroger le statut
 * du job (polling) — fermer l'onglet n'arrête plus rien.
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
  /** Forme de l'ouvrage choisie par l'auteur : "livre" | "guide" | "ebook". */
  workType?: string;
}

export function getServiceRoleClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MAX_RECENT_SUMMARIES = 4;
const MAX_ATTEMPTS_PER_CHAPTER = 3;

function buildSystemPrompt(
  settings: BookJobSettings,
  chapter: BookJobChapterPlan,
  chapterHeading: string,
  recentSummaries: { number: number; title: string; summary: string }[],
  searchContext: string,
  wordsTarget: number
): string {
  // Les résumés de continuité sont référencés par leur TITRE, jamais par un
  // numéro de stockage : c'est ce numéro décalé qui faisait dire au modèle
  // « le chapitre 2 » en parlant de l'introduction.
  const previousSummary = recentSummaries.length
    ? recentSummaries.map((s) => `« ${s.title} » : ${s.summary}`).join("\n")
    : "";

  const genre = detectGenre(settings.category, settings.tone);
  return buildChapterSystemPrompt({
    genre,
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
        preferred: "gemini-2.5-flash",
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
}

/**
 * Génère UN chapitre du job (avec retries), le sauvegarde, débite le coût et
 * met à jour la progression. Retourne `{ done: true }` quand tout le livre
 * est terminé, `{ done: false }` s'il reste des chapitres à traiter (à
 * enchaîner par l'appelant), ou lève si le job doit s'arrêter (fonds
 * insuffisants, échecs répétés).
 */
export async function processNextChapter(
  db: SupabaseClient,
  job: BookJobRow
): Promise<{ done: boolean }> {
  if (job.status !== "running") return { done: true };
  if (job.current_index >= job.total) {
    await db.from("book_generation_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", job.id);
    return { done: true };
  }

  const chapter = job.plan[job.current_index];
  const settings = job.settings;
  const wordsTarget = Math.max(400, Math.min(4000, Number(settings.targetWords) || 800));
  const selectedModelName = settings.model || "gemini-2.5-flash";

  const requiredCoins = estimateChapterCoins(wordsTarget, selectedModelName);
  const hasEnoughCoins = await checkMinimumBalance(job.user_id, requiredCoins, db);
  if (!hasEnoughCoins) {
    await db
      .from("book_generation_jobs")
      .update({ status: "failed", last_error: "insufficient_funds", updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return { done: true };
  }

  const recentSummaries = job.chapter_summaries.slice(-MAX_RECENT_SUMMARIES);
  // Pas de recherche web en fiction (les sources n'ont rien à faire dans un roman).
  const genre = detectGenre(settings.category, settings.tone);
  const searchContext = await fetchSearchContext(
    selectedModelName,
    shouldGroundWithWebSearch(genre, settings.useWebSearch),
    `${settings.title} - ${chapter.title} ${settings.synopsis || ""}`
  );

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CHAPTER; attempt++) {
    try {
      const chapterHeading = headingForChapter(job, job.current_index);
      const system = buildSystemPrompt(settings, chapter, chapterHeading, recentSummaries, searchContext, wordsTarget);
      // REPLI AUTOMATIQUE : si la clé du modèle demandé est morte / en quota /
      // surchargée, on bascule sur un autre fournisseur au lieu de faire échouer
      // tout le livre. On facture ensuite le modèle qui a réellement écrit.
      const result = await generateWithFallback({
        preferred: selectedModelName,
        system,
        prompt: "Rédige ce chapitre maintenant en HTML en respectant scrupuleusement les consignes et le style.",
      });
      if (result.fellBack) {
        console.warn(`[book-job] Repli sur ${result.modelUsed} (chapitre ${chapter.number}) :`, result.errors.join(" | "));
      }

      // Nettoyage AVANT enregistrement : blocs ```html oubliés, Markdown
      // résiduel, lettrine cassée, encadré au milieu d'une phrase, titre écrit
      // deux fois. Le titre canonique est réimposé ici, donc le manuscrit
      // stocké est déjà propre pour l'éditeur ET pour tous les exports.
      const text = sanitizeGeneratedHtml(result.text || "", { expectedHeading: chapterHeading });
      const wordCount = text.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;

      const { error: chapterError } = await db
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
        .eq("id", chapter.chapterId);
      if (chapterError) throw chapterError;

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

      const summary = await summarizeChapterForContinuity(chapterHeading, text);
      const nextSummaries = [...job.chapter_summaries, { number: chapter.number, title: chapterHeading, summary }];
      const nextIndex = job.current_index + 1;

      await db
        .from("book_generation_jobs")
        .update({
          current_index: nextIndex,
          chapter_summaries: nextSummaries,
          attempt_count: 0,
          last_error: null,
          status: nextIndex >= job.total ? "completed" : "running",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return { done: nextIndex >= job.total };
    } catch (err) {
      lastError = err;
      console.warn(`[book-job] Tentative ${attempt}/${MAX_ATTEMPTS_PER_CHAPTER} échouée (chapitre ${chapter.number}, job ${job.id}):`, err);
      if (attempt < MAX_ATTEMPTS_PER_CHAPTER) {
        await new Promise((r) => setTimeout(r, attempt * 4000));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  await db
    .from("book_generation_jobs")
    .update({
      status: "failed",
      last_error: message.slice(0, 500),
      attempt_count: job.attempt_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return { done: true };
}
