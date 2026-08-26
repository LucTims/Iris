import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPackById } from "@/lib/coinPacks";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { planId, phone, operator, country, otpCode } = await req.json();

    if (!planId || !phone || !operator || !country) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Le montant est TOUJOURS déterminé côté serveur d'après le pack (anti-fraude) :
    // on n'accorde jamais confiance à un montant envoyé par le client.
    const pack = getPackById(planId);
    if (!pack) {
      return NextResponse.json({ error: "Pack inconnu" }, { status: 400 });
    }
    const amount = pack.priceFcfa;

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Créer une transaction en base de données (statut "pending")
    const { data: transaction, error: dbError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: amount,
        currency: "XOF",
        status: "pending"
      })
      .select("id")
      .single();

    if (dbError || !transaction) {
      console.error("Erreur création transaction:", dbError);
      return NextResponse.json({ error: "Erreur lors de l'initialisation du paiement" }, { status: 500 });
    }

    const transactionId = transaction.id;

    // 2. Appel à l'API de SebPay
    const sebpayEndpoint = "https://newapi.sebpay.bj/api/v1/collections";
    
    // Construction de l'URL de retour (callback)
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const baseUrl = `${protocol}://${host}`;

    const sebpayPayload: any = {
      amount: amount,
      currency: "XOF",
      phone: phone,
      country: country,
      operator: operator,
      external_reference: transactionId,
      return_url: `${baseUrl}/pricing/success?simulated_tx=${transactionId}`,
      callback_url: `${baseUrl}/api/webhooks/sebpay`,
      metadata: { order_id: transactionId, user_id: user.id }
    };
    if (otpCode) sebpayPayload.otp_code = otpCode;

    const sebpayResponse = await fetch(sebpayEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Public-Key": process.env.NEXT_PUBLIC_SEBPAY_PUBLIC_KEY || "",
        "X-Secret-Key": process.env.SEBPAY_SECRET_KEY || ""
      },
      body: JSON.stringify(sebpayPayload)
    });

    if (!sebpayResponse.ok) {
      const errorData = await sebpayResponse.text();
      console.error("Erreur API SebPay:", errorData);
      
      // Fallback pour le développement si l'API SebPay n'est pas encore active
      if (process.env.NODE_ENV === "development") {
        console.warn("Utilisation d'un lien de paiement simulé (DEV uniquement)");
        return NextResponse.json({ 
          url: `${baseUrl}/pricing/success?simulated_tx=${transactionId}` 
        });
      }

      return NextResponse.json({ error: "Erreur avec le fournisseur de paiement SebPay" }, { status: 500 });
    }

    const data = await sebpayResponse.json();

    // 3. Renvoyer l'URL de paiement au client
    // SebPay renvoie l'URL dans data.checkout_url, data.paymentUrl ou data.url
    const paymentUrl = data.checkout_url || data.paymentUrl || data.url || data.link || `${baseUrl}/pricing/success?simulated_tx=${transactionId}`;

    if (!paymentUrl) {
      return NextResponse.json({ error: "Format de réponse SebPay invalide" }, { status: 500 });
    }

    return NextResponse.json({ url: paymentUrl });

  } catch (error: any) {
    console.error("Erreur globale checkout:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
