import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/ai/book-job";

/**
 * POST /api/generate-book/cancel — arrête un job en cours. Le chapitre en
 * cours de rédaction au moment de l'appel va jusqu'à son terme (pas
 * d'interruption au milieu d'un appel IA déjà lancé), mais aucun chapitre
 * suivant ne sera démarré.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: "jobId requis" }, { status: 400 });
    }

    // Vérifie la propriété via le client RLS-scopé avant d'écrire avec le
    // client service-role (aucune policy d'UPDATE n'est ouverte aux users).
    const { data: job, error } = await supabase
      .from("book_generation_jobs")
      .select("id, user_id, status")
      .eq("id", jobId)
      .single();

    if (error || !job || job.user_id !== user.id) {
      return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
    }

    if (job.status === "running") {
      await getServiceRoleClient()
        .from("book_generation_jobs")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de l'annulation du job de génération:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
