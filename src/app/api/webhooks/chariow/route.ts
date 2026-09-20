import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPackByChariowProductId, getPackById } from "@/lib/coinPacks";
import { creditWalletCoins } from "@/lib/payments/creditWallet";
import { verifyChariowSignature } from "@/lib/payments/chariowSignature";

/**
 * Webhook "Pulse" Chariow — sécurisé selon le contrat officiel
 * (https://chariow.dev/en/guides/pulse-security) :
 *   - signature HMAC-SHA256 du corps BRUT, header x-chariow-signature
 *     au format sha256=<hex>, comparaison en temps constant ;
 *   - déduplication sur x-pulse-delivery-id (Chariow réessaie jusqu'à 5 fois)
 *     via la table webhook_deliveries ;
 *   - prise en charge des événements:
 *       * successful.sale (vente réussie directe)
 *       * license.issued (licence générée suite à un achat)
 *       * license.activated (licence activée)
 *   - double déduplication anti-rejeu via la table redeemed_licenses et transactions ;
 *   - crédit du wallet via le RPC atomique credit_wallet_coins (verrouillage FOR UPDATE).
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const secret = process.env.CHARIOW_PULSE_SECRET || process.env.CHARIOW_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[Webhook Chariow] Clé secrète (CHARIOW_PULSE_SECRET/CHARIOW_WEBHOOK_SECRET) manquante.");
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

    const receivedSignature = req.headers.get("x-chariow-signature");
    if (!verifyChariowSignature(rawBody, secret, receivedSignature)) {
      console.warn("[Webhook Chariow] Signature Chariow invalide ou absente — requête rejetée 401.");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Déduplication au niveau livraison Chariow (x-pulse-delivery-id)
    const deliveryId = req.headers.get("x-pulse-delivery-id");
    if (deliveryId) {
      const { error: dedupeError } = await supabase
        .from("webhook_deliveries")
        .insert({ provider: "chariow", delivery_id: deliveryId, event: payload?.event || null });

      if (dedupeError) {
        if ((dedupeError as any).code === "23505") {
          return NextResponse.json({ received: true, status: "already_processed" });
        }
        console.error("[Webhook Chariow] Erreur enregistrement webhook_deliveries:", dedupeError);
      }
    }

    const event = payload?.event;
    // On prend en compte les événements de vente et de licence
    const validEvents = ["successful.sale", "license.issued", "license.activated"];
    if (!validEvents.includes(event)) {
      return NextResponse.json({ received: true, status: "ignored", event });
    }

    const sale = payload?.sale || {};
    const license = payload?.license || {};
    const product = payload?.product || {};
    const customer = payload?.customer || {};

    const licenseKey: string | undefined = license?.key ? license.key.trim() : undefined;
    const licenseId: string | undefined = license?.id;
    const productId: string | undefined = product?.id;
    const saleId: string | undefined = sale?.id;

    // 2. Déduplication métier anti-double crédit

    // A. Si c'est une licence et qu'elle a déjà été enregistrée/créditée
    if (licenseKey) {
      const { data: existingLicense } = await supabase
        .from("redeemed_licenses")
        .select("id, user_id, coins_credited")
        .eq("license_key", licenseKey)
        .maybeSingle();

      if (existingLicense) {
        return NextResponse.json({ received: true, status: "already_credited_license" });
      }
    }

    // B. Si un ID de vente est présent et qu'il a déjà été payé et crédité
    if (saleId) {
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id, user_id")
        .eq("provider_reference", saleId)
        .eq("status", "paid")
        .maybeSingle();

      if (existingTx) {
        // Enregistrer la clé de licence si elle arrive sur un événement séparé
        if (licenseKey) {
          try {
            await supabase.from("redeemed_licenses").insert({
              user_id: existingTx.user_id,
              license_key: licenseKey,
              chariow_license_id: licenseId || null,
              product_id: productId || "unknown",
              plan_id: "unknown",
              coins_credited: 0,
              source: "pulse_webhook",
            });
          } catch {}
        }
        return NextResponse.json({ received: true, status: "already_credited_sale" });
      }
    }

    // 3. Identification du pack de pièces
    let pack = productId ? getPackByChariowProductId(productId) : undefined;
    if (!pack) {
      const planId = sale?.custom_metadata?.plan_id || product?.name;
      if (planId) {
        pack = getPackById(planId);
      }
    }

    if (!pack) {
      console.error("[Webhook Chariow] Produit non mappé à un pack:", productId, product?.name);
      return NextResponse.json({ received: true, status: "unknown_product" });
    }

    // 4. Identification de l'utilisateur Iris
    let userId: string | undefined =
      sale?.custom_metadata?.user_id ||
      sale?.custom_metadata?.client_reference_id ||
      payload?.custom_metadata?.user_id ||
      payload?.custom_metadata?.client_reference_id;

    const customerEmail: string | undefined = customer?.email;
    if (!userId && customerEmail) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", customerEmail)
        .maybeSingle();

      if (profileError) {
        console.error("[Webhook Chariow] Erreur recherche profil par email:", profileError);
      } else if (profile?.id) {
        userId = profile.id;
      }
    }

    if (!userId) {
      console.error("[Webhook Chariow] Utilisateur introuvable pour la vente/licence:", saleId, customerEmail);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 400 });
    }

    const amountValue = Number(sale?.amount?.value) || pack.priceFcfa;
    const currency = sale?.amount?.currency || "XOF";

    // 5. Crédit atomique du portefeuille
    const credit = await creditWalletCoins(
      supabase,
      userId,
      pack.coins,
      `Achat de pièces (Chariow ${event}) : ${pack.name}`,
      {
        provider: "chariow",
        event,
        sale_id: saleId,
        license_key: licenseKey,
        license_id: licenseId,
        product_id: productId,
        plan_id: pack.id,
      }
    );

    if (!credit.ok) {
      console.error("[Webhook Chariow] Échec du crédit wallet:", saleId, userId);
      return NextResponse.json({ error: "Échec du crédit" }, { status: 500 });
    }

    // 6. Enregistrement dans redeemed_licenses si clé présente
    if (licenseKey) {
      try {
        await supabase.from("redeemed_licenses").insert({
          user_id: userId,
          license_key: licenseKey,
          chariow_license_id: licenseId || null,
          product_id: productId || "unknown",
          plan_id: pack.id,
          coins_credited: pack.coins,
          source: "pulse_webhook",
          metadata: {
            sale_id: saleId,
            customer_email: customerEmail,
          },
        });
      } catch (licErr) {
        console.warn("[Webhook Chariow] Erreur non critique écriture redeemed_licenses:", licErr);
      }
    }

    // 7. Journalisation dans transactions
    try {
      await supabase.from("transactions").insert({
        user_id: userId,
        plan_id: pack.id,
        amount: amountValue,
        currency,
        status: "paid",
        provider_reference: saleId || licenseId || licenseKey || null,
      });
    } catch (logErr) {
      console.warn("[Webhook Chariow] Journalisation transaction non critique:", logErr);
    }

    console.log(
      `[Webhook Chariow] ${pack.coins} pièces créditées à ${userId} (event: ${event}, ref: ${saleId || licenseKey}).`
    );

    return NextResponse.json({ success: true, coins_credited: pack.coins });
  } catch (error: any) {
    console.error("[Webhook Chariow] Erreur non gérée:", error?.message || error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
