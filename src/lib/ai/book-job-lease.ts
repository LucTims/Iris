import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookJobRow } from "@/lib/ai/book-job";

/**
 * BAIL D'UN JOB DE RÉDACTION — un seul worker écrit un livre à la fois.
 *
 * Le worker qui tient le bail (`lock_token`) signale sa présence en base
 * (`heartbeat_at`). Un job dont le worker s'est tu est repris par la route de
 * statut (éditeur ouvert) ou par la tâche planifiée pg_cron. Toutes les
 * transitions passent par des RPC atomiques (migration
 * 20260925130000_book_job_lease_watchdog) : jamais deux workers sur le même
 * chapitre, donc jamais un chapitre écrit ou facturé deux fois.
 */

/** Rythme auquel un worker vivant signale sa présence. */
export const HEARTBEAT_INTERVAL_MS = 20_000;
/** Sans signe de vie depuis ce délai, le worker est considéré mort (même seuil qu'en SQL). */
export const DEAD_WORKER_AFTER_MS = 120_000;
/** Job libéré entre deux invocations : délai laissé au relais avant que l'éditeur ne le reprenne. */
export const RELEASED_GRACE_MS = 20_000;

/**
 * Qui prend le job : le worker précédent (`hop`), la route de statut
 * (`watchdog`) ou la tâche planifiée (`sweep`, qui pose un bail en attente,
 * adopté ensuite par la route du worker).
 */
export type ClaimMode = "hop" | "watchdog" | "sweep";

export type BookJobStatus = BookJobRow["status"];

export interface LeasedBookJob extends BookJobRow {
  lock_token: string;
}

/**
 * Contrôle du bail : détenu (avec le statut courant du job, qui peut être
 * « canceled » — le chapitre en cours s'achève quand même), perdu, ou inconnu
 * (erreur réseau passagère : on ne conclut rien).
 */
export type LeaseCheck =
  | { owned: true; status: BookJobStatus }
  | { owned: false }
  | { owned: "unknown" };

type Db = Pick<SupabaseClient, "rpc">;

const RETRY_DELAYS_MS = [1_000, 3_000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Appel RPC réessayé sur erreur réseau/base. Indispensable pour les
 * transitions qui suivent un débit : perdre l'avancement après avoir facturé
 * un chapitre ferait réécrire (et refacturer) ce chapitre à la reprise.
 */
async function rpcWithRetry(db: Db, fn: string, args: Record<string, unknown>) {
  let last: { data: unknown; error: { message: string } | null } = { data: null, error: null };
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const res = await db.rpc(fn, args);
    last = { data: res.data, error: res.error };
    if (!res.error) return last;
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  return last;
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return (data as T | null) ?? null;
}

function asLeased(data: unknown): LeasedBookJob | null {
  const row = firstRow<LeasedBookJob>(data);
  return row && typeof row.lock_token === "string" ? row : null;
}

/** Prend le job s'il est libre (ou abandonné). `null` : déjà tenu, terminé, ou clos pour blocage. */
export async function claimBookJob(db: Db, jobId: string, mode: ClaimMode): Promise<LeasedBookJob | null> {
  const { data, error } = await db.rpc("claim_book_job", { p_job_id: jobId, p_mode: mode });
  if (error) {
    console.error(`[book-job] Prise du job ${jobId} impossible (${mode}) :`, error.message);
    return null;
  }
  return asLeased(data);
}

/** Reprend le bail posé par la tâche planifiée. Le jeton est à usage unique. */
export async function adoptBookJob(db: Db, jobId: string, token: string): Promise<LeasedBookJob | null> {
  const { data, error } = await db.rpc("adopt_book_job", { p_job_id: jobId, p_token: token });
  if (error) {
    console.error(`[book-job] Adoption du job ${jobId} impossible :`, error.message);
    return null;
  }
  return asLeased(data);
}

/** Signe de vie + contrôle du bail. */
export async function checkBookJobLease(db: Db, jobId: string, token: string): Promise<LeaseCheck> {
  const { data, error } = await db.rpc("heartbeat_book_job", { p_job_id: jobId, p_token: token });
  if (error) {
    console.warn(`[book-job] Signe de vie non transmis (job ${jobId}) :`, error.message);
    return { owned: "unknown" };
  }
  return typeof data === "string" ? { owned: true, status: data as BookJobStatus } : { owned: false };
}

/**
 * Chapitre `index` écrit : le job avance d'un cran. Renvoie le nouveau statut
 * (« running » s'il reste des chapitres), ou `null` si le bail a été perdu.
 */
export async function advanceBookJob(
  db: Db,
  jobId: string,
  token: string,
  index: number,
  summaries: BookJobRow["chapter_summaries"]
): Promise<BookJobStatus | null> {
  const { data, error } = await rpcWithRetry(db, "advance_book_job", {
    p_job_id: jobId,
    p_token: token,
    p_index: index,
    p_summaries: summaries,
  });
  if (error) {
    console.error(`[book-job] Avancement du job ${jobId} non enregistré :`, error.message);
    return null;
  }
  return typeof data === "string" ? (data as BookJobStatus) : null;
}

/** Clôt le job (terminé, échec, remplacé) et libère le bail. Renvoie le statut final. */
export async function stopBookJob(
  db: Db,
  jobId: string,
  token: string,
  status: "completed" | "failed" | "canceled",
  reason: string | null
): Promise<BookJobStatus | null> {
  const { data, error } = await rpcWithRetry(db, "stop_book_job", {
    p_job_id: jobId,
    p_token: token,
    p_status: status,
    p_error: reason,
  });
  if (error) {
    console.error(`[book-job] Clôture du job ${jobId} non enregistrée :`, error.message);
    return null;
  }
  return typeof data === "string" ? (data as BookJobStatus) : null;
}

/** Rend le job en fin de fenêtre : le relais (ou le filet de sécurité) le reprendra. */
export async function releaseBookJob(db: Db, jobId: string, token: string): Promise<boolean> {
  const { data, error } = await rpcWithRetry(db, "release_book_job", { p_job_id: jobId, p_token: token });
  if (error) {
    console.error(`[book-job] Libération du job ${jobId} impossible :`, error.message);
    return false;
  }
  return data === true;
}

/**
 * Un job « running » semble-t-il abandonné ? Simple présélection, pour ne pas
 * écrire en base à chaque interrogation de l'éditeur : c'est la RPC de prise
 * qui tranche, avec l'horloge de la base. Dernier signe de vie : le plus
 * récent de `heartbeat_at` et `updated_at` (un job lancé par l'ancien code
 * n'écrit que `updated_at`).
 */
export function isBookJobStale(
  job: { lock_token: string | null; heartbeat_at: string | null; updated_at?: string | null },
  now: number = Date.now()
): boolean {
  const seen = [job.heartbeat_at, job.updated_at]
    .map((t) => Date.parse(t || ""))
    .filter((t) => Number.isFinite(t));
  if (seen.length === 0) return true;
  const idle = now - Math.max(...seen);
  return job.lock_token ? idle > DEAD_WORKER_AFTER_MS : idle > RELEASED_GRACE_MS;
}
