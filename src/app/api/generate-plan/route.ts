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
      includeToc = true,
      useWebSearch = true,
      referenceAnalysis,
      referencePurpose,
      referenceName,
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

    if (includeToc) {
      missionText = `Ta mission est d'écrire **DIRECTEMENT LE CONTENU DU LIVRE** (le texte complet), précédé d'un sommaire. Procède ainsi :

1. **SOMMAIRE** — Commence OBLIGATOIREMENT par le sommaire. Choisis toi-même le libellé le plus adapté au livre : écris **Table des matières** pour un ouvrage formel, académique, technique ou professionnel, sinon **Sommaire**. Le sommaire doit rester CONCIS : liste uniquement les grands points (les chapitres) et, seulement lorsque c'est vraiment nécessaire, quelques sous-titres importants. N'entre pas dans un plan surdétaillé (pas de description sous chaque point, pas de sous-sous-parties). Présente-le comme une simple liste (<ul><li>…</li></ul>).

2. **CONTENU** — Ensuite, rédige RÉELLEMENT chaque point annoncé dans le sommaire, dans l'ordre. Puisque c'est un format de type "${length}", écris le contenu final prêt à être lu, de façon fluide et dans le style demandé.

3. **NOUVELLE PAGE PAR GRAND POINT** — TRÈS IMPORTANT : chaque grand point (chaque chapitre du sommaire) DOIT commencer sur une nouvelle page. Pour cela, place la balise <hr data-page-break> juste avant le titre <h1> de chaque grand point. Le sommaire lui-même reste sur sa propre page (ne mets pas de saut de page avant lui). Les simples sous-titres (<h2>, <h3>) à l'intérieur d'un grand point n'ont PAS besoin de saut de page.`;
    } else {
      missionText = `Ta mission est d'écrire **DIRECTEMENT LE CONTENU DU LIVRE** (le texte complet), sans sommaire. Puisque c'est un format de type "${length}", écris les chapitres avec le contenu final prêt à être lu. Rédige de façon fluide en utilisant le style demandé. Chaque grand point (chapitre) DOIT commencer sur une nouvelle page : place la balise <hr data-page-break> juste avant chaque titre <h1> de chapitre.`;
    }

    const purposeLabel: Record<string, string> = {
      inspiration: "s'en INSPIRER (idées et angles, sans copier)",
      learn: "en APPRENDRE le contenu (réutiliser faits, chiffres et connaissances)",
      style: "en REPRODUIRE le style et le ton",
      reference: "s'en servir comme RÉFÉRENCE",
    };
    const referenceBlock = referenceAnalysis
      ? `\n\n--- DOCUMENT DE RÉFÉRENCE FOURNI PAR L'AUTEUR${referenceName ? ` (${referenceName})` : ""} ---
L'auteur a importé un document et souhaite ${purposeLabel[referencePurpose as string] || purposeLabel.reference}. Voici l'analyse de ce document ; appuie-toi dessus pour écrire un livre plus riche et pertinent (sans jamais recopier de longs extraits mot pour mot) :
${referenceAnalysis}
--- FIN DU DOCUMENT DE RÉFÉRENCE ---`
      : "";

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
${referenceBlock}

${missionText}`;

    const result = streamText({
      model: getAiModel(selectedModelName),
      system: `Tu es un ghostwriter expert et rédacteur de livres professionnels.
IMPORTANT:
- Tu dois répondre UNIQUEMENT avec le contenu formaté en HTML valide (<h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <hr data-page-break>).
- ${includeToc ? "Le tout premier élément DOIT être le titre du sommaire en <h1> : soit <h1>Sommaire</h1>, soit <h1>Table des matières</h1> (à toi de choisir selon le livre)." : `Le tout premier élément DOIT être <h1>${title}</h1>.`}
- Pour commencer un grand point (chapitre) sur une nouvelle page, utilise la balise <hr data-page-break> juste avant son titre <h1>. Ne mets jamais deux <hr data-page-break> à la suite et n'en mets pas au tout début du document.
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
