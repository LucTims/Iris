import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance } from "@/lib/ai/cost-engine";
import { estimateChapterCoins } from "@/lib/ai/pricing";
import { getServiceRoleClient, type BookJobChapterPlan, type BookJobSettings } from "@/lib/ai/book-job";

/**
 * Démarre (ou reprend) une génération de livre complet en arrière-plan.
 * Crée un job persisté, puis déclenche son traitement serveur-à-serveur
 * (voir /api/generate-book/process) : le reste de la génération continue
 * même si le client ferme l'onglet, contrairement à l'ancienne boucle
 * `fetch` exécutée directement depuis le navigateur.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`bookjob_start_${user.id}`, 4, 5 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Trop de démarrages de génération. Veuillez patienter." }, { status: 429 });
    }

    const body = await req.json();
    const projectId: string = body.projectId;
    const chapters: BookJobChapterPlan[] = Array.isArray(body.chapters) ? body.chapters : [];
    const settings: BookJobSettings = body.settings;

    if (!projectId || chapters.length === 0 || !settings?.title || !settings?.model) {
      return NextResponse.json({ error: "Paramètres de génération invalides." }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();
    if (projectError || !project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const wordsTarget = Math.max(400, Math.min(4000, Number(settings.targetWords) || 800));
    const requiredCoins = estimateChapterCoins(wordsTarget, settings.model || "gemini-2.5-flash");
    const hasEnoughCoins = await checkMinimumBalance(user.id, requiredCoins);
    if (!hasEnoughCoins) {
      return NextResponse.json(
        { error: "Fonds insuffisants pour démarrer la génération du livre." },
        { status: 402 }
      );
    }

    const db = getServiceRoleClient();
    const { data: job, error: jobError } = await db
      .from("book_generation_jobs")
      .insert({
        project_id: projectId,
        user_id: user.id,
        status: "running",
        settings,
        plan: chapters,
        current_index: 0,
        total: chapters.length,
        chapter_summaries: [],
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Erreur création job de génération:", jobError);
      return NextResponse.json({ error: "Impossible de démarrer la génération." }, { status: 500 });
    }

    // Déclenche le traitement du premier chapitre APRÈS avoir répondu au
    // client (after()) : le job continuera en arrière-plan indépendamment de
    // la requête HTTP courante. Chaque chapitre suivant s'enchaîne lui-même
    // de la même façon (voir /api/generate-book/process).
    const origin = new URL(req.url).origin;
    const secret = process.env.INTERNAL_JOB_SECRET;
    if (!secret) {
      console.error("INTERNAL_JOB_SECRET manquant — le job ne pourra pas être traité.");
      return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });
    }

    after(async () => {
      try {
        await fetch(`${origin}/api/generate-book/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-job-secret": secret },
          body: JSON.stringify({ jobId: job.id }),
        });
      } catch (err) {
        console.error(`[generate-book/start] Échec du déclenchement initial du job ${job.id}:`, err);
      }
    });

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error("Erreur lors du démarrage de la génération du livre:", error);
    return NextResponse.json({ error: "Une erreur est survenue au démarrage de la génération." }, { status: 500 });
  }
}
