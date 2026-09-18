import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sha256Hex } from "./hash";

/**
 * Client admin dédié au serveur MCP : la vérification de clé API doit
 * fonctionner sans session Supabase Auth (l'appelant est un LLM externe,
 * pas un navigateur avec des cookies), donc on passe par service_role et on
 * filtre nous-mêmes par user_id dans chaque outil.
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

export type McpAuthContext = {
  userId: string;
  apiKeyId: string;
};

/**
 * Extrait la clé API de la requête : header `Authorization: Bearer <clé>`
 * (préféré, ne fuite pas dans les logs d'URL) avec repli sur `?key=` en
 * paramètre de requête, nécessaire pour les clients qui ne permettent de
 * coller qu'une seule URL sans en-têtes personnalisés.
 */
function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");
  return queryKey && queryKey.length > 0 ? queryKey : null;
}

/**
 * Valide la clé API de la requête contre `public.api_keys` et renvoie
 * l'utilisateur propriétaire. Retourne `null` si la clé est absente,
 * inconnue ou désactivée — c'était un simple TODO jamais implémenté
 * auparavant, ce qui laissait le serveur MCP entièrement ouvert.
 *
 * Seul le hash SHA-256 de la clé est stocké en base (voir migration
 * 20260918120000_hash_api_keys) : on hashe la clé reçue et on compare les
 * hash, jamais la valeur en clair.
 */
export async function resolveApiKeyUser(request: Request): Promise<McpAuthContext | null> {
  const key = extractApiKey(request);
  if (!key) return null;

  const keyHash = await sha256Hex(key);
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, is_active")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // Fire-and-forget : ne bloque pas la réponse au LLM pour cette mise à jour.
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return { userId: data.user_id as string, apiKeyId: data.id as string };
}
