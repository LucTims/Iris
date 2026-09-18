import { NextResponse } from "next/server";
import { requireAdmin, getAdminClient, getAuthUsersMap } from "@/lib/admin/isAdmin";

// GET /api/admin/users — liste enrichie (solde, pièces dépensées, projets…).
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const admin = getAdminClient();

    // 1. Récupérer les profils et les utilisateurs auth en parallèle
    const [authMap, { data: profiles, error: profilesErr }] = await Promise.all([
      getAuthUsersMap(admin).catch(() => ({})),
      admin
        .from("profiles")
        .select("id, full_name, email, role, plan, created_at")
        .order("created_at", { ascending: false })
    ]);

    if (profilesErr) {
      console.warn("Profiles query with email error, falling back without email:", profilesErr);
    }

    // 2. Récupérer les soldes wallet
    const { data: wallets } = await admin
      .from("wallets")
      .select("id, user_id, balance");

    const walletMap: Record<string, number> = {};
    const walletIdToUser: Record<string, string> = {};
    for (const w of wallets || []) {
      if (w.user_id) {
        walletMap[w.user_id] = Number(w.balance) || 0;
        walletIdToUser[w.id] = w.user_id;
      }
    }

    // 3. Compter les projets par utilisateur
    const { data: projectCounts } = await admin
      .from("projects")
      .select("user_id");

    const projectMap: Record<string, number> = {};
    for (const p of projectCounts || []) {
      if (p.user_id) {
        projectMap[p.user_id] = (projectMap[p.user_id] || 0) + 1;
      }
    }

    // 4. Calculer les pièces dépensées par utilisateur via coin_transactions
    let spentMap: Record<string, number> = {};
    try {
      const { data: debits } = await admin
        .from("coin_transactions")
        .select("wallet_id, amount")
        .eq("type", "debit");

      for (const d of debits || []) {
        const uid = walletIdToUser[d.wallet_id] || d.wallet_id;
        spentMap[uid] = (spentMap[uid] || 0) + (Number(d.amount) || 0);
      }
    } catch {
      // coin_transactions peut ne pas exister, on continue sans
    }

    // 5. Assembler les données enrichies
    const profilesList = profiles || [];
    const knownProfileIds = new Set(profilesList.map((p) => p.id));

    const users = profilesList.map((p) => {
      const email = p.email || authMap[p.id]?.email || "";
      const fullName = p.full_name || (email ? email.split("@")[0] : "Auteur");
      return {
        id: p.id,
        full_name: fullName,
        email: email,
        role: p.role || "user",
        plan: p.plan || "free",
        balance: walletMap[p.id] || 0,
        coins_spent: spentMap[p.id] || 0,
        projects: projectMap[p.id] || 0,
        created_at: p.created_at || authMap[p.id]?.created_at || new Date().toISOString()
      };
    });

    // Ajouter d'éventuels utilisateurs d'auth qui n'ont pas encore de profil
    for (const [authId, authUser] of Object.entries(authMap)) {
      if (!knownProfileIds.has(authId)) {
        users.push({
          id: authId,
          full_name: authUser.email ? authUser.email.split("@")[0] : "Auteur",
          email: authUser.email || "",
          role: "user",
          plan: "free",
          balance: walletMap[authId] || 0,
          coins_spent: spentMap[authId] || 0,
          projects: projectMap[authId] || 0,
          created_at: authUser.created_at || new Date().toISOString()
        });
      }
    }

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
