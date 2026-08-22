import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

export type AiProvider = "google" | "openai" | "anthropic";

/**
 * Résout le provider IA à partir du préfixe de l'identifiant de modèle.
 * Centralise une logique auparavant dupliquée dans plusieurs routes API.
 */
export function resolveAiProvider(modelId: string): AiProvider {
  if (modelId.startsWith("gpt-")) {
    return "openai";
  }
  if (modelId.startsWith("claude-")) {
    return "anthropic";
  }
  return "google";
}

/**
 * Instancie le modèle IA (Vercel AI SDK) correspondant à un identifiant de modèle.
 */
export function getAiModel(modelId: string) {
  const provider = resolveAiProvider(modelId);
  switch (provider) {
    case "openai":
      return openai(modelId);
    case "anthropic":
      return anthropic(modelId);
    case "google":
    default:
      return google(modelId, { useSearchGrounding: true });
  }
}
