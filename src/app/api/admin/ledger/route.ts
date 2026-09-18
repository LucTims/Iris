import { NextResponse } from "next/server";
import { requireAdmin, getAdminClient, getAuthUsersMap } from "@/lib/admin/isAdmin";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const admin = getAdminClient();

    // Récupérer les transactions de pièces (coin_transactions)
    let ledger: any[] = [];
    try {
      const { data: rawLedger, error } = await admin
        .from("coin_transactions")
        .select("id, wallet_id, type, amount, description, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Mapper wallet_id vers user_id via la table wallets
      const walletIds = [...new Set((rawLedger || []).map((l) => l.wallet_id).filter(Boolean))];
      let walletToUser: Record<string, string> = {};
      let profilesMap: Record<string, { full_name?: string; email?: string }> = {};

      if (walletIds.length > 0) {
        const { data: wallets } = await admin
          .from("wallets")
          .select("id, user_id")
          .in("id", walletIds);

        for (const w of wallets || []) {
          walletToUser[w.id] = w.user_id;
        }

        const userIds = [...new Set(Object.values(walletToUser))];
        const [authMap, profilesRes] = await Promise.all([
          getAuthUsersMap(admin).catch(() => ({})),
          userIds.length > 0
            ? admin.from("profiles").select("id, full_name, email").in("id", userIds)
            : Promise.resolve({ data: [] })
        ]);

        for (const p of profilesRes.data || []) {
          profilesMap[p.id] = {
            full_name: p.full_name,
            email: p.email || authMap[p.id]?.email || ""
          };
        }
        for (const uid of userIds) {
          if (!profilesMap[uid]) {
            profilesMap[uid] = {
              full_name: authMap[uid]?.email?.split("@")[0] || "Auteur",
              email: authMap[uid]?.email || ""
            };
          }
        }
      }

      ledger = (rawLedger || []).map((l) => {
        const userId = walletToUser[l.wallet_id] || l.wallet_id;
        return {
          id: l.id,
          name: profilesMap[userId]?.full_name || "Auteur",
          email: profilesMap[userId]?.email || "",
          type: l.type || "debit",
          amount: Number(l.amount) || 0,
          description: l.description || "Transaction",
          created_at: l.created_at
        };
      });
    } catch (tableErr) {
      console.warn("coin_transactions non accessible:", tableErr);
    }

    return NextResponse.json({ ledger });
  } catch (e: any) {
    console.error("GET /api/admin/ledger error:", e);
    return NextResponse.json({ error: "Erreur de chargement." }, { status: 500 });
  }
}

