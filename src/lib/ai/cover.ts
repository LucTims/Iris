/**
 * Génération d'images de couverture — logique pure et partagée (construction du
 * prompt, choix du fournisseur, URL Pollinations). Isolée ici pour être
 * testable sans réseau ni Supabase.
 *
 * Deux moteurs :
 *   - "free"    : Pollinations.ai (gratuit, sans clé) — modèles Flux puis Turbo.
 *   - "premium" : Gemini Image (« nano banana ») puis Imagen, facturé en pièces.
 */

export type CoverEngine = "free" | "premium";

/** Dimensions portrait type couverture de livre (ratio ~1:1.5). */
export const COVER_WIDTH = 768;
export const COVER_HEIGHT = 1152;

/**
 * Longueur maximale du prompt envoyé dans l'URL Pollinations.
 *
 * Le prompt passe par la direction artistique Gemini, qui renvoie facilement
 * 1 000+ caractères. Une fois `encodeURIComponent` appliqué (les espaces et la
 * ponctuation triplent de taille), l'URL dépassait la limite pratique des
 * proxys HTTP (~2 000 caractères) et la requête était rejetée avant même
 * d'atteindre le modèle — le mode gratuit échouait donc systématiquement.
 */
export const MAX_URL_PROMPT_CHARS = 700;

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
  if (base) {
    return base;
  }

  const parts = [
    input.title ? `Title theme: ${input.title}` : "",
    input.category ? `Genre: ${input.category}` : "",
    input.tone ? `Mood and atmosphere: ${input.tone}` : "",
    input.synopsis ? `Story premise: ${input.synopsis}` : "",
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(". ")
    : "An inspiring and captivating scenic artwork with cinematic lighting and rich atmosphere";
}

/** Tronque sur une frontière de mot, sans couper un mot en deux. */
export function truncatePrompt(prompt: string, maxChars = MAX_URL_PROMPT_CHARS): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;

  const cut = clean.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

/** Jeton Pollinations optionnel (auth.pollinations.ai) : débloque `nologo` et relève le quota. */
export function pollinationsToken(): string | undefined {
  return process.env.POLLINATIONS_TOKEN || process.env.POLLINATIONS_API_KEY;
}

/** Identifiant d'application envoyé à Pollinations (recommandé pour les appels serveur). */
export function pollinationsReferrer(): string {
  return (
    process.env.POLLINATIONS_REFERRER ||
    (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "") ||
    "iris.app"
  );
}

/** Modèles Pollinations essayés dans l'ordre : Flux (qualité) puis Turbo (rapide, moins saturé). */
export const POLLINATIONS_MODELS = ["flux", "turbo"] as const;

export interface PollinationsOptions {
  seed?: number;
  model?: string;
  /** Un jeton est présent : on peut alors demander `nologo`. */
  authenticated?: boolean;
  referrer?: string;
}

/**
 * URL Pollinations (GET renvoie directement l'image).
 *
 * `nologo` est un paramètre RÉSERVÉ AUX COMPTES AUTHENTIFIÉS : l'envoyer sans
 * jeton faisait rejeter la requête. On ne l'ajoute donc que si un jeton est
 * configuré. Le prompt est tronqué pour garder une URL de taille raisonnable.
 */
export function pollinationsUrl(prompt: string, opts: PollinationsOptions = {}): string {
  const encoded = encodeURIComponent(truncatePrompt(prompt));
  const params = new URLSearchParams({
    width: String(COVER_WIDTH),
    height: String(COVER_HEIGHT),
    model: opts.model || POLLINATIONS_MODELS[0],
    referrer: opts.referrer ?? pollinationsReferrer(),
    ...(opts.authenticated ? { nologo: "true" } : {}),
    ...(opts.seed !== undefined ? { seed: String(opts.seed) } : {}),
  });
  return `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`;
}

/**
 * Modèles d'image Gemini (« nano banana »), essayés dans l'ordre.
 *
 * C'est LE moteur premium qui fonctionne réellement ici : il utilise la même
 * clé `GOOGLE_GENERATIVE_AI_API_KEY` que toute la rédaction, via l'endpoint
 * `generateContent` classique. Imagen, lui, passe par `:predict` et n'est
 * ouvert qu'aux clés Google avec facturation activée — d'où les 403 qui
 * faisaient échouer le premium.
 */
export const GEMINI_IMAGE_MODELS: string[] = (
  process.env.GEMINI_IMAGE_MODELS || "gemini-3.1-flash-image,gemini-2.5-flash-image"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

/** Modèle Imagen par défaut (repli premium, nécessite une clé Google facturée). */
export const IMAGEN_MODEL = process.env.IMAGEN_MODEL || "imagen-4.0-fast-generate-001";

/**
 * Moteurs considérés comme réellement PREMIUM. Si le pipeline retombe sur un
 * moteur hors de cette liste (Pollinations, gratuit et sans clé), l'auteur ne
 * doit PAS être facturé au tarif premium : il n'a pas obtenu ce qu'il a payé.
 */
export function isPremiumProvider(usedModel: string): boolean {
  return (
    usedModel.startsWith("google/") ||
    usedModel.startsWith("openai/") ||
    usedModel.startsWith("huggingface/")
  );
}
