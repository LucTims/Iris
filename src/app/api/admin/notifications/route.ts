import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin(supabase: any, user: any) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdminRole = profile?.role === "admin";
  const isAdminEmail = ["www.boombooks1@gmail.com", "amadou.diallo@iris-editions.com"].includes(user.email || "");

  return isAdminRole || isAdminEmail;
}

// GET /api/admin/notifications — Liste de toutes les notifications publiées pour l'administration
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(supabase, user);
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notifications: notifications || [] });
  } catch (error: any) {
    console.error("GET /api/admin/notifications error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/admin/notifications — Publier une nouvelle notification
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(supabase, user);
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type = "info", link, target_user_id } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Titre et message sont obligatoires." }, { status: 400 });
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        title,
        message,
        type,
        link: link || null,
        target_user_id: target_user_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification, message: "Notification publiée avec succès !" });
  } catch (error: any) {
    console.error("POST /api/admin/notifications error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/admin/notifications — Supprimer une notification
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(supabase, user);
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Notification supprimée avec succès." });
  } catch (error: any) {
    console.error("DELETE /api/admin/notifications error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
