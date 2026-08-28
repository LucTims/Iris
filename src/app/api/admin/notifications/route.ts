import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/isAdmin";

// GET /api/admin/notifications — Liste de toutes les notifications publiées pour l'administration
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { supabase } = guard;

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
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { supabase, user } = guard;

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
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    const { supabase } = guard;

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
