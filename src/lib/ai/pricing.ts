/**
 * Économie des pièces (coins) — SOURCE UNIQUE de vérité.
 *
 * Ce module est PUR (aucune dépendance serveur/Supabase) pour être importable
 * partout : routes API, moteur de coût serveur, et composants client.
 *
 * Principe : les tokens des APIs IA ont un coût réel en USD. On convertit ce
 * coût en pièces en appliquant une MARGE (x4 à x5) qui couvre nos autres charges
 * et notre rentabilité. L'utilisateur ne voit JAMAIS de tokens — uniquement des
 * pièces. Le débit réel (serveur) utilise les tarifs EXACTS stockés en base
 * (table `ai_models`) ; les tarifs ci-dessous ne servent qu'aux ESTIMATIONS
 * affichées côté client avant génération.
 */

/** Valeur cible d'une pièce, en USD (avant marge). */
export const COIN_UNIT_USD = 0.00165;

/** Marge appliquée au coût réel (ajustable entre 4 et 5). */
export const COIN_MARGIN = 4;

/**
 * Facteur de conversion coût USD → pièces, marge incluse. C'EST LE LEVIER
 * DE RENTABILITÉ : plus il est haut, plus l'utilisateur consomme de pièces
 * pour un même coût API réel, donc plus la marge est élevée.
 *
 * Repères (marge nette selon le pack acheté, bonus inclus) :
 *   2500 → ~x2,9 (Author) … x4,1 (Starter)   [ancien]
 *   3500 -> x4 strict même sur le gros pack
 *   4000 -> ~x4,5 moyen
 *   14000 -> x23 (Nouveau levier de rentabilité : permet qu'1 livre de 70p en Flash coûte ~1000 pièces)
 */
export const COINS_PER_USD = 14000;

/** Convertit un coût en USD en pièces (arrondi au supérieur, minimum 1). */
export function usdToCoins(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 1;
  return Math.max(1, Math.ceil(usd * COINS_PER_USD));
}

/* ------------------------------------------------------------------ *
 * TARIFICATION À LA VALEUR — pièces par PAGE, par gamme de modèle.
 *
 * Le client ne voit jamais de tokens : écrire une page de livre coûte un
 * nombre FIXE de pièces selon le modèle. Plus le modèle est haut de gamme,
 * plus la page coûte cher. Le prix est ainsi DÉTERMINISTE (devis exact avant
 * génération), et toujours très au-dessus du coût API réel (marge garantie).
 * ------------------------------------------------------------------ */

/** Mots par page imprimée (référence pour convertir mots ↔ pages). */
export const WORDS_PER_PAGE = 275;

/** Pièces facturées par page rédigée, par modèle. */
export const COINS_PER_PAGE: Record<string, number> = {
  // Éco
  "gemini-2.5-flash": 20,
  "gemini-1.5-flash": 20,
  // Standard / recommandé
  "gpt-4o-mini": 30,
  // Premium
  "claude-sonnet-5": 50,
  "claude-3-5-sonnet-20240620": 50,
  "gpt-4o": 50,
  "gemini-2.5-pro": 50,
};

/** Tarif pièces/page d'un modèle (défaut prudent : 30, replis par famille). */
export function coinsPerPage(model: string): number {
  const known = COINS_PER_PAGE[model];
  if (known) return known;
  const m = (model || "").toLowerCase();
  if (m.includes("flash")) return 20;
  if (m.includes("mini")) return 30;
  if (m.includes("claude") || m.includes("opus") || m.includes("sonnet") || m.includes("gpt-4o") || m.includes("pro")) return 50;
  return 30;
}

/** Nombre de pages correspondant à un nombre de mots (arrondi au supérieur). */
export function pagesFromWords(words: number): number {
  if (!Number.isFinite(words) || words <= 0) return 0;
  return Math.ceil(words / WORDS_PER_PAGE);
}

/** Nombre de pages d'un texte HTML/brut (compte les mots hors balises). */
export function pagesFromText(text: string | undefined | null): number {
  if (!text) return 0;
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = plain ? plain.split(" ").length : 0;
  return pagesFromWords(words);
}

/** Coût FIXE d'une image de couverture générée par IA (forfait, indépendant du modèle). */
export const COVER_IMAGE_COINS = 200;

/**
 * Extrait les tokens (entrée/sortie) d'un objet `usage` renvoyé par le SDK IA,
 * de façon TOLÉRANTE au nommage. Le SDK `ai` a renommé ces champs en v5 :
 *   - v4 : `promptTokens` / `completionTokens`
 *   - v5+ : `inputTokens` / `outputTokens`
 * Lire le mauvais nom renvoie `undefined` → 0 token → sous-facturation massive
 * (un livre entier facturé au plancher de 1 pièce/chapitre). Cette fonction
 * accepte les deux conventions pour rester correcte quelle que soit la version.
 */
export function readUsageTokens(usage: unknown): { input: number; output: number } {
  const u = (usage ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
  return {
    input: num(u.inputTokens) || num(u.promptTokens),
    output: num(u.outputTokens) || num(u.completionTokens),
  };
}

/**
 * Estimation grossière du nombre de tokens à partir d'un texte (~4 caractères
 * par token). Sert UNIQUEMENT de filet de sécurité quand le provider ne renvoie
 * pas de compteur d'usage fiable, afin de ne jamais facturer 0/1 pièce pour une
 * génération réelle. Volontairement conservateur (n'over-facture pas).
 */
export function estimateTokensFromText(text: string | undefined | null): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Tarifs APPROXIMATIFS (USD / 1M tokens) par modèle, pour l'ESTIMATION seulement.
 * Le débit réel lit les tarifs exacts dans la table `ai_models`.
 */
export const MODEL_RATES_USD: Record<string, { in: number; out: number }> = {
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-2.5-pro": { in: 1.25, out: 10 },
  "gemini-1.5-flash": { in: 0.075, out: 0.3 },
  "gpt-4o": { in: 5, out: 15 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "claude-3-5-sonnet-20240620": { in: 3, out: 15 },
};

/**
 * Coût (pièces) d'un chapitre d'environ `words` mots avec `model` — désormais
 * calculé À LA PAGE (tarification à la valeur), plus au token. Le résultat est
 * exact : pages(mots) × tarif/page du modèle.
 */
export function estimateChapterCoins(words: number, model: string): number {
  return Math.max(1, pagesFromWords(words) * coinsPerPage(model));
}

/** Coût (pièces) d'un livre de `chapters` chapitres d'environ `words` mots chacun. */
export function estimateBookCoins(words: number, model: string, chapters: number): number {
  const totalWords = Math.max(1, words) * Math.max(1, chapters);
  return Math.max(1, pagesFromWords(totalWords) * coinsPerPage(model));
}

/** Coût (pièces) pour un nombre de pages donné avec un modèle — devis direct. */
export function estimatePagesCoins(pages: number, model: string): number {
  return Math.max(1, Math.max(1, Math.round(pages)) * coinsPerPage(model));
}
