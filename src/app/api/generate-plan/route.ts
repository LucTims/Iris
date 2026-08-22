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

    const rateLimit = await checkRateLimit(`plan_${user.id}`, 5, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter quelques instants." },
        { status: 429 }
      );
    }

    const {
      title,
      subtitle,
      category,
      audience,
      synopsis,
      tone,
      characters,
      length,
      instructions,
      model: chosenModel,
      includeDetailedPlan,
      includeToc,
      useWebSearch = true,
    } = await req.json();

    const selectedModelName = chosenModel || "gemini-2.5-flash";

    // Check coins
    const hasEnoughCoins = await checkMinimumBalance(user.id, 50);
    if (!hasEnoughCoins) {
      return NextResponse.json(
        { error: "Fonds insuffisants. Veuillez acheter des pièces pour générer le plan." },
        { status: 402 } 
      );
    }

    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        action: "generate_plan",
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    const searchContext = await fetchSearchContext(
      selectedModelName,
      useWebSearch,
      `${title} ${category || ""} ${synopsis || ""}`
    );

    let missionText = "";
    let mainTitle = "";
    
    if (includeDetailedPlan) {
      missionText = `Ta mission est de générer le **PLAN DÉTAILLÉ** de ce livre. Structure le plan de manière logique avec des chapitres et des sous-parties, accompagnés d'une brève description.`;
      mainTitle = "Plan Détaillé";
    } else {
      let tocInstruction = includeToc ? "Commence obligatoirement par un **SOMMAIRE** (Table des matières) listant les chapitres, puis enchaîne avec la rédaction du contenu." : "Ne fais pas de sommaire.";
      
      missionText = `Ta mission est d'écrire **DIRECTEMENT LE CONTENU DU LIVRE** (le texte complet). Puisque c'est un format de type "${length}", écris les chapitres avec le contenu final prêt à être lu. Rédige de façon fluide en utilisant le style demandé.\n${tocInstruction}`;
      mainTitle = title;
    }

    const prompt = `Voici les détails du livre :
Titre : ${title}
Sous-titre : ${subtitle || "Non spécifié"}
Catégorie : ${category}
Public cible : ${audience}
Longueur souhaitée : ${length}
Ton / Style : ${tone}
Personnages / Concepts clés : ${characters || "Aucun spécifié"}

Synopsis ou Idée Principale :
${synopsis}

Consignes supplémentaires :
${instructions || "Aucune consigne spécifique"}

${missionText}`;

    const result = streamText({
      model: getAiModel(selectedModelName),
      system: `Tu es un ghostwriter expert et rédacteur de livres professionnels.
IMPORTANT:
- Tu dois répondre UNIQUEMENT avec le contenu formaté en HTML valide (<h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <table>, <thead>, <tbody>, <tr>, <th>, <td>).
- Le tout premier élément DOIT être <h1>${mainTitle}</h1>.
- N'utilise JAMAIS de Markdown (pas de **, pas de #, pas de \`\`\`).
- NE FAIS AUCUNE SALUTATION (ne dis pas "Bonjour", ni "Voici le contenu", ni "Absolument", ni "En tant qu'IA").
- Commence directement par la balise <h1>.
- Quand le contenu contient des données comparatives, des listes de critères chiffrés ou des informations tabulaires, présente-les dans un tableau HTML bien structuré.
- Ne rajoute aucun commentaire personnel à la fin, sois purement factuel et professionnel dans l'exécution de la tâche.
${searchContext}
${useWebSearch ? SEARCH_GROUNDING_INSTRUCTION : ""}`,
      prompt: prompt,
      async onFinish({ usage }) {
        await deductCost(
          user.id,
          selectedModelName,
          usage.promptTokens,
          usage.completionTokens,
          `Génération du Plan: ${title}`
        );
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Erreur lors de la génération IA:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec l'IA." },
      { status: 500 }
    );
  }
}
