import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Agrégats RÉELS du tableau de bord admin (via le RPC get_admin_stats,
 * SECURITY DEFINER + contrôle du rôle admin à l'intérieur). Appelé avec le
 * client user-scoped pour que auth.uid() identifie l'admin.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("get_admin_stats");
    if (error) {
      const forbidden = (error.message || "").toLowerCase().includes("forbidden");
      return NextResponse.json(
        { error: forbidden ? "Accès réservé aux administrateurs." : "Erreur de chargement." },
        { status: forbidden ? 403 : 500 }
      );
    }

    // Série d'activité 14 jours (best-effort : n'échoue pas la vue si absente).
    let activity: any = [];
    try {
      const { data: act } = await supabase.rpc("get_admin_activity");
      activity = act || [];
    } catch {
      /* ignore */
    }

    return NextResponse.json({ stats: { ...(data || {}), activity_14d: activity } });
  } catch (e) {
    console.error("admin/overview error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
