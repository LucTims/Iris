import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookJobRow, ChapterStep } from "@/lib/ai/book-job";

// Le pilote importe la rédaction réelle (SDK IA) : inutile ici, chaque test
// injecte son propre `processChapter`.
vi.mock("@/lib/ai/book-job", () => ({ processNextChapter: vi.fn() }));

import { CHAPTER_START_WINDOW_MS, driveBookJob } from "@/lib/ai/book-job-runner";
import {
  advanceBookJob,
  checkBookJobLease,
  claimBookJob,
  isBookJobStale,
  DEAD_WORKER_AFTER_MS,
  RELEASED_GRACE_MS,
  type LeasedBookJob,
} from "@/lib/ai/book-job-lease";
import { bookJobFailureMessage } from "@/lib/book/generation-job";

const JOB_ID = "52c6eaac-26c3-46b8-bcdb-dc1fa4683dc6";
const TOKEN = "3f1c2b8e-7d4a-4c1e-9b2a-5e6f7a8b9c0d";

function leasedJob(total = 7): LeasedBookJob {
  return {
    id: JOB_ID,
    project_id: "66fd992b-f0c9-4559-9710-e4d8532ce89c",
    user_id: "fa9b95b4-5d42-4e3a-b60d-c6e7d9e4f695",
    status: "running",
    settings: { title: "Élever des lapins", model: "gemini-3.6-flash" },
    plan: [],
    current_index: 0,
    total,
    chapter_summaries: [],
    attempt_count: 0,
    last_error: null,
    lock_token: TOKEN,
  };
}

/** Base simulée : seules les RPC du bail utilisées par le pilote. */
function fakeDb(opts: { heartbeat?: string | null; released?: boolean } = {}) {
  const calls: string[] = [];
  const rpc = vi.fn(async (fn: string) => {
    calls.push(fn);
    if (fn === "heartbeat_book_job") return { data: opts.heartbeat === undefined ? "running" : opts.heartbeat, error: null };
    if (fn === "release_book_job") return { data: opts.released === false ? null : true, error: null };
    return { data: null, error: { message: `rpc inattendue ${fn}` } };
  });
  return { db: { rpc } as unknown as SupabaseClient, calls };
}

