import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Appelle un RPC admin (get_admin_*) avec le client user-scoped, en gérant
 * l'auth et l'erreur 'forbidden'. Retourne soit { data }, soit { error }
 * (une NextResponse prête à renvoyer).
 */
export async function callAdminRpc(name: string): Promise<{ data?: any; error?: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };

  const { data, error } = await supabase.rpc(name);
  if (error) {
    const forbidden = (error.message || "").toLowerCase().includes("forbidden");
    return {
      error: NextResponse.json(
        { error: forbidden ? "Accès réservé aux administrateurs." : "Erreur de chargement." },
        { status: forbidden ? 403 : 500 }
      ),
    };
  }
  return { data };
}
