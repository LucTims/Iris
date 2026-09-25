import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { chariowProductIssuesLicense, getPackByChariowProductId, type CoinPack } from "@/lib/coinPacks";
import { verifyChariowSignature } from "@/lib/payments/chariowSignature";
import {
  activateChariowLicense,
  fetchChariowLicense,
  fetchChariowSale,
  getChariowApiKey,
  isPaidSaleStatus,
  normalizeChariowLicense,
} from "@/lib/payments/chariowApi";
import { creditPurchaseOnce, findUserIdByEmail, licenseClaimKey, saleClaimKey } from "@/lib/payments/purchaseCredit";

/**
 * Webhook « Pulse » Chariow.
 *
 * UN ACHAT = UN CRÉDIT. Un produit à licence déclenche, pour UN paiement,
 * `successful.sale` puis `license.issued` (et `license.activated`). Ces
 * notifications ne partagent aucun identifiant ; les deux créditaient, d'où
 * le double de pièces. Désormais :
 *   - produit à licence : seule la LICENCE crédite (clé unique, commune à la
 *     synchro du tableau de bord et à la saisie manuelle) ; la vente sert au
 *     suivi Meta (CAPI) ;
 *   - ancien produit sans licence : la vente crédite (clé `sale:<id>`).
 * Le crédit passe par `creditPurchaseOnce` (réservation atomique AVANT crédit).
 *
 * Authenticité (https://chariow.dev/en/guides/pulse-security) : signature
 * HMAC-SHA256 du corps brut, secret lu UNIQUEMENT dans l'environnement. Si la
 * signature ne peut pas être vérifiée, le contenu du message n'est pas digne
 * de confiance : l'achat est relu auprès de l'API Chariow et ce sont ses
 * données (client, produit) qui font foi, jamais celles du message.
 */

const SALE_EVENT = "successful.sale";
const LICENSE_EVENTS = new Set(["license.issued", "license.activated"]);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* eslint-disable @typescript-eslint/no-explicit-any */

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** Faits de l'achat, issus du message signé ou relus auprès de l'API Chariow. */
interface PurchaseFacts {
  kind: "sale" | "license";
  saleId: string | null;
  licenseKey: string | null;
  rawLicenseKey: string | null;
  licenseId: string | null;
  productId: string | null;
  customerEmail: string | null;
  amount: number | null;
  currency: string | null;
  /** user_id transmis au checkout (métadonnées de vente) — seulement si le message est signé. */
  userIdHint: string | null;
}

function factsFromSignedPayload(event: string, payload: any): PurchaseFacts | null {
  if (event === SALE_EVENT) {
    const saleId = typeof payload?.sale?.id === "string" ? payload.sale.id.trim() : "";
    if (!saleId) return null;
    const meta = payload?.sale?.custom_metadata || {};
    const hint = [meta.user_id, meta.client_reference_id].find(
      (v: unknown): v is string => typeof v === "string" && UUID_REGEX.test(v)
    );
    const amount = Number(payload?.sale?.amount?.value);
    return {
      kind: "sale",
      saleId,
      licenseKey: null,
      rawLicenseKey: null,
      licenseId: null,
      productId: typeof payload?.product?.id === "string" ? payload.product.id : null,
      customerEmail: typeof payload?.customer?.email === "string" ? payload.customer.email.trim().toLowerCase() : null,
      amount: Number.isFinite(amount) ? amount : null,
      currency: typeof payload?.sale?.amount?.currency === "string" ? payload.sale.amount.currency : null,
      userIdHint: hint ?? null,
    };
  }

  const license = normalizeChariowLicense({
    ...(payload?.license || {}),
    product: payload?.product,
    customer: payload?.customer,
  });
  if (!license) return null;
  return {
    kind: "license",
    saleId: null,
    licenseKey: license.key,
    rawLicenseKey: license.rawKey,
    licenseId: license.id,
    productId: license.productId,
    customerEmail: license.customerEmail,
    amount: null,
    currency: null,
    userIdHint: null,
  };
}

/**
 * Repli quand la signature est invalide ou non vérifiable : on ne garde du
 * message que l'identifiant de l'achat, et on relit TOUT le reste auprès de
 * Chariow. Un message forgé avec une vraie clé de licence mais l'e-mail d'un
 * tiers crédite ainsi le véritable acheteur ; une clé inventée n'existe pas.
 */
