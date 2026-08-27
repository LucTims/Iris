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
