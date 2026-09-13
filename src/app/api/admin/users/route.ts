import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/isAdmin";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/users — liste enrichie (solde, pièces dépensées, projets…).
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const admin = getAdminClient();

    // 1. Récupérer tous les profils
    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select("id, full_name, email, role, plan, created_at")
      .order("created_at", { ascending: false });

    if (profilesErr) throw profilesErr;

    // 2. Récupérer les soldes wallet
    const { data: wallets } = await admin
      .from("wallets")
      .select("user_id, balance");

    const walletMap: Record<string, number> = {};
    for (const w of wallets || []) {
      walletMap[w.user_id] = Number(w.balance) || 0;
    }

    // 3. Compter les projets par utilisateur
    const { data: projectCounts } = await admin
      .from("projects")
      .select("user_id");

    const projectMap: Record<string, number> = {};
    for (const p of projectCounts || []) {
      projectMap[p.user_id] = (projectMap[p.user_id] || 0) + 1;
    }

    // 4. Calculer les pièces dépensées par utilisateur via coin_transactions
    let spentMap: Record<string, number> = {};
    try {
      // D'abord récupérer wallet_id -> user_id mapping
      const walletUserMap: Record<string, string> = {};
      for (const w of wallets || []) {
        // wallet id = user_id dans la plupart des configs, sinon on utilise le select
        walletUserMap[w.user_id] = w.user_id;
      }

      const { data: debits } = await admin
        .from("coin_transactions")
        .select("wallet_id, amount")
        .eq("type", "debit");

      // wallet_id correspond souvent à l'id du wallet qui est lié au user_id
      // On va mapper via la table wallets
      const { data: walletsWithId } = await admin
        .from("wallets")
        .select("id, user_id");

      const walletIdToUser: Record<string, string> = {};
      for (const w of walletsWithId || []) {
        walletIdToUser[w.id] = w.user_id;
      }

      for (const d of debits || []) {
        const uid = walletIdToUser[d.wallet_id] || d.wallet_id;
        spentMap[uid] = (spentMap[uid] || 0) + (Number(d.amount) || 0);
      }
    } catch {
      // coin_transactions peut ne pas exister, on continue sans
    }

    // 5. Assembler les données enrichies
    const users = (profiles || []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role || "user",
      plan: p.plan || "free",
      balance: walletMap[p.id] || 0,
      coins_spent: spentMap[p.id] || 0,
      projects: projectMap[p.id] || 0,
      created_at: p.created_at
    }));

    return NextResponse.json({ users });
  } catch (e: any) {
    console.error("GET /api/admin/users error:", e);
    return NextResponse.json({ error: "Erreur de chargement." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { userId, newPlan } = await req.json();

    if (!userId || !newPlan) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { error: profileError } = await admin
      .from("profiles")
      .update({ plan: newPlan, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error: any) {
    console.error("Erreur mise à jour utilisateur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
