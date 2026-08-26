import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPackById, CoinPack } from "@/lib/coinPacks";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("Reçu un Webhook (Pulse) de Chariow:", JSON.stringify(payload, null, 2));

    // Adapt to Chariow's exact payload structure (they usually nest data in 'data' or send it flat)
    const data = payload.data || payload;
    
    // We need to identify the user. 
    // We passed client_reference_id in the checkout link, and email. 
    // Chariow might store this in custom_data, client_reference_id, or just the customer email.
    const customerEmail = data.customer?.email || data.email;
    const clientReferenceId = data.client_reference_id || data.custom_data?.client_reference_id;

    // Identify the product/pack
    // The product ID (e.g. prd_waqgpzhy)
    const productId = data.product_id || data.product?.id;
    
    let planId = "";
    if (productId === "prd_waqgpzhy") planId = "starter";
    if (productId === "prd_jvzz32pf") planId = "creator";
    if (productId === "prd_yekmrhdn") planId = "author";

    // If we couldn't map the product ID, fallback to amount or name if needed, but product ID is best.
    if (!planId) {
      console.error("Produit inconnu dans le Webhook Chariow:", productId);
      return NextResponse.json({ success: true, message: "Produit ignoré" });
    }

    const pack = getPackById(planId);
    if (!pack) {
      return NextResponse.json({ success: true, message: "Pack inconnu" });
    }

    // Find the user in our database
    let userId = clientReferenceId;
    
    if (!userId && customerEmail) {
      // Try to find user by email
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      if (!userError && users.users) {
        const foundUser = users.users.find(u => u.email === customerEmail);
        if (foundUser) {
          userId = foundUser.id;
        }
      }
    }

    if (!userId) {
      console.error("Impossible de trouver l'utilisateur pour le paiement Chariow. Email:", customerEmail);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 400 });
    }

    // Add coins to user wallet
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    let newBalance = pack.coins;
    if (!walletError && walletData) {
      newBalance = walletData.balance + pack.coins;
      await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('wallets')
        .insert({ user_id: userId, balance: newBalance });
    }

    // Log the transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: pack.price,
        currency: "XOF",
        status: "paid",
        payment_method: "chariow",
        external_reference: data.id || `chariow_${Date.now()}`
      });

    console.log(`✅ Succès: ${pack.coins} pièces créditées à l'utilisateur ${userId}`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur Webhook Chariow:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
