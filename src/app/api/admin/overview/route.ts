import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/isAdmin";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { supabase } = guard;

    // Use Service Role to bypass RLS for admin counts
    const adminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch exact counts directly (Very fast because of head: true)
    const [
      { count: usersCount },
      { count: projectsCount },
      { count: aiActionsCount },
      { data: transactions }
    ] = await Promise.all([
      adminClient.from('profiles').select('id', { count: 'exact', head: true }),
      adminClient.from('projects').select('id', { count: 'exact', head: true }),
      adminClient.from('ai_usage').select('id', { count: 'exact', head: true }),
      adminClient.from('transactions').select('amount').eq('status', 'paid')
    ]);

    const total_revenue = transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    let activity: any = [];
    try {
      // Activity uses RPC, we can use the regular authenticated client since it has SECURITY DEFINER
      const { data: act } = await supabase.rpc("get_admin_activity");
      activity = act || [];
    } catch {
      // Ignore if RPC missing
    }

    return NextResponse.json({ 
      stats: { 
        users_count: usersCount || 0,
        projects_count: projectsCount || 0,
        total_ai_actions: aiActionsCount || 0,
        total_revenue: total_revenue,
        activity_14d: activity 
      } 
    });
  } catch (e) {
    console.error("admin/overview error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}