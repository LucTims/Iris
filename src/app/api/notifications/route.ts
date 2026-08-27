import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications — Notifications destinées à l'utilisateur connecté avec statut lu/non lu
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Récupérer toutes les notifications ciblées ou broadcast
    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (notifError) throw notifError;

    // Récupérer les identifiants des notifications déjà lues par l'utilisateur
    const { data: readRecords, error: readError } = await supabase
      .from("user_notifications_read")
      .select("notification_id")
      .eq("user_id", user.id);

    if (readError) throw readError;

    const readIds = new Set((readRecords || []).map((r) => r.notification_id));

    const formattedNotifications = (notifications || []).map((n) => ({
      ...n,
      is_read: readIds.has(n.id),
    }));

    const unreadCount = formattedNotifications.filter((n) => !n.is_read).length;

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ notifications: [], unreadCount: 0, error: error.message });
  }
}

// POST /api/notifications — Marquer une ou toutes les notifications comme lues
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { notification_id, mark_all_read } = body;

    if (mark_all_read) {
      // Récupérer toutes les notifications non lues
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id")
        .or(`target_user_id.is.null,target_user_id.eq.${user.id}`);

      if (notifications && notifications.length > 0) {
        const rowsToInsert = notifications.map((n) => ({
          user_id: user.id,
          notification_id: n.id,
        }));

        await supabase
          .from("user_notifications_read")
          .upsert(rowsToInsert, { onConflict: "user_id,notification_id" });
      }

      return NextResponse.json({ success: true, message: "Toutes les notifications ont été marquées comme lues." });
    }

    if (notification_id) {
      await supabase
        .from("user_notifications_read")
        .upsert(
          { user_id: user.id, notification_id },
          { onConflict: "user_id,notification_id" }
        );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
