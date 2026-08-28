/**
 * Génération d'images de couverture — logique pure et partagée (construction du
 * prompt, choix du fournisseur, URL Pollinations). Isolée ici pour être
 * testable sans réseau ni Supabase.
 *
 * Deux moteurs :
 *   - "free"    : Pollinations.ai (gratuit, sans clé) — modèle Flux.
 *   - "premium" : Google Imagen (via @ai-sdk/google), facturé en pièces.
 */

export type CoverEngine = "free" | "premium";

/** Dimensions portrait type couverture de livre (ratio ~1:1.5). */
export const COVER_WIDTH = 768;
export const COVER_HEIGHT = 1152;

export interface CoverPromptInput {
  title?: string;
  subtitle?: string;
  category?: string;
  synopsis?: string;
  tone?: string;
  /** Consigne libre de l'auteur (prioritaire). Si absente → prompt auto. */
  userPrompt?: string;
}

/**
 * Construit un prompt de couverture riche. En mode auto (pas de consigne
 * utilisateur), on dérive une description depuis les métadonnées du livre.
 * On demande explicitement une illustration SANS texte : le titre est ajouté
 * proprement par-dessus dans le studio (typographie maîtrisée), pas laissé au
 * modèle d'image (qui écrit mal le texte).
 */
export function buildCoverPrompt(input: CoverPromptInput): string {
  const base = (input.userPrompt || "").trim();
  const descriptive =
    base ||
    [
      input.synopsis ? `Scène évoquant : ${input.synopsis}` : "",
      input.category ? `Genre : ${input.category}` : "",
      input.tone ? `Ambiance : ${input.tone}` : "",
      input.title ? `Livre intitulé « ${input.title} »` : "",
    ]
      .filter(Boolean)
      .join(". ");

  const subject = descriptive || "Couverture de livre élégante et évocatrice";

  return [
    `Illustration de couverture de livre professionnelle, verticale (format portrait).`,
    subject + ".",
    `Composition soignée, éclairage cinématographique, haute qualité, adaptée à l'impression.`,
    `IMPORTANT : aucune lettre, aucun mot, aucun texte dans l'image (le titre sera ajouté séparément).`,
  ].join(" ");
}

/** URL Pollinations (GET renvoie directement l'image). */
export function pollinationsUrl(prompt: string, seed?: number): string {
  const encoded = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width: String(COVER_WIDTH),
    height: String(COVER_HEIGHT),
    nologo: "true",
    model: "flux",
    ...(seed !== undefined ? { seed: String(seed) } : {}),
  });
  return `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`;
}

/** Modèle Imagen par défaut (rapide/bon marché) pour le premium. */
export const IMAGEN_MODEL = "imagen-3.0-fast-generate-001";
