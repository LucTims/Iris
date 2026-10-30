import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COINS_PER_USD,
  readUsageTokens,
  estimateTokensFromText,
  coinsPerPage,
  chapterChargeCoins,
  canonicalModelId,
  ratesForModel,
  MIN_AI_CALL_COINS,
} from "@/lib/ai/pricing";

/**
 * Toutes les fonctions ci-dessous acceptent un client Supabase optionnel
 * (`client`), par défaut le client lié à la session utilisateur courante
 * (cookies). Le job de génération de livre en arrière-plan (pas de session
 * HTTP/cookies, appelé serveur-à-serveur) leur passe explicitement un client
 * service-role à la place — `process_ai_cost` accepte les deux (voir
 * migration wallet_security_rpcs : authenticated débite son propre wallet,
 * service_role peut débiter n'importe quel utilisateur).
 */

/**
 * Solde du portefeuille, ou `null` si la lecture échoue (timeout, table
 * indisponible, wallet absent…). Permet aux routes de distinguer « solde
 * insuffisant » (402, avec le montant manquant) d'un incident technique
 * (« réessayez ») — deux situations que `checkMinimumBalance` confond.
 */
export async function getWalletBalance(
  userId: string,
  client?: SupabaseClient
): Promise<number | null> {
  const supabase = client ?? (await createClient());

  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error || !wallet) {
    console.error("Lecture du portefeuille impossible:", error?.message);
    return null;
  }
  return Number(wallet.balance) || 0;
}

export async function checkMinimumBalance(
  userId: string,
  requiredCoins: number,
  client?: SupabaseClient
): Promise<boolean> {
  const balance = await getWalletBalance(userId, client);

  // Fail CLOSED : une erreur DB (timeout, table indisponible, wallet absent...)
  // ne doit jamais se traduire par une génération gratuite. Un incident
  // d'infra doit produire un message "réessayez", pas une fuite de facturation.
  if (balance === null) {
    console.error("Wallet check failed — generation refusée par sécurité");
    return false;
  }

  return balance >= requiredCoins;
}

/** Montant de pièces lisible (« 1 692 »). */
export function formatCoins(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}

/**
 * Débite un montant FIXE de pièces (indépendant des tokens). Utilisé pour des
 * actions au tarif forfaitaire, comme l'analyse d'un document (20 pièces).
 * Réutilise le même RPC `process_ai_cost` que la facturation au token.
 */
export async function deductFixedCoins(
  userId: string,
  amount: number,
  description: string,
  metadata: Record<string, unknown> = {},
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = client ?? (await createClient());
  const p_amount = Math.max(1, Math.ceil(amount));

  const { error: rpcError } = await supabase.rpc("process_ai_cost", {
    p_user_id: userId,
    p_amount,
    p_description: description,
    p_metadata: { flat_rate: true, ...metadata },
  });

  if (rpcError) {
    console.error("Error deducting fixed coins:", rpcError);
    const drained = await drainOnInsufficientFunds(supabase, userId, p_amount, description, rpcError.message, metadata);
    await traceBillingFailure(supabase, userId, p_amount, description, rpcError.message, {
      ...metadata,
      drained_coins: drained,
    });
    return false;
  }
  return true;
}

/**
 * Le contenu est DÉJÀ produit (et payé au fournisseur) quand le débit échoue
 * pour solde insuffisant — typiquement plusieurs générations lancées en
 * parallèle qui passent toutes la vérification de solde. Plutôt que de livrer
 * gratuitement, on prélève ce qui reste sur le wallet (jusqu'au montant dû).
 * Le reliquat impayé reste tracé dans `ai_usage` (billing_failed).
 *
 * Renvoie le nombre de pièces effectivement prélevées (0 si rien).
 */
