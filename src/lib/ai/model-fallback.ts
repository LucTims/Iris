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

import { canonicalModelId } from "./pricing";

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
  google: "gemini-3.6-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-5",
};

/**
 * Chaîne d'essai : le modèle demandé d'abord, puis un modèle de chaque AUTRE
 * fournisseur (une clé morte n'affecte jamais qu'un seul fournisseur).
 */
export function fallbackChain(preferred: string): string[] {
  // Identifiant canonique : `modelUsed` (donc la facturation) désigne toujours
  // le modèle réellement appelé, jamais un alias envoyé par le client.
  const wanted = preferred ? canonicalModelId(preferred) : DEFAULT_BY_PROVIDER.google;
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
  /**
   * URL d'images à joindre au prompt (flux multimodal « Vision-to-Story »).
   * Les trois fournisseurs de la chaîne de repli acceptent les images, donc le
   * repli reste valable : une panne Gemini ne fait pas perdre les visuels.
   */
  images?: string[];
  /** Nombre maximum de fournisseurs essayés (défaut 3). */
  maxAttempts?: number;
  /** Longueur maximale de la réponse (borne le coût de l'appel). */
  maxOutputTokens?: number;
}): Promise<FallbackResult> {
  // Imports PARESSEUX : le SDK IA n'est chargé qu'au moment de générer, ce qui
  // garde ce module importable (et testable) sans dépendance lourde.
  const [{ generateText }, { getAiModel }] = await Promise.all([
    import("ai"),
    import("./search-context"),
  ]);

  const chain = fallbackChain(opts.preferred).slice(0, Math.max(1, opts.maxAttempts ?? 3));
  const errors: string[] = [];
  const images = (opts.images || []).filter(Boolean);

  // Avec des images, on passe par `messages` (seule forme acceptant des parts
  // multimodales) ; sans image, on garde `prompt`, plus simple et inchangé.
  const payload = images.length
    ? {
        messages: [
          {
            role: "user" as const,
            content: [
              { type: "text" as const, text: opts.prompt },
              ...images.map((url) => ({ type: "image" as const, image: new URL(url) })),
            ],
          },
        ],
      }
    : { prompt: opts.prompt };

  for (let i = 0; i < chain.length; i++) {
    const modelId = chain[i];
    try {
      const res = await generateText({
        model: getAiModel(modelId),
        system: opts.system,
        ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
        ...payload,
      } as Parameters<typeof generateText>[0]);
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

  throw new Error(`${ALL_PROVIDERS_FAILED} ${errors.join(" | ")}`);
}

/** Début du message d'erreur levé quand aucun fournisseur n'a répondu. */
export const ALL_PROVIDERS_FAILED = "Tous les fournisseurs IA ont échoué.";

/** Morceau du flux complet d'une génération (`streamText(...).stream`) utile au repli. */
export interface FallbackStreamPart {
  type: string;
  text?: string;
  error?: unknown;
}

export interface FallbackStreamResult {
  /** Texte de la réponse, morceau par morceau. */
  textStream: ReadableStream<string>;
  /** Modèle qui produit réellement la réponse (c'est lui qui est facturé). */
  modelUsed: string;
  /** Erreurs des fournisseurs essayés avant celui-ci (diagnostic). */
  errors: string[];
  /**
   * Se résout quand la génération est lue jusqu'au bout — y compris si le
   * client coupe la connexion avant la fin. À passer à `after()` : le débit
   * (dans `onFinish`) n'a lieu qu'en fin de génération.
   */
  done: Promise<void>;
}

const errorText = (err: unknown): string =>
  err instanceof Error ? `${err.name}: ${err.message}` : String(err);

/**
 * Réponse EN FLUX avec repli automatique de fournisseur.
 *
 * Une erreur de fournisseur (crédit épuisé, quota, clé invalide) n'interrompt
 * pas un flux `streamText` : elle arrive comme un événement `error`, et le
 * flux de texte se termine simplement VIDE. Pour l'auteur, l'assistant
 * répondait donc… rien. Ici, on lit les premiers événements : tant qu'aucun
 * texte n'est sorti, une erreur fait basculer sur le fournisseur suivant. Dès
 * le premier morceau de texte, on reste sur ce fournisseur jusqu'au bout.
 *
 * `start(modelId)` lance la génération pour un modèle, ou renvoie `null` pour
 * le passer (par exemple si le solde ne couvre pas son coût).
 */
export async function streamTextWithFallback(opts: {
  preferred: string;
  start: (modelId: string) => Promise<{ stream: AsyncIterable<FallbackStreamPart> } | null>;
  maxAttempts?: number;
}): Promise<FallbackStreamResult> {
  const chain = fallbackChain(opts.preferred).slice(0, Math.max(1, opts.maxAttempts ?? 3));
  const errors: string[] = [];

  for (const modelId of chain) {
    let started: { stream: AsyncIterable<FallbackStreamPart> } | null;
    try {
      started = await opts.start(modelId);
    } catch (err) {
      errors.push(`${modelId}: ${errorText(err)}`);
      continue;
    }
    if (!started) {
      errors.push(`${modelId}: ignoré`);
      continue;
    }

    const it = started.stream[Symbol.asyncIterator]();
    let first: string | null = null;
    let failure: string | null = null;
    try {
      while (first === null && failure === null) {
        const { value, done } = await it.next();
        if (done) break;
        if (value.type === "error") failure = errorText(value.error);
        else if (value.type === "text-delta" && value.text) first = value.text;
      }
    } catch (err) {
      failure = errorText(err);
    }

    if (first === null) {
      errors.push(`${modelId}: ${failure ?? "réponse vide"}`);
      console.warn(`[model-fallback] ${modelId} n'a rien produit, essai du fournisseur suivant :`, failure ?? "réponse vide");
      void it.return?.();
      continue;
    }

    // Lecture de la suite. Le client peut couper avant la fin : on continue
    // alors à lire côté serveur, pour que la génération se termine (et soit
    // facturée) quoi qu'il arrive.
    let clientGone = false;
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => (resolveDone = resolve));
    const firstText = first;

    const nextText = async (): Promise<string | null> => {
      while (true) {
        const { value, done: finished } = await it.next();
        if (finished) return null;
        if (value.type === "text-delta" && value.text) return value.text;
        if (value.type === "error") {
          console.warn(`[model-fallback] ${modelId} : erreur en cours de réponse :`, errorText(value.error));
        }
      }
    };
    const drain = async () => {
      try {
        while ((await nextText()) !== null) {
          /* lecture jusqu'au bout */
        }
      } catch {
        /* fin de flux */
      } finally {
        resolveDone();
      }
    };

    const textStream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue(firstText);
      },
      async pull(controller) {
        if (clientGone) return;
        try {
          const text = await nextText();
          if (text === null) {
            controller.close();
            resolveDone();
          } else {
            controller.enqueue(text);
          }
        } catch {
          controller.close();
          resolveDone();
        }
      },
      cancel() {
        clientGone = true;
        void drain();
      },
    });

    return { textStream, modelUsed: modelId, errors, done };
  }

  throw new Error(`${ALL_PROVIDERS_FAILED} ${errors.join(" | ")}`);
}
