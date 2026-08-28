import { NextResponse, after } from "next/server";
import { getServiceRoleClient, processNextChapter, type BookJobRow } from "@/lib/ai/book-job";

export const maxDuration = 300;

/**
 * Traite UN chapitre du job puis, s'il en reste, s'enchaîne lui-même via un
 * nouvel appel HTTP (chaque appel obtient son propre budget d'exécution frais
 * — plus robuste qu'un enchaînement en mémoire qui resterait borné par le
 * timeout de l'invocation courante). Endpoint interne uniquement : jamais
 * appelé par le navigateur, protégé par un secret partagé.
 */
export async function POST(req: Request) {
  const secret = process.env.INTERNAL_JOB_SECRET;
  const provided = req.headers.get("x-internal-job-secret");
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { jobId } = await req.json();
  if (!jobId) {
    return NextResponse.json({ error: "jobId requis" }, { status: 400 });
  }

  const db = getServiceRoleClient();
  const { data: job, error } = await db
    .from("book_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
  }
  if (job.status !== "running") {
    return NextResponse.json({ status: job.status });
  }

  const { done } = await processNextChapter(db, job as BookJobRow);

  if (!done) {
    const origin = new URL(req.url).origin;
    after(async () => {
      try {
        await fetch(`${origin}/api/generate-book/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-job-secret": secret },
          body: JSON.stringify({ jobId }),
        });
      } catch (err) {
        console.error(`[generate-book/process] Échec de l'enchaînement pour le job ${jobId}:`, err);
      }
    });
  }

  return NextResponse.json({ done });
}
