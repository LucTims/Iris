import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductChapterCost } from "@/lib/ai/cost-engine";
import { generateWithFallback } from "@/lib/ai/model-fallback";
import { estimateChapterCoins } from "@/lib/ai/pricing";
import { fetchSearchContext } from "@/lib/ai/search-context";
import { detectGenre, shouldGroundWithWebSearch, buildChapterSystemPrompt } from "@/lib/ai/book-style";
import { sanitizeGeneratedHtml } from "@/lib/ai/sanitize-html";
import { resolveWorkType, chapterNounFor } from "@/lib/book/work-type";
import { assignChapterLabels } from "@/lib/book/chapter-heading";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Accès non autorisé. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const rateLimit = await checkRateLimit(`chapter_${user.id}`, 3, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de requêtes de génération en cours. Veuillez patienter." },
        { status: 429 }
      );
    }

    const {
      title,
      synopsis,
      tone,
      category,
      characters,
      chapterTitle,
      chapterNumber,
      previousChaptersSummary,
      bookOutline,
      chapterBrief,
      instructions,
      targetWords,
      model: chosenModel,
      projectId,
      useWebSearch = true,
      workType: requestedWorkType,
      chapterHeading: providedHeading,
    } = await req.json();

    // Genre (fiction vs non-fiction) : conditionne la mise en forme (pas
    // d'encadrés ni de sources en fiction) et l'usage de la recherche web.
    const genre = detectGenre(category, tone);
    const webSearchEnabled = shouldGroundWithWebSearch(genre, useWebSearch);
    const workType = resolveWorkType({ explicit: requestedWorkType, category, title });

    // Titre canonique du chapitre. Le client peut l'imposer (il connaît la
    // position réelle du chapitre dans le livre) ; sinon on le recompose ici en
    // nettoyant le titre — un titre qui contient déjà « Chapitre 3 : » ne doit
    // jamais être re-préfixé, et « Introduction » ne doit jamais être numéroté.
    const effectiveHeading =
      (typeof providedHeading === "string" && providedHeading.trim()) ||
      assignChapterLabels(
        [{ title: chapterTitle || "" }],
        chapterNounFor(workType, genre)
      )[0].heading;

    // Cible de longueur (déduite du nombre de pages voulu). Bornée pour éviter
    // des chapitres démesurés qui dépasseraient la limite de temps de 60 s.
    const wordsTarget = Math.max(400, Math.min(4000, Number(targetWords) || 0));

    const selectedModelName = chosenModel || "gemini-2.5-flash";

    // Garde-fou : on exige le coût ESTIMÉ du chapitre (pages × tarif/page) AVANT
    // de générer, pour s'arrêter proprement quand les pièces manquent — sans
    // produire un chapitre qu'on ne pourrait pas facturer.
    const requiredCoins = estimateChapterCoins(wordsTarget || 800, selectedModelName);
    const hasEnoughCoins = await checkMinimumBalance(user.id, requiredCoins);
    if (!hasEnoughCoins) {
      return NextResponse.json(
        { error: "Fonds insuffisants. Veuillez acheter des pièces pour continuer à générer des chapitres." },
        { status: 402 }
      );
    }

    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: "generate_chapter_started",
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    const searchContext = await fetchSearchContext(
      selectedModelName,
      webSearchEnabled,
      `${title} - ${chapterTitle} ${synopsis || ""}`
    );

    const systemPrompt = buildChapterSystemPrompt({
      genre,
      title,
      synopsis,
      tone,
      characters,
      bookOutline,
      chapterBrief,
      instructions,
      chapterNumber,
      chapterTitle,
      chapterHeading: effectiveHeading,
      workType,
      previousSummary: previousChaptersSummary,
      searchContext,
      wordsTarget: wordsTarget || undefined,
    });

    // Génération AVEC REPLI AUTOMATIQUE entre fournisseurs : si la clé du modèle
    // demandé est morte / en quota / surchargée, on bascule sur un autre
    // fournisseur au lieu de renvoyer un chapitre vide. On facture le modèle qui
    // a RÉELLEMENT écrit le texte.
    let generated;
    try {
      generated = await generateWithFallback({
        preferred: selectedModelName,
        system: systemPrompt,
        prompt: "Rédige ce chapitre maintenant en HTML en respectant scrupuleusement les consignes et le style.",
      });
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      console.error(`[generate-chapter] Tous les fournisseurs ont échoué (chapitre ${chapterNumber}) :`, msg);
      try {
        await supabase.from("ai_usage").insert({
          user_id: user.id,
          project_id: projectId || null,
          action: "generate_chapter_error",
          model: msg.slice(0, 300),
        });
      } catch { /* best-effort */ }
      return NextResponse.json(
        { error: "Les services d'IA sont momentanément indisponibles. Réessayez dans quelques minutes." },
        { status: 503 }
      );
    }

    if (generated.fellBack) {
      console.warn(`[generate-chapter] Repli sur ${generated.modelUsed} (chapitre ${chapterNumber}) :`, generated.errors.join(" | "));
      try {
        await supabase.from("ai_usage").insert({
          user_id: user.id,
          project_id: projectId || null,
          action: "generate_chapter_fallback",
          model: `${generated.modelUsed} <= ${generated.errors.join(" | ")}`.slice(0, 300),
        });
      } catch { /* best-effort */ }
    }

    // Nettoyage avant renvoi : le client insère ce HTML tel quel dans le
    // manuscrit, donc il doit déjà être exempt de blocs ```html, de Markdown
    // résiduel, de lettrine cassée et de titre en double.
    const cleanText = sanitizeGeneratedHtml(generated.text, { expectedHeading: effectiveHeading });

    const deducted = await deductChapterCost(
      user.id,
      generated.modelUsed,
      generated.usage,
      `Génération Chapitre ${chapterNumber}: ${chapterTitle}`,
      { projectId, outputText: cleanText }
    );
    if (!deducted) {
      console.error(`Erreur lors de la déduction des pièces pour l'utilisateur ${user.id}`);
    }

    return new Response(cleanText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // Le client réaligne le titre du chapitre sur celui réellement écrit.
        "X-Chapter-Heading": encodeURIComponent(effectiveHeading),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la génération du chapitre:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec l'IA." },
      { status: 500 }
    );
  }
}
