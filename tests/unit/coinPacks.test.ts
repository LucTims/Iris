import { describe, it, expect } from "vitest";
import { getPackById, coinsForPurchase, COIN_PACKS } from "@/lib/coinPacks";

describe("getPackById", () => {
  it("finds a pack by its id", () => {
    expect(getPackById("pack_starter")?.name).toBe("Starter");
  });

  it("finds a pack by name, case/spacing-insensitive (webhook plan_id tolerance)", () => {
    expect(getPackById("Starter")?.id).toBe("pack_starter");
    expect(getPackById("starter")?.id).toBe("pack_starter");
    expect(getPackById("CREATOR")?.id).toBe("pack_creator");
  });

  it("returns undefined for an unknown plan id", () => {
    expect(getPackById("does_not_exist")).toBeUndefined();
  });
});

describe("coinsForPurchase", () => {
  it("prefers the plan id when it resolves to a known pack", () => {
    expect(coinsForPurchase("pack_author")).toBe(7000);
  });

  it("falls back to amount-based tiers when the plan id is unknown", () => {
    const starter = COIN_PACKS.find((p) => p.id === "pack_starter")!;
    expect(coinsForPurchase("unknown_plan", starter.priceFcfa)).toBe(starter.coins);
  });

  it("returns 0 when neither plan id nor amount resolve to a pack", () => {
    expect(coinsForPurchase(null, 0)).toBe(0);
    expect(coinsForPurchase(undefined, undefined)).toBe(0);
  });
});
