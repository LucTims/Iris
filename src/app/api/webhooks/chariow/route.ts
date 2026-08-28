import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPackById } from "@/lib/coinPacks";
import { creditWalletCoins } from "@/lib/payments/creditWallet";
import { verifyChariowSignature } from "@/lib/payments/chariowSignature";

/**
 * Webhook "Pulse" Chariow — sécurisé selon le contrat officiel
 * (https://chariow.dev/en/guides/pulse-security) :
 *   - signature HMAC-SHA256 du corps BRUT, header `x-chariow-signature`
 *     au format `sha256=<hex>`, comparaison en temps constant ;
 *   - déduplication sur `x-pulse-delivery-id` (Chariow réessaie jusqu'à 5 fois
 *     la même livraison) via la table webhook_deliveries ;
 *   - crédit du wallet via le RPC atomique credit_wallet_coins (pas de
 *     lire-puis-écrire, qui pouvait perdre un crédit sous concurrence).
 *
 * AVANT ce fichier : la route ne vérifiait AUCUNE signature — n'importe qui
 * connaissant/devinant l'URL pouvait créditer des pièces gratuitement.
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// IDs produits Chariow -> plans de pièces internes (voir @/lib/coinPacks).
const PRODUCT_ID_TO_PLAN: Record<string, string> = {
  prd_waqgpzhy: "starter",
  prd_jvzz32pf: "creator",
  prd_yekmrhdn: "author",
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const secret = process.env.CHARIOW_PULSE_SECRET;
    if (!secret) {
      console.error("CHARIOW_PULSE_SECRET manquante côté serveur — webhook refusé par sécurité.");
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

    const receivedSignature = req.headers.get("x-chariow-signature");
    if (!verifyChariowSignature(rawBody, secret, receivedSignature)) {
      console.warn("Signature Chariow invalide ou absente — requête rejetée 401.");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Déduplication : un même événement peut être livré plusieurs fois
    // (réessais Chariow, ou replay manuel depuis le dashboard). Les tests
    // envoyés depuis le dashboard n'ont pas de delivery-id : dans ce cas on
    // traite sans persister de clé d'idempotence.
    const deliveryId = req.headers.get("x-pulse-delivery-id");
    if (deliveryId) {
      const { error: dedupeError } = await supabase
        .from("webhook_deliveries")
        .insert({ provider: "chariow", delivery_id: deliveryId, event: payload?.event || null });

      if (dedupeError) {
        // Violation de contrainte unique = déjà traité : on acquitte sans rejouer.
        if ((dedupeError as any).code === "23505") {
          return NextResponse.json({ received: true, status: "already_processed" });
        }
        console.error("Erreur lors de l'enregistrement de l'idempotence Chariow:", dedupeError);
        // On continue quand même le traitement plutôt que de perdre un paiement
        // pour un souci d'écriture sur la table de dédup.
      }
    }

    const event = payload?.event;
    if (event !== "successful.sale") {
      // Autres événements (abandoned/failed sale, licences, affilié…) : rien à
      // créditer, on acquitte simplement pour éviter les réessais Chariow.
      return NextResponse.json({ received: true, status: "ignored", event });
    }

    const sale = payload?.sale || {};
    const product = payload?.product || {};
    const customer = payload?.customer || {};

    const productId: string | undefined = product?.id;
    const planId =
      (productId && PRODUCT_ID_TO_PLAN[productId]) ||
      sale?.custom_metadata?.plan_id ||
      undefined;

    const pack = planId ? getPackById(planId) : undefined;
    if (!pack) {
      console.error("Produit Chariow non mappé à un pack de pièces:", productId);
      return NextResponse.json({ received: true, status: "unknown_product" });
    }

    // Identification de l'utilisateur : d'abord la référence explicite passée
    // au checkout (custom_metadata.user_id / client_reference_id), sinon
    // repli par email (moins fiable, un email peut ne correspondre à aucun
    // compte si l'achat a été fait avec une autre adresse).
    let userId: string | undefined =
      sale?.custom_metadata?.user_id || sale?.custom_metadata?.client_reference_id;

    const customerEmail: string | undefined = customer?.email;
    if (!userId && customerEmail) {
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      if (!userError && users?.users) {
        userId = users.users.find((u) => u.email === customerEmail)?.id;
      }
    }

    if (!userId) {
      console.error("Impossible de trouver l'utilisateur pour la vente Chariow:", sale?.id, customerEmail);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 400 });
    }

    const amountValue = Number(sale?.amount?.value) || pack.priceFcfa;
    const currency = sale?.amount?.currency || "XOF";

    const credit = await creditWalletCoins(
      supabase,
      userId,
      pack.coins,
      `Achat de pièces (Chariow) : ${pack.name}`,
      {
        provider: "chariow",
        sale_id: sale?.id,
        product_id: productId,
        plan_id: pack.id,
      }
    );

    if (!credit.ok) {
      console.error("Échec du crédit wallet pour la vente Chariow:", sale?.id, userId);
      return NextResponse.json({ error: "Échec du crédit" }, { status: 500 });
    }

    // Journal (best-effort) — cohérent avec le schéma réel de `transactions`
    // (plan_id NOT NULL). Une erreur ici n'annule pas le crédit déjà effectué.
    try {
      await supabase.from("transactions").insert({
        user_id: userId,
        plan_id: pack.id,
        amount: amountValue,
        currency,
        status: "paid",
        provider_reference: sale?.id || null,
      });
    } catch (logErr) {
      console.warn("Journalisation transaction Chariow non critique:", logErr);
    }

    console.log(`[Webhook Chariow] ${pack.coins} pièces créditées à l'utilisateur ${userId} (vente ${sale?.id}).`);

    return NextResponse.json({ success: true, coins_credited: pack.coins });
  } catch (error: any) {
    console.error("Erreur Webhook Chariow:", error?.message || error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
