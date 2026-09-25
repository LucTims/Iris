import { describe, it, expect } from "vitest";
import { getPackById } from "@/lib/coinPacks";
import {
  creditPurchaseOnce,
  findUserIdByEmail,
  licenseClaimKey,
  saleClaimKey,
} from "@/lib/payments/purchaseCredit";
import { createFakeSupabase, IRIS_TABLES } from "./helpers/fakeSupabase";

const creator = getPackById("pack_creator")!;
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function credit(fake: ReturnType<typeof createFakeSupabase>, claimKey: string, userId = USER, source = "pulse_webhook") {
  return creditPurchaseOnce(fake.client, {
    claimKey,
    userId,
    pack: creator,
    source,
    description: `Achat de pièces : ${creator.name}`,
    productId: "prd_18k5s6e1",
  });
}

describe("claim keys", () => {
  it("normalise la clé de licence (casse, espaces) pour qu'une saisie manuelle retombe sur la même réservation", () => {
    expect(licenseClaimKey("  vj39-fsxd-evzg-7zs8-9hli ")).toBe("VJ39-FSXD-EVZG-7ZS8-9HLI");
  });

  it("préfixe les ventes pour ne jamais entrer en collision avec une clé de licence", () => {
    expect(saleClaimKey("SALEEZYB4TDIP1XWOON")).toBe("sale:SALEEZYB4TDIP1XWOON");
  });
});

describe("creditPurchaseOnce", () => {
  it("crédite exactement le pack acheté et journalise UN paiement", async () => {
    const fake = createFakeSupabase({ tables: IRIS_TABLES });
    const outcome = await credit(fake, "KEY-1");

    expect(outcome).toMatchObject({ status: "credited", coins: creator.coins });
    expect(fake.balanceOf(USER)).toBe(creator.coins);
    expect(fake.table("transactions")).toHaveLength(1);
    expect(fake.table("transactions")[0]).toMatchObject({ plan_id: creator.id, amount: creator.priceFcfa, status: "paid" });
  });

  it("5 appels simultanés pour le même achat (bug du 20/09) ne créditent qu'une fois", async () => {
    const fake = createFakeSupabase({ tables: IRIS_TABLES });
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => credit(fake, "IVO5-48T4-9FX1-V27V-QX2A", USER, "sync_endpoint")));

    expect(outcomes.filter((o) => o.status === "credited")).toHaveLength(1);
    expect(outcomes.filter((o) => o.status === "already_credited")).toHaveLength(4);
    expect(fake.credits()).toHaveLength(1);
    expect(fake.balanceOf(USER)).toBe(creator.coins);
    expect(fake.table("transactions")).toHaveLength(1);
  });

  it("webhook, synchro et saisie manuelle concurrents sur la même licence : un seul crédit", async () => {
    const fake = createFakeSupabase({ tables: IRIS_TABLES });
    await Promise.all([
      credit(fake, licenseClaimKey("VJ39-FSXD-EVZG-7ZS8-9HLI"), USER, "pulse_webhook"),
      credit(fake, licenseClaimKey("VJ39-FSXD-EVZG-7ZS8-9HLI"), USER, "pulse_webhook"),
      credit(fake, licenseClaimKey("vj39-fsxd-evzg-7zs8-9hli"), USER, "manual_redeem"),
      credit(fake, licenseClaimKey("VJ39-FSXD-EVZG-7ZS8-9HLI"), USER, "sync_endpoint"),
    ]);

    expect(fake.credits()).toHaveLength(1);
    expect(fake.balanceOf(USER)).toBe(creator.coins);
  });

  it("signale le propriétaire quand l'achat a déjà été crédité à un autre compte", async () => {
    const fake = createFakeSupabase({ tables: IRIS_TABLES });
    await credit(fake, "KEY-2", USER);
    const second = await credit(fake, "KEY-2", OTHER);

    expect(second).toEqual({ status: "already_credited", ownerUserId: USER, coins: creator.coins });
    expect(fake.balanceOf(OTHER)).toBe(0);
  });

  it("libère la réservation quand le crédit échoue, pour qu'un réessai puisse créditer", async () => {
    const fake = createFakeSupabase({ tables: IRIS_TABLES, failCreditCalls: 1 });

    const first = await credit(fake, "KEY-3");
    expect(first.status).toBe("failed");
    expect(fake.table("redeemed_licenses")).toHaveLength(0);
    expect(fake.table("transactions")).toHaveLength(0);

    const retry = await credit(fake, "KEY-3");
    expect(retry.status).toBe("credited");
    expect(fake.balanceOf(USER)).toBe(creator.coins);
  });

  it("des achats distincts du même pack sont tous crédités (achats multiples)", async () => {
    const fake = createFakeSupabase({ tables: IRIS_TABLES });
    await credit(fake, "KEY-A");
    await credit(fake, "KEY-B");
    expect(fake.balanceOf(USER)).toBe(2 * creator.coins);
  });
});

describe("findUserIdByEmail", () => {
  it("retrouve le compte par égalité exacte, insensible à la casse de l'e-mail reçu", async () => {
    const fake = createFakeSupabase();
    fake.table("profiles").push({ id: USER, email: "jean_dupont@example.com" });

    expect(await findUserIdByEmail(fake.client, "  Jean_Dupont@Example.com ")).toBe(USER);
  });

  it("ne traite pas « _ » comme un joker (l'ancien ilike créditait le mauvais compte)", async () => {
    const fake = createFakeSupabase();
    fake.table("profiles").push({ id: OTHER, email: "jeanxdupont@example.com" });

    expect(await findUserIdByEmail(fake.client, "jean_dupont@example.com")).toBeNull();
  });
});
