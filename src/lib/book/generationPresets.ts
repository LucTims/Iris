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

/**
 * Longueurs proposées dans l'assistant de création. Le libellé enregistré sur
 * le projet (`projects.length`) reprend les MÊMES intervalles de pages que les
 * presets de génération : ce qui est annoncé à la création est ce qui est
 * rédigé et facturé dans l'éditeur.
 */
export const LENGTH_OPTIONS: { value: string; sizeKey: BookSizeKey }[] = [
  { value: "Court (5 à 20 pages)", sizeKey: "court" },
  { value: "Moyen (30 à 60 pages)", sizeKey: "moyen" },
  { value: "Long (70 pages et +)", sizeKey: "long" },
];

/** Associe le libellé de longueur d'un projet (anciens libellés compris) à un preset. */
export const lengthToSizeKey = (length: string | null | undefined): BookSizeKey =>
  /court/i.test(length || "") ? "court" : /long/i.test(length || "") ? "long" : "moyen";

/** Les 3 modèles proposés à l'auteur, du plus économique au premium. */
export const BOOK_MODELS = [
  { id: "gemini-3.6-flash", label: "Gemini Flash", hint: "Rapide et économique" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "Bon compromis qualité/prix" },
  { id: "claude-sonnet-5", label: "Claude Sonnet", hint: "Excellente qualité de rédaction" },
];

/** Libellé lisible d'un modèle (repli : l'identifiant brut). */
export const modelLabel = (id: string | null | undefined): string =>
  BOOK_MODELS.find((m) => m.id === id)?.label || id || BOOK_MODELS[0].label;

// Les estimateurs de coût en pièces vivent dans la source unique @/lib/ai/pricing.
export { estimateChapterCoins, estimateBookCoins, estimatePagesCoins, coinsPerPage } from "@/lib/ai/pricing";
