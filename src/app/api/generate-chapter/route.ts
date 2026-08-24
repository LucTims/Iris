import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductCost } from "@/lib/ai/cost-engine";
import {
  getAiModel,
  fetchSearchContext,
  SEARCH_GROUNDING_INSTRUCTION,
} from "@/lib/ai/search-context";

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
      chapterTitle,
      chapterNumber,
      previousChaptersSummary,
      bookOutline,
      model: chosenModel,
      projectId,
      useWebSearch = true,
    } = await req.json();

    const selectedModelName = chosenModel || "gemini-2.5-flash";

    const hasEnoughCoins = await checkMinimumBalance(user.id, 50);
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
      useWebSearch,
      `${title} - ${chapterTitle} ${synopsis || ""}`
    );

    const systemPrompt = `Tu es un auteur professionnel de best-sellers. Ta mission est de rédiger un chapitre COMPLET pour un livre.
Le texte que tu génères sera directement inséré dans le manuscrit de l'auteur.

Livre concerné :
Titre : ${title}
Synopsis global : ${synopsis || "Non défini"}
Ton / Style demandé : ${tone || "Professionnel et engageant"}

${bookOutline ? `Sommaire / Table des matières du livre (rédige ce chapitre en cohérence avec ce plan, sans déborder sur les points prévus dans les autres chapitres) :\n${bookOutline}\n` : ""}
${previousChaptersSummary ? `Résumé des chapitres précédents pour garder la cohérence :\n${previousChaptersSummary}\n` : ""}

Tu dois rédiger le texte du :
Chapitre ${chapterNumber} : ${chapterTitle}
${searchContext}
${useWebSearch ? SEARCH_GROUNDING_INSTRUCTION : ""}

Instructions impératives :
1. Rédige le chapitre complet. Il doit être long, détaillé et immersif (vise au moins 800 à 1500 mots).
2. N'ajoute AUCUN préambule (pas de "Voici le chapitre :" ni de "Bien sûr, je vais rédiger...").
3. IMPORTANT: Chaque chapitre doit absolument commencer sur une nouvelle page. Pour ce faire, COMMENCE toujours ton texte par la balise <hr data-page-break>.
4. Juste après cette balise, ajoute le titre du chapitre en balise <h1>. Par exemple : <hr data-page-break><h1>Chapitre ${chapterNumber} : ${chapterTitle}</h1>.
5. Ensuite, rédige le contenu du chapitre en HTML valide, avec des balises <p>, <h2>, <h3>, <strong>, <em>, <blockquote>, <table>, <thead>, <tbody>, <tr>, <th>, <td>.
6. Quand le contenu contient des données comparatives, des listes de critères chiffrés ou des informations tabulaires, présente-les dans un tableau HTML bien structuré.
7. Pour mettre en valeur un point clé, utilise des encadrés : <div class="callout callout-info">…</div> (information importante), <div class="callout callout-warning">…</div> (mise en garde / risque), <div class="callout callout-tip">…</div> (conseil pratique), <div class="callout callout-example">…</div> (exemple concret). Le contenu d'un encadré doit être en HTML (<p>, <strong>…). N'en abuse pas : 1 à 3 encadrés par chapitre, uniquement quand ça apporte vraiment de la valeur.
8. Pour un chiffre ou statistique marquant, utilise : <div class="key-figure">85% des entreprises…</div>. Maximum 1-2 par chapitre.
9. Pour une citation marquante, utilise : <div class="pull-quote">La citation ici</div>. Maximum 1-2 par chapitre.
10. Pour marquer une transition entre sections, tu peux utiliser un séparateur décoratif : <div class="section-divider section-divider-stars"></div> (ou ornament, line, dots). Utilise-les avec parcimonie.
11. Pour un début de chapitre ou de section important, utilise une lettrine : <p class="drop-cap">Le texte du paragraphe…</p>. Maximum 1 par chapitre (typiquement le premier paragraphe).`;

    const result = streamText({
      model: getAiModel(selectedModelName),
      system: systemPrompt,
      prompt: "Rédige ce chapitre maintenant en HTML en respectant scrupuleusement les consignes et le style.",
      async onFinish({ usage }) {
        const success = await deductCost(
          user.id,
          selectedModelName,
          usage.promptTokens,
          usage.completionTokens,
          `Génération Chapitre ${chapterNumber}: ${chapterTitle}`
        );
        if (!success) {
          console.error(`Erreur lors de la déduction des pièces pour l'utilisateur ${user.id}`);
        }
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Erreur lors de la génération du chapitre:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec l'IA." },
      { status: 500 }
    );
  }
}
