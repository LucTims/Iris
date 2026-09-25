import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { getPackById } from "@/lib/coinPacks";
import { createFakeSupabase, IRIS_TABLES } from "./helpers/fakeSupabase";

/**
 * Rejoue, contre la vraie route du webhook, la séquence observée en
 * production le 24/09 pour UN achat du pack Creator : `successful.sale` puis
 * `license.issued` puis `license.activated`. L'acheteur avait reçu 8 000
 * pièces au lieu de 4 000.
 */

let fake = createFakeSupabase({ tables: IRIS_TABLES });

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => fake.client,
}));
vi.mock("@/lib/meta/capi", () => ({
  sendToCAPI: vi.fn(async () => undefined),
}));

const SECRET = "whsec_test_webhook_secret";
const BUYER = "49eb43bc-361e-48e9-bcad-117bf5caf2ea";
const EMAIL = "acheteuse@example.com";
const creator = getPackById("pack_creator")!;

const sale = {
  event: "successful.sale",
  sale: { id: "SALEEZYB4TDIP1XWOON", amount: { value: 3500, currency: "XAF" }, status: "completed" },
  product: { id: "prd_18k5s6e1", name: "Iris Creator" },
  customer: { id: "cus_1", email: EMAIL },
};
const license = (event: string) => ({
  event,
  license: { id: "license_mj82x7", key: "VJ39-FSXD-EVZG-7ZS8-9HLI", status: "active" },
  product: { id: "prd_18k5s6e1", name: "Iris Creator" },
  customer: { id: "cus_1", email: EMAIL },
});

function pulse(body: object, deliveryId: string, secret = SECRET) {
  const raw = JSON.stringify(body);
  const signature = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return new Request("https://iris.test/api/webhooks/chariow", {
    method: "POST",
    headers: { "x-chariow-signature": signature, "x-pulse-delivery-id": deliveryId, "content-type": "application/json" },
    body: raw,
  });
}

async function post(request: Request) {
  const { POST } = await import("@/app/api/webhooks/chariow/route");
  const res = await POST(request as never);
  return { status: res.status, body: await res.json() };
}

describe("webhook Chariow — un achat, un crédit", () => {
  beforeEach(() => {
    fake = createFakeSupabase({ tables: IRIS_TABLES });
    fake.table("profiles").push({ id: BUYER, email: EMAIL });
    fake.table("wallets").push({ id: "w1", user_id: BUYER, balance: 500 });
    vi.stubEnv("CHARIOW_PULSE_SECRET", SECRET);
    vi.stubEnv("CHARIOW_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("vente + licence émise + licence activée : crédite exactement le pack, une seule fois", async () => {
    const saleRes = await post(pulse(sale, "pdlv_sale"));
    expect(saleRes.body.status).toBe("awaiting_license");
    expect(fake.balanceOf(BUYER)).toBe(500);

    const [issued, activated] = await Promise.all([
      post(pulse(license("license.issued"), "pdlv_issued")),
      post(pulse(license("license.activated"), "pdlv_activated")),
    ]);

    expect([issued.body.status, activated.body.status].sort()).toEqual(["already_credited", "credited"]);
    expect(fake.balanceOf(BUYER)).toBe(500 + creator.coins);
    expect(fake.credits()).toHaveLength(1);
    // Un seul paiement journalisé : le chiffre d'affaires de l'admin n'est plus doublé.
    expect(fake.table("transactions")).toHaveLength(1);
  });

  it("un réessai Chariow de la même livraison n'est pas recrédité", async () => {
    await post(pulse(license("license.issued"), "pdlv_same"));
    const retry = await post(pulse(license("license.issued"), "pdlv_same"));

    expect(retry.body.status).toBe("already_processed");
    expect(fake.balanceOf(BUYER)).toBe(500 + creator.coins);
  });

  it("un ancien produit sans licence est crédité sur la vente, une seule fois", async () => {
    const legacy = { ...sale, product: { id: "prd_jvzz32pf", name: "Creator" } };
    await post(pulse(legacy, "pdlv_legacy_1"));
    await post(pulse(legacy, "pdlv_legacy_replay"));

    expect(fake.balanceOf(BUYER)).toBe(500 + creator.coins);
    expect(fake.table("transactions")[0]).toMatchObject({ amount: 3500, provider_reference: "SALEEZYB4TDIP1XWOON" });
  });

  it("refuse une notification signée avec un autre secret (ex. l'ancien secret publié dans le dépôt)", async () => {
    const forged = await post(pulse(license("license.issued"), "pdlv_forged", "whsec_ancien_secret_public"));

    expect(forged.status).toBe(401);
    expect(fake.balanceOf(BUYER)).toBe(500);
  });

  it("répond 200 quand l'acheteur n'a pas de compte (un 4xx ferait désactiver le Pulse par Chariow)", async () => {
    const unknown = { ...license("license.issued"), customer: { id: "cus_2", email: "inconnu@example.com" } };
    const res = await post(pulse(unknown, "pdlv_unknown"));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("user_not_found");
    expect(fake.table("redeemed_licenses")).toHaveLength(0);
  });
});
