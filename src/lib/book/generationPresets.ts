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
  /** Nombre de pages représentatif pour le DEVIS (pièces = pages × tarif/page). */
  pagesEstimate: number;
}

export const SIZE_PRESETS: Record<BookSizeKey, BookSizePreset> = {
  court: {
    key: "court",
    label: "Court",
    pages: "5 à 20 pages",
    desc: "Guide, lead magnet, nouvelle",
    wordsPerChapter: 700,
    chaptersIfNoSommaire: 6,
    pagesEstimate: 18,
  },
  moyen: {
    key: "moyen",
    label: "Moyen",
    pages: "30 à 60 pages",
    desc: "Livre standard",
    wordsPerChapter: 1500,
    chaptersIfNoSommaire: 9,
    pagesEstimate: 50,
  },
  long: {
    key: "long",
    label: "Long",
    pages: "70 pages et +",
    desc: "Manuel, essai, fresque",
    wordsPerChapter: 2600,
    chaptersIfNoSommaire: 12,
    pagesEstimate: 100,
  },
};

/** Les 3 modèles proposés à l'auteur, du plus économique au premium. */
export const BOOK_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Rapide et économique" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "Bon compromis qualité/prix" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude Sonnet 3.5", hint: "Excellente qualité de rédaction" },
];

// Les estimateurs de coût en pièces vivent dans la source unique @/lib/ai/pricing.
export { estimateChapterCoins, estimateBookCoins, estimatePagesCoins, coinsPerPage } from "@/lib/ai/pricing";
