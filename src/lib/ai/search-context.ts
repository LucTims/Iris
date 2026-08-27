import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

/**
 * Web search grounding helpers (zero additional cost).
 *
 * IMPORTANT — API compatibility:
 * With @ai-sdk/google v4 + ai v7, the old `useSearchGrounding: true` model
 * option no longer exists. Google Search grounding is now exposed as a
 * provider-executed TOOL: `google.tools.googleSearch()`, passed via the
 * `tools` parameter of streamText/generateText. Google runs the search
 * server-side and grounds the answer in the same generation (no extra
 * client round-trip, included in the Gemini API pricing already paid).
 *
 * Strategy (robust — never breaks the main answer):
 * The googleSearch tool is UNRELIABLE inside a streaming call
 * (streamText + toTextStreamResponse can abort the stream). So we never
 * attach it to the streaming generation. Instead, for EVERY model, we run
 * a lightweight NON-streaming pre-flight call (fetchSearchContext) that
 * uses the googleSearch tool, wrapped in try/catch, to collect real facts.
 * Those facts are injected into the prompt as plain text, and the final
 * answer is then streamed without any tool. If grounding fails (key without
 * grounding access, SDK mismatch, quota…), the pre-flight degrades to an
 * empty/soft note and the model still answers from its own knowledge.
 */

export function getAiModel(modelId: string) {
  if (modelId.startsWith("gpt-")) {
    return openai(modelId);
  } else if (modelId.startsWith("claude-")) {
    return anthropic(modelId);
  } else {
    return google(modelId);
  }
}

/**
 * Backward-compatible alias. The grounding is no longer configured on the
 * model itself (see getSearchTools), so this simply returns the plain model.
 */
export function getAiModelWithSearch(modelId: string, _useWebSearch: boolean) {
  return getAiModel(modelId);
}

function isGeminiModel(modelId: string): boolean {
  return !modelId.startsWith("gpt-") && !modelId.startsWith("claude-");
}

/**
 * Returns the `tools` object to pass to streamText/generateText so the model
 * can search Google in real time. Only Gemini models support native Google
 * grounding, so we return the tool only for them (and only when web search is
 * enabled). For every other case we return `undefined` — passing that to the
 * `tools` param is a safe no-op.
 *
 * Defensive: if the running SDK build does not expose google.tools.googleSearch
 * we return undefined instead of throwing, so a route never 500s over search.
 */
export function getSearchTools(modelId: string, useWebSearch: boolean) {
  if (!useWebSearch || !isGeminiModel(modelId)) return undefined;
  try {
    const tools = (google as unknown as { tools?: { googleSearch?: (args: object) => unknown } }).tools;
    if (tools && typeof tools.googleSearch === "function") {
      return { google_search: tools.googleSearch({}) } as Record<string, unknown>;
    }
  } catch (err) {
    console.warn("Google Search tool unavailable, continuing without grounding:", err);
  }
  return undefined;
}

/**
 * Runs a quick NON-streaming Gemini + Google Search call to collect
 * real-world facts, then returns them as a context block to inject into the
 * prompt. Runs for EVERY model (Gemini included) because the search tool is
 * unreliable inside the streamed answer. Returns an empty string when search
 * is disabled, and a soft note (never throws) when grounding is unavailable
 * so the caller can still answer from the model's own knowledge.
 */
export async function fetchSearchContext(
  _modelId: string,
  useWebSearch: boolean,
  searchQuery: string
): Promise<string> {
  if (!useWebSearch) return "";
  if (!searchQuery || !searchQuery.trim()) return "";

  const tools = getSearchTools("gemini-2.5-flash", true);
  // Grounding tool not available in this SDK build: skip silently, the
  // model will answer from its own knowledge.
  if (!tools) return "";

  // GARDE-FOU CRITIQUE : ce pré-flight s'exécute AVANT le stream principal et
  // partage le même budget de temps (maxDuration = 60 s). Un try/catch seul ne
  // protège PAS d'un appel qui « pend » (grounding Google lent, throttlé ou
  // bloqué) : sans limite, il peut consommer toute la fenêtre et faire tuer la
  // génération principale → le stream se coupe sans texte et onFinish (donc le
  // débit des pièces) ne s'exécute jamais. On borne donc l'appel avec un
  // AbortController : passé le délai, on annule et on continue SANS grounding
  // (le modèle répond depuis ses connaissances). La recherche web est un bonus,
  // jamais un point de défaillance de l'écriture du livre.
  const controller = new AbortController();
  const PREFLIGHT_TIMEOUT_MS = 12_000;
  const timeout = setTimeout(() => controller.abort(), PREFLIGHT_TIMEOUT_MS);

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      tools,
      abortSignal: controller.signal,
      prompt: `Recherche des données factuelles récentes et vérifiées sur le sujet suivant. Retourne UNIQUEMENT une liste de faits clés avec leurs sources (URLs). Pas de commentaire, pas d'introduction. Maximum 10 faits.\n\nSujet : ${searchQuery}`,
    });
    return text && text.trim()
      ? `\n\n--- DONNÉES FACTUELLES ISSUES DE RECHERCHES WEB (à utiliser en priorité) ---\n${text}\n--- FIN DES DONNÉES FACTUELLES ---\n`
      : "";
  } catch (err) {
    // Inclut l'annulation par timeout (AbortError) : dans tous les cas on
    // dégrade proprement vers « pas de grounding » sans jamais bloquer la suite.
    console.warn("Web search pre-flight ignoré (non bloquant):", err);
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export const SEARCH_GROUNDING_INSTRUCTION = `
IMPORTANT concernant les données factuelles :
- Si tu as accès à des résultats de recherche web (via Google Search), utilise ces données en priorité.
- Cite tes sources entre crochets quand tu mentionnes un chiffre, une date ou un fait précis. Exemple : "La capitalisation de la BRVM s'élève à 9 200 milliards FCFA [Source: BRVM.org, 2025]".
- Si tu n'as pas de données vérifiées sur un point précis, indique-le clairement : "(donnée à vérifier par l'auteur)".
- Ne jamais inventer de chiffres, de dates ou de noms propres sans source.`;
