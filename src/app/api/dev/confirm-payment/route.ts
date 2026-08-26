import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { coinsForPurchase } from "@/lib/coinPacks";
import { creditWalletCoins } from "@/lib/payments/creditWallet";

/**
 * Confirmation MANUELLE d'un paiement — pour TESTER la boucle achat → crédit
 * sans passer par un vrai paiement SEBPay. Réservé au développement OU aux
 * administrateurs (jamais un utilisateur lambda en production).
 *
 * Marque la transaction 'paid' (idempotent) puis crédite les pièces via la même
 * logique que le webhook.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = profile?.role === "admin";
    const isDev = process.env.NODE_ENV !== "production";

    if (!isDev && !isAdmin) {
      return NextResponse.json({ error: "Réservé au développement ou aux administrateurs." }, { status: 403 });
    }

    const { transactionId } = await req.json();
    if (!transactionId) {
      return NextResponse.json({ error: "transactionId requis" }, { status: 400 });
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tx } = await admin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }
    // Un non-admin ne peut confirmer que SA propre transaction (test dev).
    if (!isAdmin && tx.user_id !== user.id) {
      return NextResponse.json({ error: "Transaction non autorisée" }, { status: 403 });
    }
    if (tx.status === "paid") {
      return NextResponse.json({ status: "already_processed", coins_credited: 0 });
    }

    await admin
      .from("transactions")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", tx.id);

    const coins = coinsForPurchase(tx.plan_id, tx.amount);
    if (coins > 0 && tx.user_id) {
      await creditWalletCoins(admin, tx.user_id, coins, `Confirmation test : ${tx.plan_id || "Recharge"}`, {
        transaction_id: tx.id,
        provider: "manual_test",
        amount_fcfa: tx.amount,
      });
    }

    return NextResponse.json({ status: "paid", coins_credited: coins });
  } catch (error) {
    console.error("Erreur confirm-payment (test):", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
