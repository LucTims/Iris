import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Crédite des pièces sur le wallet d'un utilisateur (crée le wallet si besoin)
 * et journalise l'opération dans coin_transactions. Utilisé après un paiement
 * confirmé — par les webhooks SEBPay/Chariow et par l'endpoint de confirmation
 * admin.
 *
 * Passe par le RPC atomique `credit_wallet_coins` (verrouillage FOR UPDATE côté
 * SQL) plutôt qu'un lire-puis-écrire côté application : deux crédits
 * concurrents (ex. un webhook rejoué pendant qu'un autre est en cours de
 * traitement) ne peuvent plus s'écraser l'un l'autre.
 *
 * Doit recevoir un client Supabase ADMIN (service role) : le RPC est réservé
 * au service_role côté base.
 */
export async function creditWalletCoins(
  admin: SupabaseClient,
  userId: string,
  coins: number,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<{ ok: boolean; newBalance?: number }> {
  if (!userId || !coins || coins <= 0) return { ok: false };

  const { data: newBalance, error } = await admin.rpc("credit_wallet_coins", {
    p_user_id: userId,
    p_amount: Math.floor(coins),
    p_description: description,
    p_metadata: metadata,
  });

  if (error) {
    console.error("[creditWalletCoins] échec du crédit atomique:", error);
    return { ok: false };
  }

  return { ok: true, newBalance: newBalance ?? undefined };
}
