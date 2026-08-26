import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Verify admin status
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && user.email !== 'www.martau@gmail.com') {
      return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // Fetch exact counts directly (Very fast because of head: true)
    const [
      { count: usersCount },
      { count: projectsCount },
      { count: aiActionsCount },
      { data: transactions }
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('ai_usage').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount').eq('status', 'paid')
    ]);

    const total_revenue = transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    let activity: any = [];
    try {
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