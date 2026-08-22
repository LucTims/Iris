import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { mockAdminTransactions } from "@/lib/admin/mockData";
import { AdminTransaction } from "@/lib/admin/types";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_service_role_key";
  return createAdminClient(url, key);
}

export async function GET(req: Request) {
  try {
    let transactions: AdminTransaction[] = [];
    const supabaseAdmin = getSupabaseAdmin();

    try {
      // 1. Récupérer les transactions depuis la base de données
      const { data: dbTransactions, error: txError } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (!txError && dbTransactions && dbTransactions.length > 0) {
        // Récupérer les profils pour associer les noms et emails
        const userIds = [...new Set(dbTransactions.map((t) => t.user_id).filter(Boolean))];
        let profilesMap: Record<string, { full_name?: string; email?: string }> = {};

        if (userIds.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

          if (profiles) {
            profiles.forEach((p) => {
              profilesMap[p.id] = { full_name: p.full_name, email: p.email };
            });
          }
        }

        const normalizeStatus = (s?: string): "paid" | "pending" | "failed" => {
          const lower = (s || "").toLowerCase();
          if (lower === "paid" || lower === "approved" || lower === "success" || lower === "completed" || lower === "succeeded") {
            return "paid";
          }
          if (lower === "failed" || lower === "rejected" || lower === "canceled" || lower === "cancelled") {
            return "failed";
          }
          return "pending";
        };

        transactions = dbTransactions.map((t) => ({
          id: t.id,
          user_id: t.user_id,
          user_name: profilesMap[t.user_id]?.full_name || t.metadata?.user_name || "Auteur",
          user_email: profilesMap[t.user_id]?.email || t.metadata?.user_email || "auteur@iris.app",
          plan_id: t.plan_id || "pack_creator",
          amount: Number(t.amount) || 0,
          currency: t.currency || "XOF",
          status: normalizeStatus(t.status),
          provider_reference: t.provider_reference || undefined,
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString(),
        }));
      }
    } catch (dbErr) {
      console.warn("Consultation DB transactions non disponible, utilisation des données démo:", dbErr);
    }

    // Fallback si aucune transaction en base (ex: environnement dev / mock)
    if (transactions.length === 0) {
      transactions = mockAdminTransactions;
    }

    // 2. Calcul des métriques financières (chiffre d'affaires calculé UNIQUEMENT sur les transactions 'paid')
    const paidTransactions = transactions.filter((t) => t.status === "paid");
    const totalRevenueFCFA = paidTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const paidCount = paidTransactions.length;
    const pendingCount = transactions.filter((t) => t.status === "pending").length;
    const failedCount = transactions.filter((t) => t.status === "failed").length;
    const totalTransactions = transactions.length;
    const conversionRatePct = totalTransactions > 0 ? Number(((paidCount / totalTransactions) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      transactions,
      stats: {
        totalRevenueFCFA,
        paidCount,
        pendingCount,
        failedCount,
        totalTransactions,
        conversionRatePct,
      },
    });
  } catch (error: any) {
    console.error("Erreur API Admin Finances:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des finances",
        transactions: mockAdminTransactions,
        stats: {
          totalRevenueFCFA: mockAdminTransactions
            .filter((t) => t.status === "paid")
            .reduce((s, t) => s + t.amount, 0),
          paidCount: mockAdminTransactions.filter((t) => t.status === "paid").length,
          pendingCount: mockAdminTransactions.filter((t) => t.status === "pending").length,
          failedCount: mockAdminTransactions.filter((t) => t.status === "failed").length,
          totalTransactions: mockAdminTransactions.length,
          conversionRatePct: 60.0,
        },
      },
      { status: 200 }
    );
  }
}
