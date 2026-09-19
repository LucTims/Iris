import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance } from "@/lib/ai/cost-engine";
import { estimateChapterCoins } from "@/lib/ai/pricing";
import { getServiceRoleClient, type BookJobChapterPlan, type BookJobSettings } from "@/lib/ai/book-job";
import { generateWithFallback } from "@/lib/ai/model-fallback";
import { buildBiblePrompt, parseBible, isUsefulBible, EMPTY_BIBLE, type BookBible } from "@/lib/book/book-bible";
import { detectGenre } from "@/lib/ai/book-style";
import { resolveWorkType } from "@/lib/book/work-type";

const BIBLE_TIMEOUT_MS = 25_000;

/**
 * Produit la fiche de référence, avec garde-fou de temps et repli silencieux.
 * Un livre doit pouvoir s'écrire même si cette étape échoue.
 */
async function buildBibleSafely(
  settings: BookJobSettings,
  chapters: BookJobChapterPlan[]
): Promise<BookBible> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const genre = detectGenre(settings.category, settings.tone);
    const workType = resolveWorkType({
      explicit: settings.workType,
      category: settings.category,
      title: settings.title,
    });
    const outline = chapters
      .map((c, i) => `${i + 1}. ${c.heading || c.title}${c.brief ? ` — ${c.brief}` : ""}`)
      .join("\n");

    const prompt = buildBiblePrompt({
      title: settings.title,
      synopsis: settings.synopsis,
      tone: settings.tone,
      category: settings.category,
      instructions: settings.instructions,
      outline,
      workType,
      genre,
    });

    const { text } = await Promise.race([
      generateWithFallback({ preferred: settings.model || "gemini-3.6-flash", prompt }),
      new Promise<{ text: string }>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout fiche de référence")), BIBLE_TIMEOUT_MS);
      }),
    ]);

    const parsed = parseBible(text || "");
    return isUsefulBible(parsed) ? parsed : { ...EMPTY_BIBLE };
  } catch (err) {
    console.warn("[generate-book/start] Fiche de référence indisponible, génération sans elle:", err);
    return { ...EMPTY_BIBLE };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

    // `settings` est persisté tel quel dans la ligne du job : on borne la liste
    // d'images pour qu'un client modifié ne puisse pas y écrire n'importe quoi
    // (URL arbitraires envoyées au modèle, ou charge utile démesurée).
    settings.imageUrls = (Array.isArray(settings.imageUrls) ? settings.imageUrls : [])
      .filter((u: unknown): u is string => typeof u === "string" && /^https:\/\//.test(u))
      .slice(0, 24);

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
    const requiredCoins = estimateChapterCoins(wordsTarget, settings.model || "gemini-3.6-flash");
    const hasEnoughCoins = await checkMinimumBalance(user.id, requiredCoins);
    if (!hasEnoughCoins) {
      return NextResponse.json(
        { error: "Fonds insuffisants pour démarrer la génération du livre." },
        { status: 402 }
      );
    }

    // FICHE DE RÉFÉRENCE DE L'OUVRAGE, établie une seule fois avant d'écrire la
    // première ligne. Elle est ensuite injectée dans le prompt de CHAQUE
    // chapitre : c'est elle qui donne au rédacteur la vue d'ensemble qui lui
    // manquait (thèse, promesse, lecteur, voix, vocabulaire constant, exemples
    // déjà réservés, hors-sujet). Sans elle, chaque chapitre repartait
    // pratiquement de zéro et le livre se contredisait d'un chapitre à l'autre.
    //
    // Jamais bloquant : si l'appel échoue ou dépasse le délai, on démarre sans
    // fiche plutôt que d'empêcher l'auteur d'écrire son livre.
    const bible = await buildBibleSafely(settings, chapters);

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
        bible,
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
