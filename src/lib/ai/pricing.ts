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
 * Facteur de conversion coût USD → pièces, marge incluse.
 * 1 pièce ≈ COIN_UNIT_USD ; coût_pièces = coût_usd × MARGE / COIN_UNIT_USD.
 * Pour MARGE=4 → ≈2424 ; on retient 2500 (≈ x4,1) comme valeur historique.
 */
export const COINS_PER_USD = 2500;

/** Convertit un coût en USD en pièces (arrondi au supérieur, minimum 1). */
export function usdToCoins(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 1;
  return Math.max(1, Math.ceil(usd * COINS_PER_USD));
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

/** Coût estimé (pièces) d'un chapitre d'environ `words` mots avec `model`. */
export function estimateChapterCoins(words: number, model: string): number {
  const rate = MODEL_RATES_USD[model] || MODEL_RATES_USD["gemini-2.5-flash"];
  const inTokens = 1500; // système + contexte + sommaire
  const outTokens = Math.round(words * 1.6); // ~1,6 token par mot
  const usd = (inTokens * rate.in + outTokens * rate.out) / 1_000_000;
  return usdToCoins(usd);
}

/** Coût estimé (pièces) d'un livre de N chapitres. */
export function estimateBookCoins(words: number, model: string, chapters: number): number {
  return estimateChapterCoins(words, model) * Math.max(1, chapters);
}
