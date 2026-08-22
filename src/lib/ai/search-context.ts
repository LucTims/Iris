import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

/**
 * Returns the AI model configured with or without Google Search grounding.
 *
 * Strategy (zero additional cost):
 * - Gemini models: pass `useSearchGrounding: true` directly — the model
 *   searches Google itself and grounds its response with real data.
 * - Non-Gemini models (GPT, Claude): we cannot attach Google grounding to
 *   them, so we do a lightweight pre-flight search via Gemini to collect
 *   factual context, then return it as a string to inject into the prompt.
 */

export function getAiModelWithSearch(modelId: string, useWebSearch: boolean) {
  if (modelId.startsWith("gpt-")) {
    return openai(modelId);
  } else if (modelId.startsWith("claude-")) {
    return anthropic(modelId);
  } else {
    return google(modelId, useWebSearch ? { useSearchGrounding: true } : {});
  }
}

export function getAiModel(modelId: string) {
  if (modelId.startsWith("gpt-")) {
    return openai(modelId);
  } else if (modelId.startsWith("claude-")) {
    return anthropic(modelId);
  } else {
    return google(modelId);
  }
}

function isGeminiModel(modelId: string): boolean {
  return !modelId.startsWith("gpt-") && !modelId.startsWith("claude-");
}

/**
 * For non-Gemini models: runs a quick Gemini search to collect real-world
 * facts, then returns them as a context block to inject into the prompt.
 * Returns empty string if search is disabled or if the model is Gemini
 * (which handles grounding natively via useSearchGrounding).
 */
export async function fetchSearchContext(
  modelId: string,
  useWebSearch: boolean,
  searchQuery: string
): Promise<string> {
  if (!useWebSearch) return "";
  if (isGeminiModel(modelId)) return "";

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash", { useSearchGrounding: true }),
      prompt: `Recherche des données factuelles récentes et vérifiées sur le sujet suivant. Retourne UNIQUEMENT une liste de faits clés avec leurs sources (URLs). Pas de commentaire, pas d'introduction. Maximum 10 faits.\n\nSujet : ${searchQuery}`,
      maxTokens: 800,
    });
    return text
      ? `\n\n--- DONNÉES FACTUELLES ISSUES DE RECHERCHES WEB (à utiliser en priorité) ---\n${text}\n--- FIN DES DONNÉES FACTUELLES ---\n`
      : "";
  } catch (err) {
    console.warn("Web search pre-flight failed (non-blocking):", err);
    return "\n\n[Note: La recherche web n'a pas pu aboutir. Si tu cites des chiffres ou des données, précise qu'ils doivent être vérifiés par l'auteur.]\n";
  }
}

export const SEARCH_GROUNDING_INSTRUCTION = `
IMPORTANT concernant les données factuelles :
- Si tu as accès à des résultats de recherche web (via le grounding Google Search), utilise ces données en priorité.
- Cite tes sources entre crochets quand tu mentionnes un chiffre, une date ou un fait précis. Exemple : "La capitalisation de la BRVM s'élève à 9 200 milliards FCFA [Source: BRVM.org, 2025]".
- Si tu n'as pas de données vérifiées sur un point précis, indique-le clairement : "(donnée à vérifier par l'auteur)".
- Ne jamais inventer de chiffres, de dates ou de noms propres sans source.`;