async function factsFromChariowApi(event: string, payload: any): Promise<PurchaseFacts | null> {
  const apiKey = getChariowApiKey();
  if (!apiKey) return null;

  if (event === SALE_EVENT) {
    const saleId = typeof payload?.sale?.id === "string" ? payload.sale.id.trim() : "";
    if (!saleId) return null;
    const lookup = await fetchChariowSale(saleId, apiKey);
    if (lookup.status !== "found" || !isPaidSaleStatus(lookup.value.status)) return null;
    const sale = lookup.value;
    return {
      kind: "sale",
      saleId: sale.id,
      licenseKey: null,
      rawLicenseKey: null,
      licenseId: null,
      productId: sale.productId,
      customerEmail: sale.customerEmail,
      amount: sale.amount,
      currency: sale.currency,
      userIdHint: null,
    };
  }

  const candidate = normalizeChariowLicense(payload?.license);
  if (!candidate) return null;
  const lookup = await fetchChariowLicense(candidate.rawKey, apiKey);
  if (lookup.status !== "found" || lookup.value.isRevoked) return null;
  const license = lookup.value;
  return {
    kind: "license",
    saleId: null,
    licenseKey: license.key,
    rawLicenseKey: license.rawKey,
    licenseId: license.id,
    productId: license.productId,
    customerEmail: license.customerEmail,
    amount: null,
    currency: null,
    userIdHint: null,
  };
}

