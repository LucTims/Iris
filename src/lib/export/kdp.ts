/**
 * Constantes et helpers pour l'export « KDP » (Kindle Direct Publishing).
 * Partagé client (studio de mise en page) et serveur (génération PDF).
 *
 * KDP impose des tailles de coupe (« trim sizes ») précises et des marges
 * intérieures (« gouttière » / reliure) qui dépendent du nombre de pages.
 * Ces valeurs viennent des spécifications KDP pour l'intérieur d'un livre broché.
 */

export const PT_PER_INCH = 72; // pdfmake travaille en points (1 pouce = 72 pt)

export interface KdpTrim {
  id: string;
  label: string;
  wIn: number;
  hIn: number;
}

/** Tailles de coupe brochées les plus courantes chez KDP. */
export const KDP_TRIMS: KdpTrim[] = [
  { id: "5x8", label: '5 × 8"', wIn: 5, hIn: 8 },
  { id: "5.25x8", label: '5,25 × 8"', wIn: 5.25, hIn: 8 },
  { id: "5.5x8.5", label: '5,5 × 8,5"', wIn: 5.5, hIn: 8.5 },
  { id: "6x9", label: '6 × 9" — le plus courant', wIn: 6, hIn: 9 },
  { id: "7x10", label: '7 × 10"', wIn: 7, hIn: 10 },
  { id: "8.5x11", label: '8,5 × 11"', wIn: 8.5, hIn: 11 },
];

export function getTrim(id: string): KdpTrim {
  return KDP_TRIMS.find((t) => t.id === id) || KDP_TRIMS[3]; // défaut 6×9
}

export function trimToPoints(t: KdpTrim): { width: number; height: number } {
  return { width: t.wIn * PT_PER_INCH, height: t.hIn * PT_PER_INCH };
}

/**
 * Marge intérieure (gouttière / reliure) minimale exigée par KDP selon le
 * nombre de pages. On renvoie la valeur recommandée (un cran au-dessus du
 * minimum strict) pour un rendu propre.
 */
export function gutterInches(pageCount: number): number {
  if (pageCount <= 150) return 0.5; // min KDP 0,375" — on recommande 0,5"
  if (pageCount <= 300) return 0.625;
  if (pageCount <= 500) return 0.75;
  if (pageCount <= 700) return 0.875;
  return 1.0;
}

/** Marge extérieure / haut / bas recommandée (KDP min 0,25"). */
export const OUTER_MARGIN_IN = 0.5;

/**
 * Estime grossièrement le nombre de pages imprimées à partir du nombre de mots,
 * ajusté à la taille de coupe (une page 8,5×11 contient plus de mots qu'une 5×8).
 * Sert uniquement à choisir automatiquement la bonne gouttière.
 */
export function estimatePages(words: number, t: KdpTrim): number {
  const areaFactor = (t.wIn * t.hIn) / (6 * 9);
  const wordsPerPage = Math.max(180, Math.round(320 * areaFactor));
  return Math.max(24, Math.ceil((words || 0) / wordsPerPage));
}

export interface KdpFont {
  id: string; // clé reconnue par SUPPORTED_PDF_FONTS (minuscule)
  label: string;
  serif: boolean;
}

/** Polices réellement embarquées dans le moteur PDF (voir src/lib/export/fonts). */
export const KDP_FONTS: KdpFont[] = [
  { id: "merriweather", label: "Merriweather (serif, lisible)", serif: true },
  { id: "lora", label: "Lora (serif, élégant)", serif: true },
  { id: "playfair display", label: "Playfair Display (serif, titres)", serif: true },
  { id: "montserrat", label: "Montserrat (sans serif)", serif: false },
  { id: "roboto", label: "Roboto (sans serif, neutre)", serif: false },
];

export interface KdpSettings {
  trim: string;
  fontFamily: string; // id KDP_FONTS
  fontSize: number; // pt, corps de texte
  lineHeight: number;
  includeTitlePage: boolean;
  includeCopyright: boolean;
  copyrightYear: string;
  author: string;
  includeToc: boolean;
  pageNumbers: boolean;
}

export const DEFAULT_KDP_SETTINGS: KdpSettings = {
  trim: "6x9",
  fontFamily: "merriweather",
  fontSize: 11,
  lineHeight: 1.4,
  includeTitlePage: true,
  includeCopyright: true,
  copyrightYear: String(new Date().getFullYear()),
  author: "",
  includeToc: true,
  pageNumbers: true,
};
