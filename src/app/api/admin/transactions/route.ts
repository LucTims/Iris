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

    const { data: rawTx, error } = await admin
      .from("transactions")
      .select("id, user_id, plan_id, amount, currency, status, provider_reference, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    // Joindre les profils
    const userIds = [...new Set((rawTx || []).map((t) => t.user_id).filter(Boolean))];
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

    const transactions = (rawTx || []).map((t) => ({
      id: t.id,
      name: profilesMap[t.user_id]?.full_name || "Auteur",
      email: profilesMap[t.user_id]?.email || "",
      plan_id: t.plan_id || "pack",
      amount: Number(t.amount) || 0,
      currency: t.currency || "XOF",
      status: t.status || "pending",
      provider_reference: t.provider_reference || null,
      created_at: t.created_at
    }));

    return NextResponse.json({ transactions });
  } catch (e: any) {
    console.error("GET /api/admin/transactions error:", e);
    return NextResponse.json({ error: "Erreur de chargement." }, { status: 500 });
  }
}
