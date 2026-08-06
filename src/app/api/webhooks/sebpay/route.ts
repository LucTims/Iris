import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Utilisation du client administrateur car le webhook n'a pas de session utilisateur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // CLEF SECRETE (Service Role Bypass)
);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-sebpay-signature") || req.headers.get("x-signature");

    // NOTE: Chaque fournisseur de paiement a sa propre logique de vérification de signature.
    // L'exemple ci-dessous est le standard HMAC SHA256, à ajuster si SebPay documente un format différent.
    // Ce rejet est obligatoire : c'est le seul mécanisme qui empêche quiconque connaissant un
    // transaction_id (renvoyé au client au moment du checkout) de forger un faux paiement "réussi".
    if (!process.env.SEBPAY_SECRET_KEY) {
      console.error("SEBPAY_SECRET_KEY manquante côté serveur — webhook refusé par sécurité.");
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

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

    // Les champs typiques d'un webhook de paiement :
    // status: 'success' | 'failed'
    // transaction_id: la référence interne que nous avons envoyé
    // provider_reference: l'id chez SebPay
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

      // B. Mettre à jour le profil de l'utilisateur (passer en Pro/Studio)
      const newPlan = transaction.plan_id.replace("plan_", ""); // ex: plan_pro -> pro
      
      await supabaseAdmin
        .from("profiles")
        .update({ plan: newPlan })
        .eq("id", transaction.user_id);

      // C. Créer ou mettre à jour l'abonnement (ajout de 30 jours)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Ajoute 30 jours (recharge)

      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", transaction.user_id)
        .single();

      if (existingSub) {
        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan_id: transaction.plan_id,
            status: "active",
            current_period_end: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existingSub.id);
      } else {
        await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: transaction.user_id,
            plan_id: transaction.plan_id,
            status: "active",
            current_period_end: endDate.toISOString()
          });
      }

      console.log(`[Webhook] Paiement validé pour l'utilisateur ${transaction.user_id} (Plan: ${newPlan})`);
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
