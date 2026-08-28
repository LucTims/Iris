import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkMinimumBalance, deductChapterCost } from "@/lib/ai/cost-engine";
import { estimateChapterCoins } from "@/lib/ai/pricing";
import { getAiModel, fetchSearchContext, SEARCH_GROUNDING_INSTRUCTION } from "@/lib/ai/search-context";

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
  number: number;
  title: string;
  brief: string;
}

export interface BookJobSettings {
  title: string;
  synopsis?: string;
  tone?: string;
  characters?: string;
  instructions?: string;
  bookOutline?: string;
  model: string;
  targetWords?: number;
  useWebSearch?: boolean;
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
  recentSummaries: { number: number; title: string; summary: string }[],
  searchContext: string,
  wordsTarget: number
): string {
  const continuityBlock = recentSummaries.length
    ? `Résumé des chapitres précédents pour garder la cohérence (personnages, événements, état de l'intrigue) :\n${recentSummaries
        .map((s) => `Chapitre ${s.number} (${s.title}) : ${s.summary}`)
        .join("\n")}\n`
    : "";

  const bibleBlock = settings.characters
    ? `Bible des personnages / univers du livre (respecte-la scrupuleusement, ne change pas les noms, traits ou faits établis) :\n${settings.characters}\n`
    : "";

  return `Tu es un auteur professionnel de best-sellers. Ta mission est de rédiger un chapitre COMPLET pour un livre.
Le texte que tu génères sera directement inséré dans le manuscrit de l'auteur.

Livre concerné :
Titre : ${settings.title}
Synopsis global : ${settings.synopsis || "Non défini"}
Ton / Style demandé : ${settings.tone || "Professionnel et engageant"}

${bibleBlock}${settings.bookOutline ? `Sommaire / Table des matières du livre (rédige ce chapitre en cohérence avec ce plan, sans déborder sur les points prévus dans les autres chapitres) :\n${settings.bookOutline}\n` : ""}
${continuityBlock}${chapter.brief ? `Ce chapitre doit couvrir précisément : ${chapter.brief}\n` : ""}
${settings.instructions ? `CONSIGNES SPÉCIFIQUES DE L'AUTEUR (à respecter en priorité) :\n${settings.instructions}\n` : ""}

Tu dois rédiger le texte du :
Chapitre ${chapter.number} : ${chapter.title}
${searchContext}
${settings.useWebSearch ? SEARCH_GROUNDING_INSTRUCTION : ""}

Instructions impératives :
1. Rédige le chapitre complet, détaillé et immersif. ${wordsTarget ? `Vise environ ${wordsTarget} mots (±20 %).` : "Vise au moins 800 à 1500 mots."}
2. N'ajoute AUCUN préambule (pas de "Voici le chapitre :" ni de "Bien sûr, je vais rédiger...").
3. IMPORTANT: Chaque chapitre doit absolument commencer sur une nouvelle page. Pour ce faire, COMMENCE toujours ton texte par la balise <hr data-page-break>.
4. Juste après cette balise, ajoute le titre du chapitre en balise <h1>. Par exemple : <hr data-page-break><h1>Chapitre ${chapter.number} : ${chapter.title}</h1>.
5. Ensuite, rédige le contenu du chapitre en HTML valide, avec des balises <p>, <h2>, <h3>, <strong>, <em>, <blockquote>, <table>, <thead>, <tbody>, <tr>, <th>, <td>.
6. Quand le contenu contient des données comparatives, des listes de critères chiffrés ou des informations tabulaires, présente-les dans un tableau HTML bien structuré.
7. Pour mettre en valeur un point clé, utilise des encadrés : <div class="callout callout-info">…</div>, <div class="callout callout-warning">…</div>, <div class="callout callout-tip">…</div>, <div class="callout callout-example">…</div>. N'en abuse pas : 1 à 3 encadrés par chapitre.
8. Pour un chiffre ou statistique marquant, utilise : <div class="key-figure">85% des entreprises…</div>. Maximum 1-2 par chapitre.
9. Pour une citation marquante, utilise : <div class="pull-quote">La citation ici</div>. Maximum 1-2 par chapitre.
10. Pour marquer une transition entre sections : <div class="section-divider section-divider-stars"></div> (ou ornament, line, dots), avec parcimonie.
11. Pour un début de chapitre ou de section important, une lettrine : <p class="drop-cap">Le texte du paragraphe…</p>. Maximum 1 par chapitre.`;
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const { text: summary } = await generateText({
      model: getAiModel("gemini-2.5-flash"),
      abortSignal: controller.signal,
      prompt: `Résume ce chapitre de livre ("${chapterTitle}") en 2 à 3 phrases MAXIMUM, orientées suite de l'histoire : personnages impliqués, événements clés, état final. Réponds UNIQUEMENT avec le résumé, sans préambule.\n\nTexte du chapitre :\n${plain.slice(0, 6000)}`,
    });
    return summary?.trim() || heuristicFallback;
  } catch (err) {
    console.warn("[book-job] Résumé de continuité indisponible, repli heuristique:", err);
    return heuristicFallback;
  } finally {
    clearTimeout(timeout);
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
  const searchContext = await fetchSearchContext(
    selectedModelName,
    !!settings.useWebSearch,
    `${settings.title} - ${chapter.title} ${settings.synopsis || ""}`
  );

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CHAPTER; attempt++) {
    try {
      const system = buildSystemPrompt(settings, chapter, recentSummaries, searchContext, wordsTarget);
      const result = await generateText({
        model: getAiModel(selectedModelName),
        system,
        prompt: "Rédige ce chapitre maintenant en HTML en respectant scrupuleusement les consignes et le style.",
      });

      const text = result.text || "";
      const wordCount = text.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;

      const { error: chapterError } = await db
        .from("chapters")
        .update({ content: text, status: "Terminé", word_count: wordCount, updated_at: new Date().toISOString() })
        .eq("id", chapter.chapterId);
      if (chapterError) throw chapterError;

      const deducted = await deductChapterCost(
        job.user_id,
        selectedModelName,
        result.usage,
        `Génération Chapitre ${chapter.number}: ${chapter.title}`,
        { projectId: job.project_id, outputText: text, client: db }
      );
      if (!deducted) {
        console.error(`[book-job] Échec du débit pour le job ${job.id}, chapitre ${chapter.number}`);
      }

      const summary = await summarizeChapterForContinuity(chapter.title, text);
      const nextSummaries = [...job.chapter_summaries, { number: chapter.number, title: chapter.title, summary }];
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
