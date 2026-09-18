import { NextResponse } from "next/server";
import { requireAdmin, getAdminClient, getAuthUsersMap } from "@/lib/admin/isAdmin";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const admin = getAdminClient();

    // 1. Récupérer tous les projets avec les chapitres (comptage et mots dynamiques)
    const { data: rawProjects, error } = await admin
      .from("projects")
      .select("id, user_id, title, status, word_count, updated_at, created_at, chapters(id, word_count)")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    // 2. Récupérer les profils et les emails auth pour joindre l'auteur
    const userIds = [...new Set((rawProjects || []).map((p) => p.user_id).filter(Boolean))];
    const [authMap, profilesRes] = await Promise.all([
      getAuthUsersMap(admin).catch(() => ({})),
      userIds.length > 0
        ? admin.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] })
    ]);

    const profilesMap: Record<string, { full_name?: string; email?: string }> = {};
    for (const p of profilesRes.data || []) {
      profilesMap[p.id] = { full_name: p.full_name, email: p.email };
    }

    // 3. Calculer les pièces dépensées par projet via coin_transactions
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

    // 4. Formatter la liste des projets
    const projects = (rawProjects || []).map((p: any) => {
      const chaptersArr = Array.isArray(p.chapters) ? p.chapters : [];
      const chaptersCount = chaptersArr.length;
      const computedWords = chaptersArr.reduce((sum: number, ch: any) => sum + (Number(ch.word_count) || 0), 0);
      const totalWords = computedWords > 0 ? computedWords : (Number(p.word_count) || 0);

      const authorEmail = profilesMap[p.user_id]?.email || authMap[p.user_id]?.email || "";
      const authorName = profilesMap[p.user_id]?.full_name || (authorEmail ? authorEmail.split("@")[0] : "Auteur");

      return {
        id: p.id,
        title: p.title || "Sans titre",
        author_name: authorName,
        author_email: authorEmail,
        status: p.status || "en_cours",
        chapters: chaptersCount,
        words: totalWords,
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