/** Événement « Purchase » Meta : une seule fois par vente (event_id = id de vente). */
async function sendPurchaseToMeta(facts: PurchaseFacts, pack: CoinPack | undefined) {
  try {
    const { sendToCAPI } = await import("@/lib/meta/capi");
    await sendToCAPI([
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: {
          em: facts.customerEmail
            ? crypto.createHash("sha256").update(facts.customerEmail).digest("hex")
            : undefined,
        },
        custom_data: {
          currency: facts.currency || "XOF",
          value: facts.amount ?? pack?.priceFcfa ?? 0,
          content_name: pack?.name,
          content_ids: pack ? [pack.id] : undefined,
        },
        event_id: facts.saleId || undefined,
      },
    ]);
  } catch (err) {
    console.warn("[Webhook Chariow] Erreur CAPI non critique:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    const event: string = typeof payload?.event === "string" ? payload.event : "";
    if (event !== SALE_EVENT && !LICENSE_EVENTS.has(event)) {
      return NextResponse.json({ received: true, status: "ignored", event });
    }

    // 1. AUTHENTICITÉ
    const secret = (process.env.CHARIOW_PULSE_SECRET || process.env.CHARIOW_WEBHOOK_SECRET || "").trim();
    const signatureValid = !!secret && verifyChariowSignature(rawBody, secret, req.headers.get("x-chariow-signature"));

    let facts: PurchaseFacts | null;
    if (signatureValid) {
      facts = factsFromSignedPayload(event, payload);
      if (!facts) {
        return NextResponse.json({ received: true, status: "ignored", reason: "identifiant d'achat absent" });
      }
    } else {
      if (!secret) console.error("[Webhook Chariow] CHARIOW_PULSE_SECRET absent : vérification par l'API Chariow.");
      else console.warn("[Webhook Chariow] Signature invalide : vérification par l'API Chariow.");
      facts = await factsFromChariowApi(event, payload);
      if (!facts) {
        if (!getChariowApiKey()) {
          console.error("[Webhook Chariow] Ni signature valide ni CHARIOW_API_KEY : impossible d'authentifier la notification.");
        }
        return NextResponse.json({ error: "Notification non authentifiée" }, { status: 401 });
      }
    }

    const supabase = getSupabaseAdmin();

    // 2. DÉDUPLICATION DE LIVRAISON (Chariow réessaie jusqu'à 5 fois la même livraison).
    //    La déduplication de l'ACHAT, elle, est assurée par creditPurchaseOnce.
    const deliveryId = req.headers.get("x-pulse-delivery-id");
    let deliveryRecorded = false;
    if (deliveryId) {
      const { error: dedupeError } = await supabase
        .from("webhook_deliveries")
        .insert({ provider: "chariow", delivery_id: deliveryId, event });
      if (dedupeError?.code === "23505") {
        return NextResponse.json({ received: true, status: "already_processed" });
      }
      if (dedupeError) console.error("[Webhook Chariow] Erreur enregistrement webhook_deliveries:", dedupeError);
      else deliveryRecorded = true;
    }

    // Sur échec transitoire (réponse 5xx), la livraison est libérée : sinon
    // le réessai de Chariow serait écarté comme « déjà traité » et l'achat
    // ne serait jamais crédité.
    const failTransient = async (message: string) => {
      if (deliveryRecorded && deliveryId) {
        await supabase.from("webhook_deliveries").delete().eq("provider", "chariow").eq("delivery_id", deliveryId);
      }
      return NextResponse.json({ error: message }, { status: 500 });
    };

    const pack = facts.productId ? getPackByChariowProductId(facts.productId) : undefined;

    // 3a. VENTE
    if (facts.kind === "sale") {
      await sendPurchaseToMeta(facts, pack);

      if (!pack) {
        console.error("[Webhook Chariow] Produit non mappé à un pack:", facts.productId);
        return NextResponse.json({ received: true, status: "unknown_product" });
      }
      if (chariowProductIssuesLicense(facts.productId)) {
        // Le crédit viendra de license.issued / license.activated.
        return NextResponse.json({ received: true, status: "awaiting_license" });
      }

      const userId = facts.userIdHint || (await findUserIdByEmail(supabase, facts.customerEmail));
      if (!userId) {
        // 200 et non 4xx : un refus ferait réessayer Chariow puis désactiver
        // automatiquement le Pulse au 5e échec, bloquant TOUS les achats.
        console.error("[Webhook Chariow] Aucun compte Iris pour la vente:", facts.saleId, facts.customerEmail);
        return NextResponse.json({ received: true, status: "user_not_found" });
      }

      const outcome = await creditPurchaseOnce(supabase, {
        claimKey: saleClaimKey(facts.saleId!),
        userId,
        pack,
        source: "pulse_webhook",
        description: `Achat de pièces (Chariow) : ${pack.name}`,
        productId: facts.productId,
        providerReference: facts.saleId,
        paidAmount: facts.amount,
        currency: facts.currency,
        metadata: { event, sale_id: facts.saleId, customer_email: facts.customerEmail },
      });
      if (outcome.status === "failed") return failTransient("Échec du crédit");

      console.log(`[Webhook Chariow] Vente ${facts.saleId} : ${outcome.status} (${pack.coins} pièces, ${userId}).`);
      return NextResponse.json({ received: true, status: outcome.status });
    }

    // 3b. LICENCE
    if (!pack) {
      console.error("[Webhook Chariow] Produit de licence non mappé à un pack:", facts.productId);
      return NextResponse.json({ received: true, status: "unknown_product" });
    }

    const userId = await findUserIdByEmail(supabase, facts.customerEmail);
    if (!userId) {
      // L'acheteur pourra saisir sa clé dans « Portefeuille & Pièces ».
      console.error("[Webhook Chariow] Aucun compte Iris pour la licence:", facts.licenseKey, facts.customerEmail);
      return NextResponse.json({ received: true, status: "user_not_found" });
    }

    const outcome = await creditPurchaseOnce(supabase, {
      claimKey: licenseClaimKey(facts.licenseKey!),
      userId,
      pack,
      source: "pulse_webhook",
      description: `Achat de pièces (Chariow) : ${pack.name}`,
      productId: facts.productId,
      chariowLicenseId: facts.licenseId,
      metadata: { event, customer_email: facts.customerEmail },
    });
    if (outcome.status === "failed") return failTransient("Échec du crédit");

    if (outcome.status === "credited" && event === "license.issued") {
      const apiKey = getChariowApiKey();
      if (apiKey && facts.rawLicenseKey) await activateChariowLicense(facts.rawLicenseKey, apiKey, userId);
    }

    console.log(`[Webhook Chariow] Licence ${facts.licenseKey} (${event}) : ${outcome.status} (${pack.coins} pièces, ${userId}).`);
    return NextResponse.json({ received: true, status: outcome.status });
  } catch (error: any) {
    console.error("[Webhook Chariow] Erreur non gérée:", error?.message || error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