async function drainOnInsufficientFunds(
  supabase: SupabaseClient,
  userId: string,
  amountDue: number,
  description: string,
  reason: string,
  metadata: Record<string, unknown>
): Promise<number> {
  if (!/insufficient funds/i.test(reason)) return 0;
  try {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();
    const remaining = Math.min(Math.floor(Number(wallet?.balance) || 0), amountDue);
    if (remaining <= 0) return 0;
    const { error } = await supabase.rpc("process_ai_cost", {
      p_user_id: userId,
      p_amount: remaining,
      p_description: `${description} (solde insuffisant — prélèvement partiel)`,
      p_metadata: { ...metadata, partial: true, amount_due: amountDue },
    });
    return error ? 0 : remaining;
  } catch {
    return 0;
  }
}

/**
 * Journalise un débit qui a ÉCHOUÉ, dans `ai_usage`.
 *
 * Un échec de facturation signifie qu'un contenu a été produit — et donc payé
 * à un fournisseur d'IA — sans être facturé à l'auteur. C'est une fuite de
 * revenu directe. Elle n'apparaissait jusqu'ici que dans les journaux de la
 * plateforme d'hébergement, qui expirent au bout de quelques jours et que
 * personne ne relit. En la traçant en base, elle devient auditable
 * (`select * from ai_usage where action = 'billing_failed'`) et le solde
 * concerné peut être régularisé.
 *
 * Volontairement tolérante aux erreurs : l'échec de la trace ne doit jamais
 * masquer l'échec de facturation qu'elle documente.
 */
