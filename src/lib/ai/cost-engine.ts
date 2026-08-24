import { createClient } from "@/lib/supabase/server";

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

export async function deductCost(
  userId: string,
  modelId: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  description: string
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

  // 3. Convert to Coins (Ratio x4 margin, 1 coin = $0.00165)
  // Therefore: Virtual Cost = totalCostUsd * 4
  // Cost in Coins = Virtual Cost / 0.00165
  // Cost in Coins = totalCostUsd * 4 / (1.65 / 1000) = totalCostUsd * 2424.24
  // We round to 2500 for simplicity and safer margin.
  const USD_TO_COINS_WITH_MARGIN = 2500;
  
  let costInCoins = Math.ceil(totalCostUsd * USD_TO_COINS_WITH_MARGIN);
  
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
      usd_cost: totalCostUsd
    }
  });

  if (rpcError) {
    console.error("Error deducting cost:", rpcError);
    return false;
  }

  return true;
}
