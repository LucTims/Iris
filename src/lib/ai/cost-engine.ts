import { createClient } from "@/lib/supabase/server";
import {
  COINS_PER_USD,
  readUsageTokens,
  estimateTokensFromText,
} from "@/lib/ai/pricing";

export async function checkMinimumBalance(userId: string, requiredCoins: number): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error || !wallet) {
    // Table doesn't exist yet or user has no wallet row — allow generation
    // so AI features work before the billing system is fully set up.
    console.warn("Wallet check skipped (table missing or no row):", error?.message);
    return true;
  }

  return wallet.balance >= requiredCoins;
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
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  const supabase = await createClient();
  const p_amount = Math.max(1, Math.ceil(amount));

  const { error: rpcError } = await supabase.rpc("process_ai_cost", {
    p_user_id: userId,
    p_amount,
    p_description: description,
    p_metadata: { flat_rate: true, ...metadata },
  });

  if (rpcError) {
    console.error("Error deducting fixed coins:", rpcError);
    return false;
  }
  return true;
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
  opts: { projectId?: string | null; outputText?: string; inputText?: string } = {}
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
    opts.projectId ?? null
  );
}

export async function deductCost(
  userId: string,
  modelId: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  description: string,
  projectId?: string | null
): Promise<boolean> {
  // Le SDK IA peut renvoyer des compteurs de tokens indéfinis (selon le provider/la
  // version) ; on ne doit jamais laisser un NaN se propager jusqu'au RPC de débit.
  const safeInputTokens = inputTokens ?? 0;
  const safeOutputTokens = outputTokens ?? 0;

  const supabase = await createClient();

  // 1. Get model costs
  const { data: model, error: modelError } = await supabase
    .from("ai_models")
    .select("input_cost_per_1m, output_cost_per_1m")
    .eq("model_id", modelId)
    .single();

  if (modelError || !model) {
    console.error("Error fetching model costs:", modelError);
    return false;
  }

  // 2. Calculate cost in USD
  const inputCostUsd = (safeInputTokens / 1_000_000) * Number(model.input_cost_per_1m);
  const outputCostUsd = (safeOutputTokens / 1_000_000) * Number(model.output_cost_per_1m);
  const totalCostUsd = inputCostUsd + outputCostUsd;

  // 3. Convert to Coins — marge incluse. La constante vit dans @/lib/ai/pricing
  // (source unique de l'économie des pièces, ajustable x4 → x5).
  let costInCoins = Math.ceil(totalCostUsd * COINS_PER_USD);
  
  // Enforce a minimum of 1 coin if it was a very small request
  if (costInCoins < 1) costInCoins = 1;

  // 4. Deduct using RPC
  const { error: rpcError } = await supabase.rpc("process_ai_cost", {
    p_user_id: userId,
    p_amount: costInCoins,
    p_description: description,
    p_metadata: {
      model_id: modelId,
      input_tokens: safeInputTokens,
      output_tokens: safeOutputTokens,
      usd_cost: totalCostUsd,
      ...(projectId ? { project_id: projectId } : {}),
    }
  });

  if (rpcError) {
    console.error("Error deducting cost:", rpcError);
    return false;
  }

  return true;
}
