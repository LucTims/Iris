export type BookSizeKey = "court" | "moyen" | "long";

export interface BookSizePreset {
  key: BookSizeKey;
  label: string;
  pages: string;
  desc: string;
  /** Cible de mots par chapitre passée à l'IA. */
  wordsPerChapter: number;
  /** Nombre de chapitres proposé quand il n'y a pas de sommaire. */
  chaptersIfNoSommaire: number;
}

export const SIZE_PRESETS: Record<BookSizeKey, BookSizePreset> = {
  court: {
    key: "court",
    label: "Court",
    pages: "≈ 5 – 30 pages",
    desc: "Guide, lead magnet, nouvelle",
    wordsPerChapter: 700,
    chaptersIfNoSommaire: 6,
  },
  moyen: {
    key: "moyen",
    label: "Moyen",
    pages: "≈ 40 – 60 pages",
    desc: "Livre standard",
    wordsPerChapter: 1500,
    chaptersIfNoSommaire: 9,
  },
  long: {
    key: "long",
    label: "Long",
    pages: "≈ 70 pages et +",
    desc: "Manuel, essai, fresque",
    wordsPerChapter: 2600,
    chaptersIfNoSommaire: 12,
  },
};

export const BOOK_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Rapide et économique" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Plus poussé (selon votre plan)" },
  { id: "gpt-4o", label: "GPT-4o", hint: "Polyvalent et fiable" },
  { id: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet", hint: "Excellent en rédaction" },
];

/**
 * Tarifs APPROXIMATIFS (USD par million de tokens) pour estimer le coût en
 * pièces AVANT génération. Le débit réel se fait côté serveur ; ces valeurs ne
 * servent qu'à donner un ordre de grandeur à l'utilisateur.
 */
const MODEL_RATES: Record<string, { in: number; out: number }> = {
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-2.5-pro": { in: 1.25, out: 10 },
  "gpt-4o": { in: 2.5, out: 10 },
  "claude-3-5-sonnet-20240620": { in: 3, out: 15 },
};

// Même facteur de conversion USD → pièces que le moteur de coût serveur.
const USD_TO_COINS = 2500;

/** Estimation (approximative) du coût en pièces d'un chapitre. */
export function estimateChapterCoins(words: number, model: string): number {
  const rate = MODEL_RATES[model] || MODEL_RATES["gemini-2.5-flash"];
  const inTokens = 1500; // système + contexte + sommaire
  const outTokens = Math.round(words * 1.6); // ~1,6 token par mot
  const usd = (inTokens * rate.in + outTokens * rate.out) / 1_000_000;
  return Math.max(1, Math.ceil(usd * USD_TO_COINS));
}

/** Estimation du coût total pour N chapitres. */
export function estimateBookCoins(words: number, model: string, chapters: number): number {
  return estimateChapterCoins(words, model) * Math.max(1, chapters);
}
