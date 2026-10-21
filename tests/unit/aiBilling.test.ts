import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canonicalModelId,
  estimateCallCoins,
  tokenCallCoins,
  MIN_AI_CALL_COINS,
  COINS_PER_USD,
} from "@/lib/ai/pricing";
import { fallbackChain } from "@/lib/ai/model-fallback";
import { createFakeSupabase, IRIS_TABLES } from "./helpers/fakeSupabase";

/**
 * Facturation de TOUTE génération IA (assistant de l'éditeur compris).
 *
 * Bug corrigé : le modèle par défaut (gemini-3.6-flash) n'avait pas de ligne
 * dans `ai_models` ; deductCost() abandonnait alors le débit en silence. Chat,
 * actions contextuelles, plan, GEO, analyse d'image… étaient gratuits.
 */

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fake.client }));

let fake = createFakeSupabase({ tables: IRIS_TABLES });
const USER = "bed73319-dfca-4606-b81e-aac1d70db9d5";

describe("canonicalModelId", () => {
  it("facture le modèle réellement appelé, jamais un alias inconnu", () => {
    expect(canonicalModelId(undefined)).toBe("gemini-3.6-flash");
    expect(canonicalModelId("")).toBe("gemini-3.6-flash");
    expect(canonicalModelId("o3")).toBe("gpt-4o");
    expect(canonicalModelId("gpt-5")).toBe("gpt-4o");
    expect(canonicalModelId("GPT-4o-mini")).toBe("gpt-4o-mini");
    expect(canonicalModelId("claude-3-5-sonnet-20240620")).toBe("claude-sonnet-5");
    expect(canonicalModelId("claude-3-haiku")).toBe("claude-haiku-4-5-20251001");
    expect(canonicalModelId("gemini-2.5-pro")).toBe("gemini-2.5-pro");
    expect(canonicalModelId("n-importe-quoi")).toBe("gemini-3.6-flash");
  });

  it("est idempotent (le modèle canonique se route vers lui-même)", () => {
    for (const m of ["gpt-4o", "gpt-4o-mini", "claude-sonnet-5", "claude-haiku-4-5-20251001", "gemini-2.5-pro", "gemini-3.6-flash"]) {
      expect(canonicalModelId(m)).toBe(m);
    }
  });

  it("la chaîne de repli démarre sur le modèle canonique", () => {
    expect(fallbackChain("o3")[0]).toBe("gpt-4o");
  });
});

describe("estimation avant appel", () => {
  it("aucun appel ne coûte moins que le plancher", () => {
    expect(tokenCallCoins("gemini-3.6-flash", 1, 1)).toBe(MIN_AI_CALL_COINS);
  });

  it("une réécriture longue sur un modèle premium exige bien plus que 5 pièces", () => {
    const chapter = "x".repeat(40_000); // ~10 000 tokens
    expect(estimateCallCoins("claude-sonnet-5", chapter, 16_000)).toBeGreaterThan(500);
  });
});

describe("deductGenerationCost", () => {
  beforeEach(() => {
    fake = createFakeSupabase({ tables: IRIS_TABLES });
    fake.table("wallets").push({ id: "w1", user_id: USER, balance: 1000 });
    // Table de prix SANS le modèle par défaut — exactement l'état de la prod.
    fake.table("ai_models").push({ model_id: "gpt-4o", input_cost_per_1m: 5, output_cost_per_1m: 15 });
  });

  it("débite même quand le modèle est absent de ai_models (régression assistant gratuit)", async () => {
    const { deductGenerationCost } = await import("@/lib/ai/cost-engine");
    const ok = await deductGenerationCost(USER, "gemini-3.6-flash", { inputTokens: 4000, outputTokens: 1000 }, "Assistant IA — conversation");

    expect(ok).toBe(true);
    const expected = Math.max(MIN_AI_CALL_COINS, Math.ceil(((4000 * 0.3 + 1000 * 2.5) / 1e6) * COINS_PER_USD));
    expect(fake.debits()).toHaveLength(1);
    expect(fake.debits()[0].amount).toBe(expected);
    expect(fake.balanceOf(USER)).toBe(1000 - expected);
  });

  it("un alias de modèle est facturé au tarif du modèle réellement appelé", async () => {
    const { deductGenerationCost } = await import("@/lib/ai/cost-engine");
    await deductGenerationCost(USER, "o3", { inputTokens: 1000, outputTokens: 1000 }, "Action IA");

    const debit = fake.debits()[0];
    expect(debit.metadata).toMatchObject({ model_id: "gpt-4o", requested_model: "o3" });
    expect(debit.amount).toBe(Math.ceil(((1000 * 5 + 1000 * 15) / 1e6) * COINS_PER_USD));
  });

  it("applique le plancher par appel", async () => {
    const { deductGenerationCost } = await import("@/lib/ai/cost-engine");
    await deductGenerationCost(USER, "gemini-3.6-flash", { inputTokens: 10, outputTokens: 5 }, "Action IA");
    expect(fake.debits()[0].amount).toBe(MIN_AI_CALL_COINS);
  });

  it("solde insuffisant après génération : le solde restant est prélevé et l'impayé tracé", async () => {
    fake.table("wallets")[0].balance = 40;
    const { deductGenerationCost } = await import("@/lib/ai/cost-engine");
    const ok = await deductGenerationCost(USER, "gpt-4o", { inputTokens: 20_000, outputTokens: 10_000 }, "Assistant IA — modification de chapitre");

    expect(ok).toBe(false);
    expect(fake.balanceOf(USER)).toBe(0);
    expect(fake.debits()).toHaveLength(1);
    expect(fake.debits()[0]).toMatchObject({ amount: 40 });
    expect(fake.debits()[0].metadata).toMatchObject({ partial: true });
    expect(fake.table("ai_usage")).toContainEqual(expect.objectContaining({ user_id: USER, action: "billing_failed" }));
  });
});

describe("deductFixedCoins", () => {
  beforeEach(() => {
    fake = createFakeSupabase({ tables: IRIS_TABLES });
    fake.table("wallets").push({ id: "w1", user_id: USER, balance: 7 });
  });

  it("solde insuffisant : prélève le reste au lieu de livrer gratuitement", async () => {
    const { deductFixedCoins } = await import("@/lib/ai/cost-engine");
    const ok = await deductFixedCoins(USER, 20, "Couverture standard");
    expect(ok).toBe(false);
    expect(fake.balanceOf(USER)).toBe(0);
    expect(fake.debits()[0]).toMatchObject({ amount: 7 });
  });
});
