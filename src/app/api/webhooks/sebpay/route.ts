import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Map des packs de pièces vers les montants de crédits
const COIN_PACKS: Record<string, number> = {
  pack_starter: 1000,
  "pack-starter": 1000,
  starter_pack: 1000,
  starter: 1000,
  pack_creator: 3000,
  "pack-creator": 3000,
  creator_pack: 3000,
  creator: 3000,
  pack_author: 7000,
  "pack-author": 7000,
  author_pack: 7000,
  author: 7000,
  pack_pro: 16000,
  "pack-pro": 16000,
  pro_pack: 16000,
  pro: 16000,
  pack_studio: 45000,
  "pack-studio": 45000,
  studio_pack: 45000,
  studio: 45000,
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_service_role_key";
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const rawSignature =
      req.headers.get("x-sebpay-signature") ||
      req.headers.get("X-SebPay-Signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("X-Signature") ||
      req.headers.get("sebpay-signature") ||
      req.headers.get("SebPay-Signature") ||
      req.headers.get("x-hub-signature-256");

    const secretKey =
      process.env.SEBPAY_SECRET_KEY ||
      (process.env.NODE_ENV !== "production" ? "test_sebpay_secret_key_12345" : undefined);

    if (!secretKey) {
      console.error("SEBPAY_SECRET_KEY manquante côté serveur — webhook refusé par sécurité.");
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

    if (!rawSignature || typeof rawSignature !== "string") {
      console.warn("Signature absente sur la requête webhook Sebpay — rejet 401.");
      return NextResponse.json({ error: "Signature manquante" }, { status: 401 });
    }

    // Normalisation de la signature (suppression du préfixe sha256= et espaces)
    const normalizedSignature = rawSignature.trim().replace(/^sha256=/i, "");

    // Sebpay Webhook Signature Verification (HMAC-SHA256)
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawBody)
      .digest("hex");

    let isValidSignature = false;
    try {
      const signatureBuffer = Buffer.from(normalizedSignature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");
      if (
        signatureBuffer.length === 32 &&
        expectedBuffer.length === 32 &&
        crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        isValidSignature = true;
      }
    } catch {
      isValidSignature = false;
    }

    if (!isValidSignature) {
      console.warn("Signature HMAC invalide reçue sur le webhook SebPay — requête rejetée 401.");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    // Support des payloads plats et des payloads encapsulés (data / event)
    const data = (body && typeof body.data === "object" && body.data !== null) ? body.data : body;

    const txRef =
      data.external_reference ||
      data.metadata?.order_id ||
      body.external_reference ||
      body.metadata?.order_id ||
      data.transaction_id ||
      data.reference ||
      data.id ||
      body.transaction_id ||
      body.reference ||
      body.id;

    if (!txRef) {
      return NextResponse.json({ error: "Identifiant de transaction manquant" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    let transaction: any = null;

    // 1. Récupérer la transaction en base de données de manière résiliente
    // Si txRef a le format UUID, interroger par colonne id
    if (typeof txRef === "string" && UUID_REGEX.test(txRef)) {
      const { data: txById, error: txError } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("id", txRef)
        .maybeSingle();

      if (!txError && txById) {
        transaction = txById;
      }
    }

    // Si non trouvé par ID direct ou si txRef n'est pas un UUID, rechercher par provider_reference
    if (!transaction) {
      const candidateRefs = [
        txRef,
        data.transaction_id,
        body.transaction_id,
        data.external_reference,
        body.external_reference,
      ].filter((r): r is string => typeof r === "string" && r.length > 0);

      for (const ref of candidateRefs) {
        const { data: txByProv } = await supabaseAdmin
          .from("transactions")
          .select("*")
          .eq("provider_reference", ref)
          .maybeSingle();

        if (txByProv) {
          transaction = txByProv;
          break;
        }
      }
    }

    if (!transaction) {
      console.warn(`[Webhook Sebpay] Transaction introuvable pour ID/Ref: ${txRef}`);
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // 2. Gestion de l'Idempotence : si déjà payée, on ne recrédite pas
    if (transaction.status === "paid") {
      return NextResponse.json(
        { received: true, status: "already_processed", message: "Transaction déjà validée" },
        { status: 200 }
      );
    }

    const rawStatus = (
      data.status ||
      body.status ||
      data.event ||
      body.event ||
      ""
    ).toString().toLowerCase();

    const isSuccess =
      rawStatus === "approved" ||
      rawStatus === "paid" ||
      rawStatus === "success" ||
      rawStatus === "completed" ||
      rawStatus === "succeeded" ||
      rawStatus.includes("approved") ||
      rawStatus.includes("success");

    const isFailure =
      rawStatus === "rejected" ||
      rawStatus === "failed" ||
      rawStatus === "canceled" ||
      rawStatus === "cancelled" ||
      rawStatus.includes("reject") ||
      rawStatus.includes("fail") ||
      rawStatus.includes("cancel");

    // 3. Paiement Réussi -> statut 'paid' et déblocage de pièces
    if (isSuccess) {
      const providerRef =
        data.transaction_id ||
        body.transaction_id ||
        data.id ||
        body.id ||
        data.provider_reference ||
        transaction.provider_reference ||
        txRef;

      // A. Mettre à jour la transaction
      await supabaseAdmin
        .from("transactions")
        .update({
          status: "paid",
          provider_reference: providerRef,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      // B. Créditer le wallet de l'utilisateur
      const planKey = (
        transaction.plan_id ||
        data.metadata?.plan_id ||
        body.metadata?.plan_id ||
        data.plan_id ||
        ""
      ).toLowerCase();

      let coinsToAdd = COIN_PACKS[planKey] || 0;

      // Fallback si pack non trouvé par nom mais par montant
      if (coinsToAdd === 0 && (transaction.amount || data.amount)) {
        const amt = Number(transaction.amount || data.amount);
        if (amt >= 45000) coinsToAdd = 45000;
        else if (amt >= 15000) coinsToAdd = 16000;
        else if (amt >= 5000) coinsToAdd = 7000;
        else if (amt >= 2500) coinsToAdd = 3000;
        else if (amt >= 1000) coinsToAdd = 1000;
      }

      const targetUserId =
        transaction.user_id ||
        data.metadata?.user_id ||
        body.metadata?.user_id ||
        data.user_id ||
        body.user_id;

      if (coinsToAdd > 0 && targetUserId) {
        const { data: wallet } = await supabaseAdmin
          .from("wallets")
          .select("id, balance")
          .eq("user_id", targetUserId)
          .maybeSingle();

        let walletId = wallet?.id;

        if (wallet) {
          const newBalance = (wallet.balance || 0) + coinsToAdd;
          await supabaseAdmin
            .from("wallets")
            .update({
              balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", wallet.id);
        } else {
          // Création du wallet s'il n'existait pas
          const { data: newWallet } = await supabaseAdmin
            .from("wallets")
            .insert({
              user_id: targetUserId,
              balance: coinsToAdd,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (newWallet) {
            walletId = newWallet.id;
          }
        }

        // Journaliser la transaction de pièces dans coin_transactions de façon résiliente
        if (walletId) {
          try {
            await supabaseAdmin.from("coin_transactions").insert({
              wallet_id: walletId,
              type: "credit",
              amount: coinsToAdd,
              description: `Achat Pack Sebpay: ${transaction.plan_id || planKey || "Recharge de pièces"}`,
              metadata: {
                transaction_id: transaction.id,
                amount_fcfa: transaction.amount,
                provider: "sebpay",
                provider_reference: providerRef,
              },
              created_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.warn("[Webhook Sebpay] Note: log coin_transactions non critique:", logErr);
          }
        }

        console.log(
          `[Webhook Sebpay] Transaction ${transaction.id} validée (paid). Wallet crédité de ${coinsToAdd} pièces pour l'utilisateur ${targetUserId}.`
        );
      }

      return NextResponse.json({
        received: true,
        status: "paid",
        transaction_id: transaction.id,
        coins_credited: coinsToAdd,
      });
    }

    // 4. Paiement Échoué / Rejeté -> statut 'failed'
    else if (isFailure) {
      const providerRef =
        data.transaction_id ||
        body.transaction_id ||
        data.id ||
        body.id ||
        transaction.provider_reference ||
        txRef;

      await supabaseAdmin
        .from("transactions")
        .update({
          status: "failed",
          provider_reference: providerRef,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      console.log(`[Webhook Sebpay] Transaction ${transaction.id} marquée échouée (failed).`);

      return NextResponse.json({
        received: true,
        status: "failed",
        transaction_id: transaction.id,
      });
    }

    // Autre statut (ex: pending)
    return NextResponse.json({ received: true, status: "ignored" });
  } catch (error: any) {
    console.error("Erreur Webhook SebPay:", error);
    return NextResponse.json({ error: "Erreur Serveur Webhook" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "operational",
    service: "sebpay_webhook",
    endpoint: "/api/webhooks/sebpay",
    timestamp: new Date().toISOString(),
  });
}
