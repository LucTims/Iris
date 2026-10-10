import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { buildLifecycleEmail, chooseLifecycleEmail, type LifecycleCandidate } from "@/lib/email/lifecycle";
import { sendEmail } from "@/lib/email/resend";
import { unsubscribeUrl } from "@/lib/email/unsubscribe";

// Tâche planifiée quotidienne (vercel.json) : séquence d'e-mails d'activation.
// Vercel Cron appelle cette route avec « Authorization: Bearer $CRON_SECRET ».
export const runtime = "nodejs";
export const maxDuration = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.irisboom.online";
// L'offre gratuite de Resend autorise 100 e-mails/jour et 2 envois/seconde.
const MAX_PER_RUN = 80;
const DELAY_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await db.rpc("lifecycle_email_candidates");
  if (error) {
    Sentry.captureMessage(`[lifecycle-emails] candidats indisponibles : ${error.message}`, { level: "error" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const now = new Date();
  const planned = ((data ?? []) as LifecycleCandidate[])
    .map((c) => ({ c, kind: chooseLifecycleEmail(c, now) }))
    .filter((x): x is { c: LifecycleCandidate; kind: NonNullable<typeof x.kind> } => x.kind !== null)
    .slice(0, MAX_PER_RUN);

  if (dryRun) {
    return NextResponse.json({ dryRun: true, planned: planned.map(({ c, kind }) => ({ user_id: c.user_id, kind })) });
  }

  let sent = 0;
  const failures: string[] = [];
  for (const { c, kind } of planned) {
    const unsub = unsubscribeUrl(SITE_URL, c.user_id);
    const content = buildLifecycleEmail(kind, c, { siteUrl: SITE_URL, unsubscribeUrl: unsub });
    const result = await sendEmail({
      to: c.email,
      ...content,
      // Désinscription en un clic dans Gmail / Yahoo.
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });

    if (result.ok) {
      // Journalisé APRÈS l'envoi : un échec d'envoi sera retenté au prochain passage.
      await db.from("lifecycle_emails").insert({ user_id: c.user_id, kind });
      sent++;
    } else {
      failures.push(`${kind}:${result.status}:${result.error}`);
      if (result.status === 429) break; // quota Resend atteint : on s'arrête pour aujourd'hui
    }
    await sleep(DELAY_MS);
  }

  if (failures.length) {
    Sentry.captureMessage(`[lifecycle-emails] ${failures.length} échec(s) d'envoi`, {
      level: "warning",
      extra: { failures: failures.slice(0, 20) },
    });
  }

  return NextResponse.json({ planned: planned.length, sent, failed: failures.length });
}