/** Chapitre simulé : avance le job et fait passer `elapsed` ms sur l'horloge. */
function chapterWriter(clock: { t: number }, elapsed: number) {
  return vi.fn(async (_db: SupabaseClient, job: BookJobRow): Promise<ChapterStep> => {
    clock.t += elapsed;
    const next = job.current_index + 1;
    if (next >= job.total) return { next: "stop", status: "completed" };
    return { next: "continue", job: { ...job, current_index: next } };
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("driveBookJob — plusieurs chapitres par invocation, puis relais", () => {
  it("écrit tant que la fenêtre est ouverte, rend le job et passe le relais", async () => {
    const clock = { t: 0 };
    const { db, calls } = fakeDb();
    const processChapter = chapterWriter(clock, 50_000);
    const relay = vi.fn(async () => true);

    const outcome = await driveBookJob(db, leasedJob(), {
      origin: "https://www.irisboom.online",
      startedAt: 0,
      now: () => clock.t,
      processChapter,
      relay,
    });

    // 3 chapitres commencés à 0 s, 50 s et 100 s ; plus rien après 140 s.
    expect(CHAPTER_START_WINDOW_MS).toBe(140_000);
    expect(processChapter).toHaveBeenCalledTimes(3);
    expect(outcome).toBe("relayed");
    expect(calls).toContain("release_book_job");
    expect(relay).toHaveBeenCalledWith("https://www.irisboom.online", JOB_ID);
  });

  it("livre terminé dans la fenêtre : ni libération ni relais", async () => {
    const clock = { t: 0 };
    const { db, calls } = fakeDb();
    const relay = vi.fn(async () => true);

    const outcome = await driveBookJob(db, leasedJob(2), {
      origin: "https://www.irisboom.online",
      startedAt: 0,
      now: () => clock.t,
      processChapter: chapterWriter(clock, 30_000),
      relay,
    });

    expect(outcome).toBe("finished");
    expect(relay).not.toHaveBeenCalled();
    expect(calls).not.toContain("release_book_job");
  });

  it("relais refusé (ex. 5e appel de la chaîne) : le job est rendu, la reprise automatique s'en charge", async () => {
    const clock = { t: 0 };
    const { db, calls } = fakeDb();

    const outcome = await driveBookJob(db, leasedJob(), {
      origin: "https://www.irisboom.online",
      startedAt: 0,
      now: () => clock.t,
      processChapter: chapterWriter(clock, 70_000),
      relay: async () => false,
    });

    expect(outcome).toBe("relay_failed");
    expect(calls).toContain("release_book_job");
  });

  it("bail perdu (un autre worker a repris le job) : arrêt sans libérer ni relayer", async () => {
    const { db, calls } = fakeDb({ heartbeat: null });
    const relay = vi.fn(async () => true);
    const processChapter = vi.fn(async (_db: SupabaseClient, job: BookJobRow): Promise<ChapterStep> => {
      await new Promise((r) => setTimeout(r, 30));
      return { next: "continue", job: { ...job, current_index: job.current_index + 1 } };
    });

    const outcome = await driveBookJob(db, leasedJob(), {
      origin: "https://www.irisboom.online",
      startedAt: Date.now(),
      processChapter,
      relay,
      heartbeatMs: 5,
    });

    expect(outcome).toBe("lost");
    expect(processChapter).toHaveBeenCalledTimes(1);
    expect(calls).toContain("heartbeat_book_job");
    expect(calls).not.toContain("release_book_job");
    expect(relay).not.toHaveBeenCalled();
  });

  it("erreur inattendue : le job est rendu pour être repris automatiquement", async () => {
    const { db, calls } = fakeDb();
    const outcome = await driveBookJob(db, leasedJob(), {
      origin: "https://www.irisboom.online",
      startedAt: 0,
      now: () => 0,
      processChapter: async () => {
        throw new Error("panne inattendue");
      },
      relay: async () => true,
    });

    expect(outcome).toBe("error");
    expect(calls).toContain("release_book_job");
  });
});

describe("bail — enveloppes des RPC", () => {
  it("claim : la ligne n'est rendue que si un bail a été posé", async () => {
    const row = { ...leasedJob(), lock_token: TOKEN };
    const withRow = { rpc: vi.fn(async () => ({ data: [row], error: null })) } as unknown as SupabaseClient;
    const empty = { rpc: vi.fn(async () => ({ data: [], error: null })) } as unknown as SupabaseClient;
    const failing = { rpc: vi.fn(async () => ({ data: null, error: { message: "boom" } })) } as unknown as SupabaseClient;

    expect(await claimBookJob(withRow, JOB_ID, "watchdog")).toMatchObject({ id: JOB_ID, lock_token: TOKEN });
    expect(await claimBookJob(empty, JOB_ID, "hop")).toBeNull();
    expect(await claimBookJob(failing, JOB_ID, "sweep")).toBeNull();
  });

  it("signe de vie : détenu, perdu, ou inconnu sur erreur réseau (on ne conclut rien)", async () => {
    const reply = (data: unknown, error: unknown = null) =>
      ({ rpc: vi.fn(async () => ({ data, error })) }) as unknown as SupabaseClient;

    expect(await checkBookJobLease(reply("canceled"), JOB_ID, TOKEN)).toEqual({ owned: true, status: "canceled" });
    expect(await checkBookJobLease(reply(null), JOB_ID, TOKEN)).toEqual({ owned: false });
    expect(await checkBookJobLease(reply(null, { message: "timeout" }), JOB_ID, TOKEN)).toEqual({ owned: "unknown" });
  });

  it("avancement : réessayé sur erreur passagère (perdre l'avancement ferait refacturer le chapitre)", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const db = {
      rpc: vi.fn(async () => {
        attempts++;
        return attempts < 3 ? { data: null, error: { message: "connexion perdue" } } : { data: "running", error: null };
      }),
    } as unknown as SupabaseClient;

    const pending = advanceBookJob(db, JOB_ID, TOKEN, 3, []);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(await pending).toBe("running");
    expect(attempts).toBe(3);
  });

  it("présélection d'un job abandonné : 20 s après une libération, 2 min après le dernier signe de vie", () => {
    const now = Date.parse("2026-09-25T12:00:00Z");
    const at = (ms: number) => new Date(now - ms).toISOString();

    expect(isBookJobStale({ lock_token: null, heartbeat_at: at(RELEASED_GRACE_MS - 1_000) }, now)).toBe(false);
    expect(isBookJobStale({ lock_token: null, heartbeat_at: at(RELEASED_GRACE_MS + 1_000) }, now)).toBe(true);
    expect(isBookJobStale({ lock_token: TOKEN, heartbeat_at: at(90_000) }, now)).toBe(false);
    expect(isBookJobStale({ lock_token: TOKEN, heartbeat_at: at(DEAD_WORKER_AFTER_MS + 1_000) }, now)).toBe(true);
    expect(isBookJobStale({ lock_token: TOKEN, heartbeat_at: null }, now)).toBe(true);
    // Job lancé par l'ancien code : seul updated_at avance.
    expect(isBookJobStale({ lock_token: null, heartbeat_at: at(300_000), updated_at: at(5_000) }, now)).toBe(false);
  });
});

describe("messages de l'éditeur", () => {
  it("chaque cause d'arrêt renvoie vers « Continuer la rédaction »", () => {
    expect(bookJobFailureMessage({ last_error: "stalled" })).toMatch(/interrompue.*Continuer la rédaction/);
    expect(bookJobFailureMessage({ last_error: "insufficient_funds" })).toMatch(/Pièces insuffisantes.*Continuer la rédaction/);
    expect(bookJobFailureMessage({ last_error: "Tous les fournisseurs IA ont échoué." })).toMatch(/erreur.*Continuer la rédaction/);
  });
});
