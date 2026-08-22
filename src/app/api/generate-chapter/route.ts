import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductCost } from "@/lib/ai/cost-engine";
import {
  getAiModelWithSearch,
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
6. Quand le contenu contient des données comparatives, des listes de critères chiffrés ou des informations tabulaires, présente-les dans un tableau HTML bien structuré.`;

    const result = streamText({
      model: getAiModelWithSearch(selectedModelName, useWebSearch),
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
