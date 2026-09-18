import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Vérification admin CENTRALISÉE — seule source de vérité : profiles.role.
 *
 * Remplace les anciens contournements "user.email === '...'" dupliqués (et
 * divergents) dans chaque route admin : un compte listé en dur dans le code
 * source est un backdoor, pas un contrôle d'accès. Le rôle admin se gère
 * exclusivement en base (colonne profiles.role), cohérent avec les RPC SQL
 * (is_current_admin()).
 */
export async function requireAdmin(): Promise<
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 }),
    };
  }

  return { ok: true, user, supabase };
}

export function getAdminClient(): SupabaseClient {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getAuthUsersMap(
  adminClient?: SupabaseClient
): Promise<Record<string, { email: string; created_at?: string }>> {
  const admin = adminClient || getAdminClient();
  const map: Record<string, { email: string; created_at?: string }> = {};
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users || data.users.length === 0) break;
    for (const u of data.users) {
      map[u.id] = {
        email: u.email || "",
        created_at: u.created_at,
      };
    }
    if (data.users.length < 1000) break;
    page++;
  }
  return map;
}
