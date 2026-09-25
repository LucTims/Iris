import { describe, it, expect, vi } from "vitest";
import { createFakeSupabase, IRIS_TABLES } from "./helpers/fakeSupabase";

/**
 * processNextChapter sous bail : un chapitre n'est écrit et facturé que par
 * le worker qui tient le job, jamais pour un chapitre supprimé, et une
 * annulation pendant l'écriture reste une annulation.
 */

const hooks = vi.hoisted(() => ({
  generateCalls: 0,
  onGenerate: null as null | (() => void),
}));

vi.mock("@/lib/ai/model-fallback", () => ({
  generateWithFallback: async (opts: { system?: string; prompt: string }) => {
    if (opts.system?.includes("résumes des chapitres")) {
      return { text: "Le chapitre installe le clapier.", modelUsed: "gemini-3.6-flash", usage: {}, fellBack: false, errors: [] };
    }
    hooks.generateCalls++;
    hooks.onGenerate?.();
    const paragraphs = Array.from(
      { length: 6 },
      (_, p) => `<p>${Array.from({ length: 100 }, (_, i) => `mot${p * 100 + i}`).join(" ")}.</p>`
    ).join("\n");
    return {
      text: `<h1>Préparer le clapier</h1>\n${paragraphs}`,
      modelUsed: "gemini-3.6-flash",
      usage: { inputTokens: 1000, outputTokens: 900 },
      fellBack: false,
      errors: [],
    };
  },
}));

vi.mock("@/lib/ai/search-context", () => ({
  fetchSearchContext: async () => "",
  getAiModel: () => null,
  getSearchTools: () => undefined,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("pas de session utilisateur dans le worker");
  },
}));

import { processNextChapter, type BookJobRow } from "@/lib/ai/book-job";

const USER = "fa9b95b4-5d42-4e3a-b60d-c6e7d9e4f695";
const PROJECT = "66fd992b-f0c9-4559-9710-e4d8532ce89c";
const JOB = "52c6eaac-26c3-46b8-bcdb-dc1fa4683dc6";
const TOKEN = "3f1c2b8e-7d4a-4c1e-9b2a-5e6f7a8b9c0d";
const OTHER_TOKEN = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const CH1 = "9ef0ce94-2d7c-4ccc-be44-1f262dbac5e8";
const CH2 = "36dee7e5-0bf9-404a-aa13-beabdc0744fb";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let fake = createFakeSupabase({ tables: IRIS_TABLES });

/**
 * Modèle JS des RPC du bail (la version SQL est testée sur Postgres :
 * supabase/tests/book_job_lease.test.mjs).
 */
function installLeaseRpcs() {
  const base = fake.client.rpc;
  fake.client.rpc = async (fn: string, args: Row) => {
    const job = fake.table("book_generation_jobs").find((j) => j.id === args.p_job_id);
    const owns = !!job && job.lock_token === args.p_token;
    switch (fn) {
      case "heartbeat_book_job":
        return { data: owns ? job!.status : null, error: null };
      case "advance_book_job": {
        if (!owns || job!.current_index !== args.p_index) return { data: null, error: null };
        const wasRunning = job!.status === "running";
        job!.current_index = args.p_index + 1;
        job!.chapter_summaries = args.p_summaries;
        if (wasRunning && job!.current_index >= job!.total) job!.status = "completed";
        if (!(wasRunning && job!.current_index < job!.total)) job!.lock_token = null;
        return { data: job!.status, error: null };
      }
      case "stop_book_job": {
        if (!owns) return { data: null, error: null };
        if (job!.status === "running") {
          job!.status = args.p_status;
          job!.last_error = args.p_error;
        }
        job!.lock_token = null;
        return { data: job!.status, error: null };
      }
      default:
        return base(fn, args);
    }
  };
}

function setup(opts: { balance?: number; currentIndex?: number; withChapters?: boolean } = {}): BookJobRow {
  fake = createFakeSupabase({ tables: IRIS_TABLES });
  hooks.generateCalls = 0;
  hooks.onGenerate = null;
  fake.table("wallets").push({ id: "w1", user_id: USER, balance: opts.balance ?? 5000 });
  if (opts.withChapters !== false) {
    fake.table("chapters").push(
      { id: CH1, project_id: PROJECT, number: 2, title: "Chapitre 1 : Préparer le clapier", content: "", status: "Brouillon" },
      { id: CH2, project_id: PROJECT, number: 3, title: "Chapitre 2 : Nourrir ses lapins", content: "", status: "Brouillon" }
    );
  }
  const job = {
    id: JOB,
    project_id: PROJECT,
    user_id: USER,
    status: "running" as const,
    settings: { title: "Élever des lapins", model: "gemini-3.6-flash", targetWords: 600, useWebSearch: false, category: "Guide Pratique", workType: "guide" },
    plan: [
      { chapterId: CH1, number: 2, title: "Préparer le clapier", brief: "Le clapier idéal.", heading: "Chapitre 1 : Préparer le clapier" },
      { chapterId: CH2, number: 3, title: "Nourrir ses lapins", brief: "Rations et eau.", heading: "Chapitre 2 : Nourrir ses lapins" },
    ],
    current_index: opts.currentIndex ?? 0,
    total: 2,
    chapter_summaries: [],
    attempt_count: 0,
    last_error: null,
    bible: null,
    lock_token: TOKEN,
  };
  fake.table("book_generation_jobs").push(job);
  installLeaseRpcs();
  return { ...job };
}

