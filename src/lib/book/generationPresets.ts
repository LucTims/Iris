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
