/**
 * TYPOGRAPHIE DU LIVRE — les couples de polices (corps + titres) proposés à
 * l'auteur. Jusqu'ici la police était imposée par la catégorie, sans choix
 * possible : un livre de finance recevait des titres Montserrat (une police de
 * présentation) même quand l'auteur voulait un rendu de livre classique.
 *
 * Toutes les familles citées sont embarquées en TTF (fontRegistry) : ce que
 * l'auteur choisit dans l'éditeur est exactement ce qui sort à l'export PDF.
 */

import type { WorkType } from "@/lib/book/work-type";

export interface TypographyPreset {
  id: string;
  label: string;
  /** Pour quels livres ce couple est pensé. */
  hint: string;
  /** Clés pdfmake (voir fontRegistry) : corps du texte. */
  body: string;
  /** Clés pdfmake : titres. */
  display: string;
}

export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  { id: "classique", label: "Classique", hint: "Roman, littérature, poésie", body: "EBGaramond", display: "EBGaramond" },
  { id: "litteraire", label: "Littéraire", hint: "Fiction, récit, aventure", body: "Lora", display: "PlayfairDisplay" },
  { id: "elegante", label: "Élégante", hint: "Romance, mémoires, biographie", body: "Lora", display: "CormorantGaramond" },
  { id: "essai", label: "Essai", hint: "Développement personnel, essai", body: "SourceSerif4", display: "LibreBaskerville" },
  { id: "moderne", label: "Moderne", hint: "Business, finance, management", body: "Merriweather", display: "Montserrat" },
  { id: "pratique", label: "Pratique", hint: "Guide, manuel, formation", body: "PTSerif", display: "Inter" },
  { id: "polar", label: "Polar", hint: "Thriller, policier, suspense", body: "PTSerif", display: "Montserrat" },
  { id: "jeunesse", label: "Jeunesse", hint: "Albums et livres pour enfants", body: "Nunito", display: "Poppins" },
];

export function getTypographyPreset(id: string | null | undefined): TypographyPreset | null {
  return TYPOGRAPHY_PRESETS.find((p) => p.id === id) || null;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Couple conseillé quand l'auteur n'a rien choisi, d'après la catégorie (et le
 * ton en repli). `isFiction` départage les catégories inconnues.
 */
export function defaultTypographyId(
  category: string | null | undefined,
  tone: string | null | undefined,
  isFiction: boolean,
  workType?: WorkType | null
): string {
  const hay = normalize(`${category || ""} ${tone || ""}`);
  const has = (...kws: string[]) => kws.some((k) => hay.includes(k));
  if (workType === "storybook" || has("jeunesse", "enfant", "young adult", "conte")) return "jeunesse";
  if (has("romance", "sentimental", "biographie", "memoire", "autobiographie", "temoignage")) return "elegante";
  if (has("thriller", "policier", "polar", "suspense", "horreur")) return "polar";
  if (has("poesie", "poeme")) return "classique";
  if (has("business", "finance", "management", "entreprise", "marketing", "economie")) return "moderne";
  if (has("developpement personnel", "bien-etre", "bien etre", "self", "motivation", "coaching", "spiritualite", "essai")) return "essai";
  if (workType === "guide" || has("academique", "histoire", "science", "technique", "manuel", "education", "scolaire", "guide")) {
    return "pratique";
  }
  if (isFiction) return "litteraire";
  return "moderne";
}

/** Feuille Google Fonts limitée aux familles des presets (aperçu dans les choix). */
export function typographyFontsUrl(cssFamilyOf: (pdfKey: string) => string): string {
  const families = Array.from(new Set(TYPOGRAPHY_PRESETS.flatMap((p) => [p.body, p.display]))).map(
    (key) => `family=${cssFamilyOf(key).replace(/ /g, "+")}:ital,wght@0,400;0,700;1,400`
  );
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