const jobRow = () => fake.table("book_generation_jobs")[0];
const chapter = (id: string) => fake.table("chapters").find((c) => c.id === id);

describe("processNextChapter — écriture sous bail", () => {
  it("écrit le chapitre, le facture une fois et avance le job en gardant le bail", async () => {
    const job = setup();
    const step = await processNextChapter(fake.client, job, TOKEN);

    expect(step.next).toBe("continue");
    if (step.next !== "continue") return;
    expect(step.job.current_index).toBe(1);
    expect(step.job.chapter_summaries).toHaveLength(1);
    expect(chapter(CH1)).toMatchObject({ status: "Terminé", title: "Chapitre 1 : Préparer le clapier" });
    expect(chapter(CH1)!.content).toContain("mot42");
    expect(fake.debits()).toHaveLength(1);
    expect(jobRow()).toMatchObject({ current_index: 1, status: "running", lock_token: TOKEN });
  });

  it("dernier chapitre : le job est terminé et le bail libéré", async () => {
    const job = setup({ currentIndex: 1 });
    const step = await processNextChapter(fake.client, job, TOKEN);

    expect(step).toEqual({ next: "stop", status: "completed" });
    expect(jobRow()).toMatchObject({ current_index: 2, status: "completed", lock_token: null });
    expect(chapter(CH2)!.status).toBe("Terminé");
    expect(fake.debits()).toHaveLength(1);
  });

  it("bail déjà repris par un autre worker : aucun chapitre n'est démarré", async () => {
    const job = setup();
    jobRow().lock_token = OTHER_TOKEN;

    const step = await processNextChapter(fake.client, job, TOKEN);

    expect(step).toEqual({ next: "stop", status: "lost" });
    expect(hooks.generateCalls).toBe(0);
    expect(fake.debits()).toHaveLength(0);
  });

  it("bail repris par un autre worker pendant la rédaction : rien n'est écrit ni facturé", async () => {
    const job = setup();
    hooks.onGenerate = () => {
      jobRow().lock_token = OTHER_TOKEN;
    };

    const step = await processNextChapter(fake.client, job, TOKEN);

    expect(step).toEqual({ next: "stop", status: "lost" });
    expect(chapter(CH1)!.content).toBe("");
    expect(fake.debits()).toHaveLength(0);
    expect(jobRow()).toMatchObject({ current_index: 0, lock_token: OTHER_TOKEN });
  });

  it("chapitre supprimé (livre régénéré entre-temps) : rien n'est facturé, le job est clos comme remplacé", async () => {
    const job = setup({ withChapters: false });
    const step = await processNextChapter(fake.client, job, TOKEN);

    expect(step).toEqual({ next: "stop", status: "canceled" });
    expect(fake.debits()).toHaveLength(0);
    expect(jobRow()).toMatchObject({ status: "canceled", last_error: "superseded", lock_token: null });
  });

  it("annulation pendant l'écriture : le chapitre en cours est enregistré et facturé, puis le job s'arrête", async () => {
    const job = setup();
    hooks.onGenerate = () => {
      jobRow().status = "canceled";
    };

    const step = await processNextChapter(fake.client, job, TOKEN);

    expect(step).toEqual({ next: "stop", status: "canceled" });
    expect(chapter(CH1)!.status).toBe("Terminé");
    expect(fake.debits()).toHaveLength(1);
    // L'annulation n'est pas écrasée par l'avancement (ancien bug : le job repassait « running »).
    expect(jobRow()).toMatchObject({ status: "canceled", current_index: 1, lock_token: null });
  });

  it("annulé entre deux chapitres : aucun chapitre n'est démarré ni facturé", async () => {
    const job = setup({ currentIndex: 0 });
    jobRow().status = "canceled";

    const step = await processNextChapter(fake.client, job, TOKEN);

    expect(step).toEqual({ next: "stop", status: "canceled" });
    expect(hooks.generateCalls).toBe(0);
    expect(fake.debits()).toHaveLength(0);
    expect(jobRow()).toMatchObject({ status: "canceled", lock_token: null });
  });

  it("solde insuffisant : aucun appel IA, job en échec « insufficient_funds »", async () => {
    const job = setup({ balance: 5 });
    const step = await processNextChapter(fake.client, job, TOKEN);

    expect(step).toEqual({ next: "stop", status: "failed" });
    expect(hooks.generateCalls).toBe(0);
    expect(jobRow()).toMatchObject({ status: "failed", last_error: "insufficient_funds", lock_token: null });
  });
});