async function traceBillingFailure(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  description: string,
  reason: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("ai_usage").insert({
      user_id: userId,
      project_id: (metadata.project_id as string) || null,
      action: "billing_failed",
      model: `${amount} pièces | ${description} | ${reason}`.slice(0, 300),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Débite le coût d'un CHAPITRE de livre à la PAGE (tarification à la valeur) :
 * pages rédigées × tarif/page du modèle (20/30/50…) — le prix annoncé à
 * l'auteur. Voir `chapterChargeCoins` pour le garde-fou coût réel.
 */
export async function deductChapterCost(
  userId: string,
  modelId: string,
  usage: unknown,
  description: string,
  opts: { projectId?: string | null; outputText?: string; client?: SupabaseClient; quotedCoins?: number } = {}
): Promise<boolean> {
  const { amount, pages, pageCoins, costFloorCoins } = chapterChargeCoins(
    modelId,
    usage,
    opts.outputText,
    opts.quotedCoins
  );

  return deductFixedCoins(
    userId,
    amount,
    description,
    {
      model_id: modelId,
      pages,
      coins_per_page: coinsPerPage(modelId),
      page_coins: pageCoins,
      cost_floor_coins: costFloorCoins,
      ...(opts.quotedCoins ? { quoted_coins: opts.quotedCoins } : {}),
      ...(opts.projectId ? { project_id: opts.projectId } : {}),
    },
    opts.client
  );
}

/**
 * Débite le coût d'une génération à partir de l'objet `usage` du SDK IA.
 *
 * C'est le point d'entrée à privilégier depuis les routes : il est tolérant au
 * nommage des champs (input/output vs prompt/completion — voir `readUsageTokens`)
 * et, en DERNIER RECOURS, estime les tokens de SORTIE depuis le texte réellement
 * produit (`outputText`). Ainsi, si un provider ne renvoie pas d'usage fiable,
 * on facture quand même un montant réaliste au lieu du plancher de 1 pièce —
 * ce qui évite la sous-facturation qui a laissé passer un livre entier pour ~10
 * pièces.
 */
export async function deductGenerationCost(
  userId: string,
  modelId: string,
  usage: unknown,
  description: string,
  opts: {
    projectId?: string | null;
    outputText?: string;
    inputText?: string;
    client?: SupabaseClient;
    /** Plafond (option A) : jamais plus que ce montant, vérifié avant génération. */
    maxCoins?: number;
  } = {}
): Promise<boolean> {
  const { input, output } = readUsageTokens(usage);

  let effInput = input;
  let effOutput = output;

  if (effOutput <= 0 && opts.outputText) {
    effOutput = estimateTokensFromText(opts.outputText);
  }
  if (effInput <= 0 && opts.inputText) {
    effInput = estimateTokensFromText(opts.inputText);
  }

  // Trace visible quand on a dû retomber sur l'estimation : signale un provider
  // dont l'usage n'est pas exploitable (à surveiller côté facturation).
  if ((input <= 0 || output <= 0) && (effInput > 0 || effOutput > 0)) {
    console.warn(
      `[cost-engine] usage tokens manquants pour ${modelId} — repli sur estimation ` +
        `(in ${input}→${effInput}, out ${output}→${effOutput}) : ${description}`
    );
  }

  return deductCost(
    userId,
    modelId,
    effInput,
    effOutput,
    description,
    opts.projectId ?? null,
    opts.client,
    opts.maxCoins
  );
}

export async function deductCost(
  userId: string,
  modelId: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  description: string,
  projectId?: string | null,
  client?: SupabaseClient,
  maxCoins?: number
): Promise<boolean> {
  // Le SDK IA peut renvoyer des compteurs de tokens indéfinis (selon le provider/la
  // version) ; on ne doit jamais laisser un NaN se propager jusqu'au RPC de débit.
  const safeInputTokens = inputTokens ?? 0;
  const safeOutputTokens = outputTokens ?? 0;

  const supabase = client ?? (await createClient());

  // Toujours facturer le modèle RÉELLEMENT appelé (même routage que getAiModel).
  const billedModel = canonicalModelId(modelId);

  // 1. Tarifs du modèle : la table `ai_models` fait foi ; à défaut, les tarifs
  //    de référence du code. Avant, une ligne manquante (cas du modèle par
  //    défaut gemini-3.6-flash) faisait ABANDONNER le débit sans aucune trace :
  //    tout l'assistant IA de l'éditeur était gratuit.
  let inRate: number;
  let outRate: number;
  const { data: model } = await supabase
    .from("ai_models")
    .select("input_cost_per_1m, output_cost_per_1m")
    .eq("model_id", billedModel)
    .maybeSingle();

  if (model) {
    inRate = Number(model.input_cost_per_1m);
    outRate = Number(model.output_cost_per_1m);
  } else {
    const fallback = ratesForModel(billedModel);
    inRate = fallback.in;
    outRate = fallback.out;
    console.warn(`[cost-engine] ${billedModel} absent de ai_models — tarif de référence utilisé`);
  }

  // 2. Calculate cost in USD
  const inputCostUsd = (safeInputTokens / 1_000_000) * inRate;
  const outputCostUsd = (safeOutputTokens / 1_000_000) * outRate;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  // 3. Conversion en pièces — marge incluse (COINS_PER_USD, @/lib/ai/pricing),
  //    avec un plancher par appel : aucune génération ne coûte ~0.
  let costInCoins = Math.max(MIN_AI_CALL_COINS, Math.ceil(totalCostUsd * COINS_PER_USD));
  if (maxCoins && maxCoins > 0) costInCoins = Math.min(costInCoins, maxCoins);

  const metadata = {
    model_id: billedModel,
    ...(billedModel !== modelId ? { requested_model: modelId } : {}),
    input_tokens: safeInputTokens,
    output_tokens: safeOutputTokens,
    usd_cost: totalCostUsd,
    ...(projectId ? { project_id: projectId } : {}),
  };

  // 4. Deduct using RPC
  const { error: rpcError } = await supabase.rpc("process_ai_cost", {
    p_user_id: userId,
    p_amount: costInCoins,
    p_description: description,
    p_metadata: metadata,
  });

  if (rpcError) {
    console.error("Error deducting cost:", rpcError);
    const drained = await drainOnInsufficientFunds(supabase, userId, costInCoins, description, rpcError.message, metadata);
    await traceBillingFailure(supabase, userId, costInCoins, description, rpcError.message, {
      project_id: projectId,
      drained_coins: drained,
    });
    return false;
  }

  return true;
}
