import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkMinimumBalance, deductChapterCost } from "@/lib/ai/cost-engine";
import { estimateChapterCoins } from "@/lib/ai/pricing";
import { getAiModel, fetchSearchContext } from "@/lib/ai/search-context";
import {
  detectGenre,
  shouldGroundWithWebSearch,
  buildChapterSystemPrompt,
} from "@/lib/ai/book-style";

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
  category?: string;
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
  const previousSummary = recentSummaries.length
    ? recentSummaries.map((s) => `Chapitre ${s.number} (${s.title}) : ${s.summary}`).join("\n")
    : "";

  return buildChapterSystemPrompt({
    genre: detectGenre(settings.category, settings.tone),
    title: settings.title,
    synopsis: settings.synopsis,
    tone: settings.tone,
    characters: settings.characters,
    bookOutline: settings.bookOutline,
    chapterBrief: chapter.brief,
    instructions: settings.instructions,
    chapterNumber: chapter.number,
    chapterTitle: chapter.title,
    previousSummary,
    searchContext,
    wordsTarget: wordsTarget || undefined,
  });
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
