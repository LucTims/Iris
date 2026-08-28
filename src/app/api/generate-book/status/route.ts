import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/generate-book/status?jobId=... — pour le polling côté client.
 * La RLS sur book_generation_jobs (SELECT own only) garantit qu'un
 * utilisateur ne peut lire que ses propres jobs.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId requis" }, { status: 400 });
    }

    const { data: job, error } = await supabase
      .from("book_generation_jobs")
      .select("id, project_id, status, current_index, total, last_error, updated_at")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
    }

    const { data: chapters } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", job.project_id)
      .order("number", { ascending: true });

    return NextResponse.json({ job, chapters: chapters || [] });
  } catch (error) {
    console.error("Erreur lors de la lecture du statut de génération:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
