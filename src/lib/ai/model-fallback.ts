/**
 * REPLI AUTOMATIQUE ENTRE FOURNISSEURS.
 *
 * Constat terrain : une panne ne touche qu'UN fournisseur à la fois (clé Gemini
 * désactivée, quota OpenAI épuisé, Anthropic « Overloaded »…). Sans repli, le
 * livre entier échoue alors que deux autres fournisseurs répondent parfaitement.
 *
 * On essaie donc le modèle demandé, puis un modèle d'un AUTRE fournisseur, puis
 * d'un troisième. L'auteur obtient son texte quoi qu'il arrive ; on facture le
 * modèle qui a RÉELLEMENT produit le texte.
 */

export type Provider = "google" | "openai" | "anthropic";

/** Fournisseur d'un identifiant de modèle (même logique que getAiModel). */
export function providerOf(modelId: string): Provider {
  const m = (modelId || "").toLowerCase();
  if (m.startsWith("gpt-") || m.startsWith("chatgpt") || m.startsWith("o1") || m.startsWith("o3")) return "openai";
  if (m.startsWith("claude")) return "anthropic";
  return "google";
}

/** Modèle représentatif de chaque fournisseur, utilisé comme secours. */
const DEFAULT_BY_PROVIDER: Record<Provider, string> = {
  google: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
};

/**
 * Chaîne d'essai : le modèle demandé d'abord, puis un modèle de chaque AUTRE
 * fournisseur (une clé morte n'affecte jamais qu'un seul fournisseur).
 */
export function fallbackChain(preferred: string): string[] {
  const wanted = preferred || DEFAULT_BY_PROVIDER.google;
  const own = providerOf(wanted);
  const others: Provider[] = (["openai", "google", "anthropic"] as Provider[]).filter((p) => p !== own);
  const chain = [wanted, ...others.map((p) => DEFAULT_BY_PROVIDER[p])];
  return Array.from(new Set(chain));
}

export interface FallbackResult {
  text: string;
  modelUsed: string;
  usage: unknown;
  fellBack: boolean;
  /** Erreurs rencontrées avant le succès (diagnostic). */
  errors: string[];
}

/**
 * Génère un texte en basculant automatiquement de fournisseur en cas d'échec.
 * Lève une erreur seulement si TOUS les fournisseurs échouent.
 */
export async function generateWithFallback(opts: {
  preferred: string;
  /** Consigne système. Facultative : certains appels (structure du livre) n'en
   * ont pas besoin et tout mettent dans le prompt. */
  system?: string;
  prompt: string;
  /** Nombre maximum de fournisseurs essayés (défaut 3). */
  maxAttempts?: number;
}): Promise<FallbackResult> {
  // Imports PARESSEUX : le SDK IA n'est chargé qu'au moment de générer, ce qui
  // garde ce module importable (et testable) sans dépendance lourde.
  const [{ generateText }, { getAiModel }] = await Promise.all([
    import("ai"),
    import("./search-context"),
  ]);

  const chain = fallbackChain(opts.preferred).slice(0, Math.max(1, opts.maxAttempts ?? 3));
  const errors: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const modelId = chain[i];
    try {
      const res = await generateText({
        model: getAiModel(modelId),
        system: opts.system,
        prompt: opts.prompt,
      });
      const text = (res.text || "").trim();
      // Un texte vide est un échec déguisé (quota/refus) : on tente le suivant.
      if (!text) {
        errors.push(`${modelId}: réponse vide`);
        continue;
      }
      return { text, modelUsed: modelId, usage: res.usage, fellBack: i > 0, errors };
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      errors.push(`${modelId}: ${msg}`);
      console.warn(`[model-fallback] ${modelId} a échoué, essai du fournisseur suivant :`, msg);
    }
  }

  throw new Error(`Tous les fournisseurs IA ont échoué. ${errors.join(" | ")}`);
}
