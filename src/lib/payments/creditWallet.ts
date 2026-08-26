import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Crédite des pièces sur le wallet d'un utilisateur (crée le wallet si besoin)
 * et journalise l'opération dans coin_transactions. Utilisé après un paiement
 * confirmé — par le webhook SEBPay et par l'endpoint de test (dev).
 *
 * Doit recevoir un client Supabase ADMIN (service role) car il écrit sur des
 * lignes qui ne sont pas protégées en écriture par RLS pour l'utilisateur.
 */
export async function creditWalletCoins(
  admin: SupabaseClient,
  userId: string,
  coins: number,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<{ ok: boolean; newBalance?: number }> {
  if (!userId || !coins || coins <= 0) return { ok: false };

  const { data: wallet } = await admin
    .from("wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .maybeSingle();

  let walletId = wallet?.id as string | undefined;
  let newBalance: number | undefined;

  if (wallet) {
    newBalance = (wallet.balance || 0) + coins;
    await admin
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", wallet.id);
  } else {
    newBalance = coins;
    const { data: created } = await admin
      .from("wallets")
      .insert({ user_id: userId, balance: coins })
      .select("id")
      .single();
    walletId = created?.id;
  }

  if (walletId) {
    try {
      await admin.from("coin_transactions").insert({
        wallet_id: walletId,
        type: "credit",
        amount: coins,
        description,
        metadata,
      });
    } catch (logErr) {
      console.warn("[creditWalletCoins] log coin_transactions non critique:", logErr);
    }
  }

  return { ok: true, newBalance };
}
