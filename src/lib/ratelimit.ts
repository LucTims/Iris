import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RateLimitInfo = {
  count: number;
  resetTime: number;
};

/**
 * Rate limiting distribué (table Postgres + RPC atomique `check_rate_limit`),
 * remplace l'ancien Map en mémoire. Un Map process-local ne protège plus rien
 * dès que l'app tourne sur plusieurs instances serverless (Vercel) : chaque
 * instance avait son propre compteur, donc la vraie limite effective était
 * "limite × nombre d'instances actives", pas la limite affichée.
 *
 * Utilise un client service-role dédié : le RPC `check_rate_limit` est
 * volontairement réservé au service_role côté SQL (REVOKE FROM PUBLIC), pour
 * qu'un utilisateur authentifié ne puisse pas l'appeler directement avec la
 * clé d'un AUTRE utilisateur et polluer son compteur (déni de service ciblé).
 */
let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return adminClient;
}

/**
 * Vérifie si un identifiant a dépassé sa limite de requêtes.
 * @param identifier L'identifiant unique (ex: ID utilisateur ou Adresse IP)
 * @param limit Nombre maximum de requêtes autorisées
 * @param windowMs Fenêtre de temps en millisecondes
 * @returns { success: boolean, count: number, resetTime: number }
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; count: number; resetTime: number }> {
  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));

  const { data, error } = await getAdminClient().rpc("check_rate_limit", {
    p_key: identifier,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail-open délibéré ICI (contrairement à la facturation) : une panne du
    // rate limiter ne doit pas bloquer complètement l'application pour tous
    // les utilisateurs. Le coût réel (pièces) reste vérifié séparément par
    // checkMinimumBalance, qui lui est fail-closed.
    console.error("[ratelimit] check_rate_limit indisponible, on laisse passer:", error.message);
    return { success: true, count: 0, resetTime: Date.now() + windowMs };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    success: !!row?.allowed,
    count: Number(row?.current_count) || 0,
    resetTime: row?.reset_at ? new Date(row.reset_at as string).getTime() : Date.now() + windowMs,
  };
}
