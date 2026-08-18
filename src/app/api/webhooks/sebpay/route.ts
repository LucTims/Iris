import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Utilisation du client administrateur car le webhook n'a pas de session utilisateur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // CLEF SECRETE (Service Role Bypass)
);

// Map des packs de pièces
const COIN_PACKS: Record<string, number> = {
  pack_starter: 1000,
  pack_creator: 3000,
  pack_author: 7000,
  pack_pro: 16000,
  pack_studio: 45000,
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-sebpay-signature") || req.headers.get("x-signature");

    if (!process.env.SEBPAY_SECRET_KEY) {
      console.error("SEBPAY_SECRET_KEY manquante côté serveur — webhook refusé par sécurité.");
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

    // Sebpay Webhook Signature Verification (HMAC-SHA256)
    const expectedSignature = crypto
      .createHmac("sha256", process.env.SEBPAY_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const signatureBuffer = signature ? Buffer.from(signature, "hex") : null;

    const isValidSignature =
      !!signatureBuffer &&
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValidSignature) {
      console.warn("Signature invalide ou manquante reçue sur le webhook SebPay — requête rejetée.");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    const transactionId = body.transaction_id || body.reference;
    const status = body.status; // ex: "success", "paid", "completed"

    if (!transactionId) {
      return NextResponse.json({ error: "transaction_id manquant" }, { status: 400 });
    }

    // 1. Récupérer la transaction en base de données
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // Si la transaction est déjà traitée, on ignore
    if (transaction.status === "success") {
      return NextResponse.json({ received: true, status: "already_processed" });
    }

    // 2. Si le paiement est réussi
    if (status === "success" || status === "paid" || status === "completed") {
      
      // A. Mettre à jour la transaction
      await supabaseAdmin
        .from("transactions")
        .update({ 
          status: "success", 
          provider_reference: body.provider_reference || body.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", transactionId);

      // B. Créditer le wallet de l'utilisateur
      const coinsToAdd = COIN_PACKS[transaction.plan_id] || 0;
      
      if (coinsToAdd > 0) {
        // Fetch current balance
        const { data: wallet } = await supabaseAdmin
          .from("wallets")
          .select("id, balance")
          .eq("user_id", transaction.user_id)
          .single();

        if (wallet) {
          // Add coins
          const newBalance = wallet.balance + coinsToAdd;
          await supabaseAdmin
            .from("wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", wallet.id);

          // Log transaction
          await supabaseAdmin
            .from("coin_transactions")
            .insert({
              wallet_id: wallet.id,
              type: 'credit',
              amount: coinsToAdd,
              description: `Achat Pack Sebpay: ${transaction.plan_id}`,
            });
            
          console.log(`[Webhook] Wallet crédité de ${coinsToAdd} pièces pour l'utilisateur ${transaction.user_id}`);
        } else {
          // If wallet doesn't exist for some reason, create it
          const { data: newWallet } = await supabaseAdmin
            .from("wallets")
            .insert({ user_id: transaction.user_id, balance: coinsToAdd })
            .select()
            .single();
            
          if (newWallet) {
            await supabaseAdmin
              .from("coin_transactions")
              .insert({
                wallet_id: newWallet.id,
                type: 'credit',
                amount: coinsToAdd,
                description: `Achat Pack Sebpay: ${transaction.plan_id}`,
              });
          }
        }
      }

      return NextResponse.json({ received: true, status: "success" });
    } 
    
    // 3. Si le paiement est échoué/annulé
    else if (status === "failed" || status === "canceled") {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", transactionId);
        
      return NextResponse.json({ received: true, status: "failed" });
    }

    return NextResponse.json({ received: true, status: "ignored" });

  } catch (error) {
    console.error("Erreur Webhook SebPay:", error);
    return NextResponse.json({ error: "Erreur Serveur Webhook" }, { status: 500 });
  }
}
