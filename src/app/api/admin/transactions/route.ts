import { NextResponse } from "next/server";
import { requireAdmin, getAdminClient, getAuthUsersMap } from "@/lib/admin/isAdmin";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const admin = getAdminClient();

    const { data: rawTx, error } = await admin
      .from("transactions")
      .select("id, user_id, plan_id, amount, currency, status, provider_reference, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    // Joindre les profils et emails
    const userIds = [...new Set((rawTx || []).map((t) => t.user_id).filter(Boolean))];
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

    const transactions = (rawTx || []).map((t) => {
      const email = profilesMap[t.user_id]?.email || authMap[t.user_id]?.email || "";
      const name = profilesMap[t.user_id]?.full_name || (email ? email.split("@")[0] : "Auteur");
      return {
        id: t.id,
        name,
        email,
        plan_id: t.plan_id || "pack",
        amount: Number(t.amount) || 0,
        currency: t.currency || "XOF",
        status: t.status || "pending",
        provider_reference: t.provider_reference || null,
        created_at: t.created_at
      };
    });

    return NextResponse.json({ transactions });
  } catch (e: any) {
    console.error("GET /api/admin/transactions error:", e);
    return NextResponse.json({ error: "Erreur de chargement." }, { status: 500 });
  }
}

