import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/isAdmin";

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const adminClient = getAdminClient();

    // Comptages exacts (head: true = très rapide)
    const [
      { count: usersCount },
      { count: projectsCount },
      { count: aiActionsCount },
      { data: paidTx }
    ] = await Promise.all([
      adminClient.from("profiles").select("id", { count: "exact", head: true }),
      adminClient.from("projects").select("id", { count: "exact", head: true }),
      adminClient.from("ai_usage").select("id", { count: "exact", head: true }),
      adminClient.from("transactions").select("amount").eq("status", "paid")
    ]);

    const total_revenue = paidTx?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    // Activité des 14 derniers jours (revenus + inscriptions par jour)
    const now = new Date();
    const days14ago = new Date(now);
    days14ago.setDate(days14ago.getDate() - 14);
    const since = days14ago.toISOString();

    // Récupérer les transactions payées et les profils créés ces 14 derniers jours
    const [{ data: recentTx }, { data: recentProfiles }] = await Promise.all([
      adminClient
        .from("transactions")
        .select("amount, created_at")
        .eq("status", "paid")
        .gte("created_at", since)
        .order("created_at", { ascending: true }),
      adminClient
        .from("profiles")
        .select("created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
    ]);

    // Agréger par jour
    const dayMap: Record<string, { revenue: number; signups: number }> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - 13 + i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { revenue: 0, signups: 0 };
    }

    for (const tx of recentTx || []) {
      const day = (tx.created_at || "").slice(0, 10);
      if (dayMap[day]) dayMap[day].revenue += Number(tx.amount) || 0;
    }

    for (const p of recentProfiles || []) {
      const day = (p.created_at || "").slice(0, 10);
      if (dayMap[day]) dayMap[day].signups += 1;
    }

    const activity_14d = Object.entries(dayMap).map(([day, v]) => ({
      day,
      revenue: v.revenue,
      signups: v.signups
    }));

    return NextResponse.json({
      stats: {
        users_count: usersCount || 0,
        projects_count: projectsCount || 0,
        total_ai_actions: aiActionsCount || 0,
        total_revenue,
        activity_14d
      }
    });
  } catch (e) {
    console.error("admin/overview error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}