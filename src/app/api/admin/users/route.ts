import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// GET /api/admin/users — liste enrichie (solde, pièces dépensées, projets…).
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { data, error } = await supabase.rpc("get_admin_users");
    if (error) {
      const forbidden = (error.message || "").toLowerCase().includes("forbidden");
      return NextResponse.json(
        { error: forbidden ? "Accès réservé aux administrateurs." : "Erreur de chargement." },
        { status: forbidden ? 403 : 500 }
      );
    }
    return NextResponse.json({ users: data || [] });
  } catch (e) {
    console.error("GET /api/admin/users error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérification stricte : basée sur le rôle en base (cohérent avec le reste de l'app),
    // avec repli temporaire sur l'e-mail historique tant que profiles.role n'est pas confirmé
    // en base pour tous les comptes admin. À retirer une fois le rôle vérifié en production.
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = callerProfile?.role === "admin" || user.email === "www.martau@gmail.com";
    if (!isAdmin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { userId, newPlan } = await req.json();

    if (!userId || !newPlan) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Mettre à jour la table `profiles`
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ plan: newPlan, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileError) {
      throw profileError;
    }

    // 2. Mettre à jour / Créer un abonnement
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Donne 30 jours par défaut

    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingSub) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_id: newPlan === "free" ? "plan_free" : `plan_${newPlan}`,
          status: newPlan === "free" ? "canceled" : "active",
          current_period_end: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", existingSub.id);
    } else {
      await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_id: newPlan === "free" ? "plan_free" : `plan_${newPlan}`,
          status: newPlan === "free" ? "canceled" : "active",
          current_period_end: endDate.toISOString()
        });
    }

    return NextResponse.json({ success: true, plan: newPlan });

  } catch (error: any) {
    console.error("Erreur mise à jour utilisateur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
