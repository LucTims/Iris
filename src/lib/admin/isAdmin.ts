import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
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
