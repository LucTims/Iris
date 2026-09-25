import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoinPack } from "@/lib/coinPacks";
import { creditWalletCoins } from "@/lib/payments/creditWallet";
import { normalizeLicenseKey } from "@/lib/payments/chariowApi";

/**
 * UN ACHAT = UN SEUL CRÉDIT.
 *
 * Un même achat Chariow peut être signalé par plusieurs voies, parfois
 * simultanément : les notifications `license.issued` / `license.activated`,
 * la synchronisation du tableau de bord (/api/chariow/sync) et la saisie
 * manuelle de la clé (/api/license/redeem). Chacune vérifiait l'existence
 * d'une trace PUIS créditait PUIS écrivait la trace : deux voies concurrentes
 * passaient toutes deux le contrôle et créditaient toutes deux. En production,
 * un pack Starter a ainsi été crédité 6 fois et un pack Creator 2 fois.
 *
 * Désormais, toutes les voies passent par `creditPurchaseOnce`, qui RÉSERVE
 * l'achat AVANT de créditer : une ligne est insérée dans `redeemed_licenses`,
 * dont la colonne `license_key` est UNIQUE. Postgres ne laisse qu'une seule
 * insertion réussir ; seule la voie qui l'a obtenue crédite le portefeuille
 * et journalise le paiement. Les autres constatent « déjà crédité ».
 *
 * Clé de réservation : la clé de licence (normalisée) pour les produits à
 * licence, `sale:<id de vente>` pour les anciens produits sans licence.
 */

export function licenseClaimKey(licenseKey: string): string {
  const key = normalizeLicenseKey(licenseKey);
  if (!key) throw new Error("Clé de licence vide.");
  return key;
}

export function saleClaimKey(saleId: string): string {
  const id = saleId.trim();
  if (!id) throw new Error("Identifiant de vente vide.");
  return `sale:${id}`;
}

export interface PurchaseCreditInput {
  claimKey: string;
  userId: string;
  pack: CoinPack;
  /** Voie à l'origine du crédit : pulse_webhook | sync_endpoint | manual_redeem. */
  source: string;
  description: string;
  productId?: string | null;
  chariowLicenseId?: string | null;
  /** Référence du paiement dans `transactions` (défaut : la clé de réservation). */
  providerReference?: string | null;
  /** Montant réellement payé (défaut : prix catalogue du pack). */
  paidAmount?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
}

export type PurchaseCreditOutcome =
  | { status: "credited"; coins: number; newBalance?: number }
  | { status: "already_credited"; ownerUserId: string | null; coins: number }
  | { status: "failed"; reason: string };

const UNIQUE_VIOLATION = "23505";

export async function creditPurchaseOnce(
  admin: SupabaseClient,
  input: PurchaseCreditInput
): Promise<PurchaseCreditOutcome> {
  const { claimKey, userId, pack } = input;

  // 1. RÉSERVATION ATOMIQUE de l'achat.
  const { data: claim, error: claimError } = await admin
    .from("redeemed_licenses")
    .insert({
      user_id: userId,
      license_key: claimKey,
      chariow_license_id: input.chariowLicenseId || null,
      product_id: input.productId || "unknown",
      plan_id: pack.id,
      coins_credited: pack.coins,
      source: input.source,
      metadata: input.metadata || {},
    })
    .select("id")
    .single();

  if (claimError || !claim) {
    if (claimError?.code === UNIQUE_VIOLATION) {
      const { data: existing } = await admin
        .from("redeemed_licenses")
        .select("user_id, coins_credited")
        .eq("license_key", claimKey)
        .maybeSingle();
      return {
        status: "already_credited",
        ownerUserId: existing?.user_id ?? null,
        coins: existing?.coins_credited ?? 0,
      };
    }
    console.error("[creditPurchaseOnce] Réservation impossible:", claimKey, claimError);
    return { status: "failed", reason: claimError?.message || "claim_failed" };
  }

  // 2. CRÉDIT du portefeuille — uniquement par la voie qui a obtenu la réservation.
  const credit = await creditWalletCoins(admin, userId, pack.coins, input.description, {
    ...input.metadata,
    source: input.source,
    claim_key: claimKey,
    plan_id: pack.id,
    product_id: input.productId || null,
    license_id: input.chariowLicenseId || null,
  });

  if (!credit.ok) {
    // Libère la réservation : un nouvel essai (réessai du webhook, synchro,
    // saisie manuelle) doit pouvoir créditer cet achat, jamais le perdre.
    const { error: releaseError } = await admin.from("redeemed_licenses").delete().eq("id", claim.id);
    if (releaseError) {
      console.error("[creditPurchaseOnce] Réservation non libérée après échec du crédit:", claimKey, releaseError);
    }
    return { status: "failed", reason: "wallet_credit_failed" };
  }

  // 3. JOURNAL DES PAIEMENTS — une seule ligne par achat, écrite par la même
  //    voie que le crédit (le chiffre d'affaires de l'admin n'est plus doublé).
  const paidAmount = Number(input.paidAmount);
  const { error: txError } = await admin.from("transactions").insert({
    user_id: userId,
    plan_id: pack.id,
    amount: Number.isFinite(paidAmount) && paidAmount > 0 ? Math.round(paidAmount) : pack.priceFcfa,
    currency: input.currency || "XOF",
    status: "paid",
    provider_reference: input.providerReference || claimKey,
  });
  if (txError) {
    console.warn("[creditPurchaseOnce] Journalisation du paiement non critique:", claimKey, txError);
  }

  return { status: "credited", coins: pack.coins, newBalance: credit.newBalance };
}

/**
 * Retrouve l'utilisateur Iris d'un e-mail client. Égalité exacte sur l'e-mail
 * en minuscules (`profiles.email` est la copie de l'e-mail Supabase Auth,
 * toujours en minuscules) : l'ancien `ilike` traitait « _ » et « % » comme
 * des jokers, si bien que « jean_dupont@… » pouvait désigner le compte
 * « jeanXdupont@… » et lui créditer l'achat d'un autre.
 */
export async function findUserIdByEmail(admin: SupabaseClient, email: string | null | undefined): Promise<string | null> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[findUserIdByEmail] Recherche du profil impossible:", error);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}
