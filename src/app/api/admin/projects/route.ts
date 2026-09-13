import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/isAdmin";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const admin = getAdminClient();

    // Récupérer tous les projets avec le nombre de chapitres
    const { data: rawProjects, error } = await admin
      .from("projects")
      .select("id, user_id, title, status, word_count, updated_at, created_at, chapters(count)")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    // Récupérer les profils pour joindre le nom/email de l'auteur
    const userIds = [...new Set((rawProjects || []).map((p) => p.user_id).filter(Boolean))];
    let profilesMap: Record<string, { full_name?: string; email?: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      for (const p of profiles || []) {
        profilesMap[p.id] = { full_name: p.full_name, email: p.email };
      }
    }

    // Calculer les pièces dépensées par projet via coin_transactions
    let projectCoinsMap: Record<string, number> = {};
    try {
      const { data: wallets } = await admin.from("wallets").select("id, user_id");
      const walletIds = (wallets || []).map((w) => w.id);

      if (walletIds.length > 0) {
        const { data: debits } = await admin
          .from("coin_transactions")
          .select("amount, metadata")
          .eq("type", "debit")
          .in("wallet_id", walletIds);

        for (const d of debits || []) {
          const pid = (d.metadata as any)?.project_id;
          if (pid) {
            projectCoinsMap[pid] = (projectCoinsMap[pid] || 0) + (Number(d.amount) || 0);
          }
        }
      }
    } catch {
      // coin_transactions peut ne pas exister
    }

    const projects = (rawProjects || []).map((p) => {
      const chaptersArr = p.chapters as any;
      const chaptersCount = Array.isArray(chaptersArr) && chaptersArr.length > 0
        ? chaptersArr[0]?.count || 0
        : 0;

      return {
        id: p.id,
        title: p.title || "Sans titre",
        author_name: profilesMap[p.user_id]?.full_name || "Auteur",
        author_email: profilesMap[p.user_id]?.email || "",
        status: p.status || "en_cours",
        chapters: chaptersCount,
        words: Number(p.word_count) || 0,
        coins_spent: projectCoinsMap[p.id] || 0,
        updated_at: p.updated_at || p.created_at
      };
    });

    return NextResponse.json({ projects });
  } catch (e: any) {
    console.error("GET /api/admin/projects error:", e);
    return NextResponse.json({ error: "Erreur de chargement." }, { status: 500 });
  }
}
