import { createClient } from "@/lib/supabase/server";
import { COINS_PER_USD } from "@/lib/ai/pricing";

export async function checkMinimumBalance(userId: string, requiredCoins: number): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error || !wallet) {
    console.error("Error fetching wallet:", error);
    return false;
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
