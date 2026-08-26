import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductGenerationCost } from "@/lib/ai/cost-engine";
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
      projectId,
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
      // MODE SOMMAIRE : on ne rédige PAS le livre entier ici (ce serait trop long
      // et dépasserait la limite de temps). On produit UNIQUEMENT un sommaire dont
      // chaque chapitre est accompagné d'un aperçu de 1 à 2 phrases. Le contenu
      // complet sera écrit ensuite, chapitre par chapitre, via « Générer tout le livre ».
      missionText = `Ta mission est de produire UNIQUEMENT le **SOMMAIRE** du livre (surtout PAS le contenu complet des chapitres).

Consignes :
1. Choisis le libellé le plus adapté : écris **Table des matières** pour un ouvrage formel, académique, technique ou professionnel, sinon **Sommaire**. C'est le titre <h1> tout en haut.
2. Liste les grands chapitres sous forme de liste à puces (<ul><li>…</li></ul>). Reste CONCIS sur le nombre de chapitres (ni trop peu, ni surdécoupé).
3. Pour CHAQUE chapitre, mets le titre du chapitre dans une balise <strong>, suivi d'un tiret «— » puis d'un **aperçu de 1 à 2 phrases** décrivant ce que le chapitre couvrira. Exemple : <li><strong>Chapitre 1 : Le titre</strong> — Aperçu en une ou deux phrases de ce que contiendra ce chapitre.</li>
4. N'écris AUCUN contenu de chapitre, aucun paragraphe de corps de texte, aucune balise <hr data-page-break>. Uniquement le titre <h1> puis la liste.`;
    } else {
      // MODE SANS SOMMAIRE : l'auteur ne veut pas de sommaire dans le livre. On
      // produit un « prototype » léger (concept + angle + court extrait + structure
      // esquissée en prose) qui servira de base pour enrichir la génération quand
      // l'auteur cliquera sur « Générer tout le livre ».
      missionText = `Ta mission est de produire un **PROTOTYPE** léger du livre (surtout PAS le livre complet).

Le tout premier élément DOIT être <h1>Prototype du livre</h1>. Ensuite, en quelques paragraphes brefs :
1. **L'angle et la promesse** : de quoi parle le livre, à qui il s'adresse, ce qu'il apporte.
2. **Le ton** : un court extrait d'ouverture (2 à 4 phrases) qui illustre le style.
3. **La structure envisagée** : décris en prose (pas en liste formelle) les grandes parties/idées que le livre pourrait suivre.

Ce prototype doit rester COURT (il sert de base de travail, pas de livre fini). N'utilise pas de balise <hr data-page-break>.`;
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
- ${includeToc ? "Le tout premier élément DOIT être le titre du sommaire en <h1> : soit <h1>Sommaire</h1>, soit <h1>Table des matières</h1> (à toi de choisir selon le livre)." : "Le tout premier élément DOIT être <h1>Prototype du livre</h1>."}
- N'utilise JAMAIS de Markdown (pas de **, pas de #, pas de \`\`\`).
- NE FAIS AUCUNE SALUTATION (ne dis pas "Bonjour", ni "Voici le contenu", ni "Absolument", ni "En tant qu'IA").
- Commence directement par la balise <h1>.
- Quand le contenu contient des données comparatives, des listes de critères chiffrés ou des informations tabulaires, présente-les dans un tableau HTML bien structuré.
- Ne rajoute aucun commentaire personnel à la fin, sois purement factuel et professionnel dans l'exécution de la tâche.
${searchContext}
${useWebSearch ? SEARCH_GROUNDING_INSTRUCTION : ""}`,
      prompt: prompt,
      async onFinish({ usage, text }) {
        await deductGenerationCost(
          user.id,
          selectedModelName,
          usage,
          `Génération du Plan: ${title}`,
          { projectId, outputText: text }
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
