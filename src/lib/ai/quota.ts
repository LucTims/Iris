import type { SupabaseClient } from "@supabase/supabase-js";

// Plafonds provisoires par nombre de générations (et non par mot) — un système de
// quota basé sur les mots/tokens réellement consommés est prévu séparément (Phase 5
// de la feuille de route). Les plans payants ont ici un plafond haut, pas "illimité",
// pour éviter qu'un seul compte au forfait le moins cher ne consomme un budget IA
// disproportionné.
const PLAN_MONTHLY_LIMITS: Record<string, number> = {
  free: 50,
  standard: 300,
  pro: 1000,
  studio: 5000,
};

export type QuotaCheck = {
  allowed: boolean;
  used: number;
  limit: number | null;
};

/**
 * Vérifie le quota mensuel d'un utilisateur en comptant ses lignes `ai_usage`
 * depuis le premier jour du mois en cours (et non depuis la création du compte).
 */
export async function checkMonthlyQuota(
  supabase: SupabaseClient,
  userId: string,
  plan: string | null | undefined,
  role: string | null | undefined
): Promise<QuotaCheck> {
  if (role === "admin") {
    return { allowed: true, used: 0, limit: null };
  }

  const limit = PLAN_MONTHLY_LIMITS[plan || "free"] ?? PLAN_MONTHLY_LIMITS.free;

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  const used = count || 0;
  return { allowed: used < limit, used, limit };
}
