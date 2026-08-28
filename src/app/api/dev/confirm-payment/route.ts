import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { coinsForPurchase } from "@/lib/coinPacks";
import { creditWalletCoins } from "@/lib/payments/creditWallet";
import { requireAdmin } from "@/lib/admin/isAdmin";

/**
 * Confirmation MANUELLE d'un paiement — outil de support pour débloquer une
 * transaction bloquée sans attendre le webhook. STRICTEMENT réservé aux
 * administrateurs (rôle en base) : PAS de contournement NODE_ENV, PAS
 * d'auto-confirmation par l'utilisateur propriétaire de la transaction — l'un
 * et l'autre permettaient à n'importe quel compte de se créditer des pièces
 * gratuitement si NODE_ENV était mal configuré en production.
 *
 * Marque la transaction 'paid' (idempotent) puis crédite les pièces via la même
 * logique que le webhook.
 */
export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

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
