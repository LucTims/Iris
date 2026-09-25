import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/ai/book-job";
import { claimBookJob, isBookJobStale } from "@/lib/ai/book-job-lease";
import { driveBookJob } from "@/lib/ai/book-job-runner";

// Cette route peut reprendre elle-même un job interrompu : même budget
// d'exécution que le worker.
export const maxDuration = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface JobStatusRow {
  id: string;
  project_id: string;
  status: string;
  current_index: number;
  total: number;
  last_error: string | null;
  updated_at: string;
  heartbeat_at: string;
  lock_token: string | null;
}

/**
 * GET /api/generate-book/status?jobId=...    — suivi d'un job précis ;
 * GET /api/generate-book/status?projectId=... — job en cours du projet, s'il
 *   y en a un (l'éditeur se reconnecte quand l'auteur rouvre un livre en
 *   cours de rédaction).
 * La RLS sur book_generation_jobs (SELECT own only) garantit qu'un
 * utilisateur ne lit que ses propres jobs.
 *
 * FILET DE SÉCURITÉ : un job « running » dont plus aucun worker ne s'occupe
 * (relais perdu, fonction interrompue) est repris ici même. Tant que
 * l'éditeur est ouvert, un livre va donc au bout ; onglet fermé, la tâche
 * planifiée pg_cron prend le relais.
 */
export async function GET(req: Request) {
  const startedAt = Date.now();
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
    const projectId = searchParams.get("projectId");
    if (jobId ? !UUID_RE.test(jobId) : !projectId || !UUID_RE.test(projectId)) {
      return NextResponse.json({ error: "jobId ou projectId requis" }, { status: 400 });
    }

    let query = supabase
      .from("book_generation_jobs")
      .select("id, project_id, status, current_index, total, last_error, updated_at, heartbeat_at, lock_token");
    query = jobId
      ? query.eq("id", jobId)
      : query.eq("project_id", projectId as string).eq("status", "running").order("created_at", { ascending: false });
    const { data: rows, error } = await query.limit(1);
    const row = (rows?.[0] ?? null) as JobStatusRow | null;

    if (error || !row) {
      if (jobId) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
      return NextResponse.json({ job: null, chapters: [] });
    }

    let resumed = false;
    if (row.status === "running" && isBookJobStale(row)) {
      const db = getServiceRoleClient();
      const leased = await claimBookJob(db, row.id, "watchdog");
      if (leased) {
        resumed = true;
        console.warn(`[generate-book/status] Job ${row.id} repris depuis l'éditeur au chapitre ${leased.current_index + 1}/${leased.total}.`);
        const origin = new URL(req.url).origin;
        after(() => driveBookJob(db, leased, { origin, startedAt }));
      }
    }

    const { data: chapters } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", row.project_id)
      .order("number", { ascending: true });

    // Le jeton du bail ne quitte jamais le serveur.
    const job = {
      id: row.id,
      project_id: row.project_id,
      status: row.status,
      current_index: row.current_index,
      total: row.total,
      last_error: row.last_error,
      updated_at: row.updated_at,
      heartbeat_at: row.heartbeat_at,
    };

    return NextResponse.json({ job, chapters: chapters || [], resumed });
  } catch (error) {
    console.error("Erreur lors de la lecture du statut de génération:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
