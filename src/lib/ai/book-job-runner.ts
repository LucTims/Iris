import type { SupabaseClient } from "@supabase/supabase-js";
import { processNextChapter, type BookJobRow, type ChapterStep } from "@/lib/ai/book-job";
import {
  HEARTBEAT_INTERVAL_MS,
  checkBookJobLease,
  releaseBookJob,
  type LeasedBookJob,
} from "@/lib/ai/book-job-lease";

/**
 * PILOTE D'UN JOB DE RÉDACTION.
 *
 * Constat en production : le job s'enchaînait par un auto-appel HTTP par
 * chapitre, et le 5e appel de la chaîne n'arrivait jamais — tous les livres
 * s'arrêtaient au chapitre 4, sans erreur ni reprise. Désormais :
 *   - une invocation écrit PLUSIEURS chapitres (tant qu'elle est dans sa
 *     fenêtre), ce qui divise le nombre de relais par 3 à 4 ;
 *   - le worker signale sa présence pendant qu'il écrit ;
 *   - en fin de fenêtre il rend le job et passe le relais ; si le relais se
 *     perd, la route de statut (éditeur ouvert) ou la tâche planifiée pg_cron
 *     reprend le job (voir book-job-lease).
 */

/**
 * Fenêtre pendant laquelle une invocation démarre de nouveaux chapitres.
 * Un chapitre prend 30 à 90 s (davantage avec une relecture corrective) : en
 * ne démarrant plus rien après 140 s, le dernier chapitre se termine bien
 * avant la limite de 300 s de la fonction.
 */
export const CHAPTER_START_WINDOW_MS = 140_000;

export type DriveOutcome =
  /** Job terminé, en échec, annulé ou remplacé : plus rien à faire. */
  | "finished"
  /** Fenêtre écoulée, relais transmis à une nouvelle invocation. */
  | "relayed"
  /** Fenêtre écoulée, relais refusé : la reprise automatique prendra le job. */
  | "relay_failed"
  /** Un autre worker a repris le job. */
  | "lost"
  /** Erreur inattendue : job rendu, la reprise automatique le relancera. */
  | "error";

export interface DriveOptions {
  /** Origine de la requête courante (relais vers /api/generate-book/process). */
  origin: string;
  /** Début de l'invocation : la fenêtre se mesure depuis la requête, pas depuis le premier chapitre. */
  startedAt: number;
  /** Injection pour les tests. */
  processChapter?: (db: SupabaseClient, job: BookJobRow, token: string) => Promise<ChapterStep>;
  relay?: (origin: string, jobId: string) => Promise<boolean>;
  now?: () => number;
  heartbeatMs?: number;
}

export async function driveBookJob(
  db: SupabaseClient,
  job: LeasedBookJob,
  opts: DriveOptions
): Promise<DriveOutcome> {
  const token = job.lock_token;
  const processChapter = opts.processChapter ?? processNextChapter;
  const relay = opts.relay ?? relayBookJob;
  const now = opts.now ?? Date.now;

  let lost = false;
  const heartbeat = setInterval(() => {
    void checkBookJobLease(db, job.id, token).then((lease) => {
      if (lease.owned === false) lost = true;
    });
  }, opts.heartbeatMs ?? HEARTBEAT_INTERVAL_MS);

  let current: BookJobRow = job;
  try {
    for (;;) {
      const step = await processChapter(db, current, token);
      if (step.next === "stop") return step.status === "lost" ? "lost" : "finished";
      current = step.job;
      if (lost) return "lost";
      if (now() - opts.startedAt >= CHAPTER_START_WINDOW_MS) break;
    }
  } catch (err) {
    console.error(`[book-job] Worker interrompu (job ${job.id}, chapitre ${current.current_index + 1}) :`, err);
    // Le job est rendu : la reprise automatique le relancera (au plus trois
    // fois au même chapitre, voir claim_book_job).
    await releaseBookJob(db, job.id, token);
    return "error";
  } finally {
    clearInterval(heartbeat);
  }

  if (!(await releaseBookJob(db, current.id, token))) return "lost";
  return (await relay(opts.origin, current.id)) ? "relayed" : "relay_failed";
}

/**
 * Passe le relais à une nouvelle invocation (budget d'exécution neuf). La
 * route répond aussitôt : l'écriture se fait en arrière-plan. Un refus est
 * journalisé avec son code HTTP ; le job reste « running » et libre, la
 * reprise automatique s'en charge.
 */
export async function relayBookJob(origin: string, jobId: string): Promise<boolean> {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) {
    console.error(`[book-job] INTERNAL_JOB_SECRET manquant : pas de relais pour le job ${jobId}, la reprise automatique prendra le relais.`);
    return false;
  }
  try {
    const res = await fetch(`${origin}/api/generate-book/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-job-secret": secret },
      body: JSON.stringify({ jobId }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.error(`[book-job] Relais refusé pour le job ${jobId} : HTTP ${res.status} ${detail}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[book-job] Relais impossible pour le job ${jobId} :`, err);
    return false;
  }
}
