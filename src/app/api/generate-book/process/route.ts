import { NextResponse, after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getServiceRoleClient } from "@/lib/ai/book-job";
import { adoptBookJob, claimBookJob, type LeasedBookJob } from "@/lib/ai/book-job-lease";
import { driveBookJob } from "@/lib/ai/book-job-runner";

export const maxDuration = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sameSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Worker de rédaction d'un livre : prend le job, écrit ses chapitres pendant
 * une fenêtre bornée puis passe le relais (voir driveBookJob). Endpoint
 * serveur uniquement, jamais appelé par le navigateur. Deux appelants :
 *   - le worker précédent (relais), authentifié par INTERNAL_JOB_SECRET ;
 *   - la tâche planifiée pg_cron (public.book_jobs_watchdog_tick), qui
 *     transmet le jeton du bail qu'elle vient de poser sur un job interrompu :
 *     ce jeton à usage unique est sa preuve d'autorisation.
 * La réponse part immédiatement ; l'écriture continue en arrière-plan.
 */
export async function POST(req: Request) {
  const startedAt = Date.now();
  const body = (await req.json().catch(() => null)) as { jobId?: unknown; lockToken?: unknown } | null;
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!UUID_RE.test(jobId)) {
    return NextResponse.json({ error: "jobId requis" }, { status: 400 });
  }

  const db = getServiceRoleClient();
  const providedSecret = req.headers.get("x-internal-job-secret");
  let job: LeasedBookJob | null;

  if (providedSecret !== null) {
    const secret = process.env.INTERNAL_JOB_SECRET;
    if (!secret || !sameSecret(providedSecret, secret)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    job = await claimBookJob(db, jobId, "hop");
  } else if (typeof body?.lockToken === "string" && UUID_RE.test(body.lockToken)) {
    job = await adoptBookJob(db, jobId, body.lockToken);
  } else {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Déjà tenu par un autre worker, terminé, ou jeton périmé : rien à faire.
  if (!job) return NextResponse.json({ claimed: false });

  const leased = job;
  const origin = new URL(req.url).origin;
  after(() => driveBookJob(db, leased, { origin, startedAt }));
  return NextResponse.json({ claimed: true }, { status: 202 });
}
