import { FONT_LIBRARY } from "@/lib/export/fontRegistry";

/**
 * Style d'export choisi par l'auteur (fenêtre d'export, outil MCP). Module sans
 * dépendance Node : importé aussi bien côté navigateur que côté serveur.
 * Tout champ absent garde le comportement automatique (police selon le genre,
 * format selon « numérique / impression », sommaire selon le projet).
 */
export interface ExportStyle {
  /** Clé pdfmake de la police du texte (voir FONT_LIBRARY). */
  bodyFont?: string;
  /** Clé pdfmake de la police des titres. */
  headingFont?: string;
  /** Couleur d'accent (#rrggbb) : fleurons, filets, étiquettes de chapitre, sommaire. */
  accentColor?: string;
  pageFormat?: PageFormatKey;
  /** Ajouter un sommaire paginé en tête du livre. */
  includeToc?: boolean;
}

export type PageFormatKey = "a4" | "letter" | "a5" | "6x9" | "5.5x8.5" | "5x8";

export interface PageFormatDef {
  key: PageFormatKey;
  label: string;
  hint: string;
  width: number;
  height: number;
  /** Format de livre relié : numéros de page à l'extérieur, marges de gouttière. */
  trim: boolean;
}

export const PAGE_FORMATS: PageFormatDef[] = [
  { key: "a4", label: "A4", hint: "Lecture à l'écran, impression bureau", width: 595.28, height: 841.89, trim: false },
  { key: "letter", label: "US Letter", hint: "Format bureau américain", width: 612, height: 792, trim: false },
  { key: "6x9", label: "6 × 9 po", hint: "Standard Amazon KDP (non-fiction)", width: 432, height: 648, trim: true },
  { key: "5.5x8.5", label: "5,5 × 8,5 po", hint: "Roman, développement personnel", width: 396, height: 612, trim: true },
  { key: "5x8", label: "5 × 8 po", hint: "Roman de poche", width: 360, height: 576, trim: true },
  { key: "a5", label: "A5", hint: "Livre broché européen", width: 419.53, height: 595.28, trim: true },
];

export const ACCENT_COLORS: { value: string; label: string }[] = [
  { value: "#b08d57", label: "Or antique" },
  { value: "#1f2937", label: "Encre" },
  { value: "#1e3a8a", label: "Bleu nuit" },
  { value: "#7f1d1d", label: "Bordeaux" },
  { value: "#065f46", label: "Vert forêt" },
  { value: "#c2410c", label: "Terre cuite" },
  { value: "#6d28d9", label: "Violet" },
];

/** Polices proposées à l'export : celles qui conviennent à un texte long ou à des titres. */
export const EXPORT_BODY_FONTS = FONT_LIBRARY.filter((f) => f.category === "Serif" || f.category === "Sans-serif");
export const EXPORT_HEADING_FONTS = FONT_LIBRARY.filter(
  (f) => f.category === "Serif" || f.category === "Sans-serif" || f.category === "Display"
);

const FONT_KEYS = new Set(FONT_LIBRARY.map((f) => f.pdf));

/** Accepte une clé pdfmake (« EBGaramond ») ou un nom CSS (« EB Garamond »). */
export function resolveFontKey(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const v = value.trim();
  if (FONT_KEYS.has(v)) return v;
  const byName = FONT_LIBRARY.find(
    (f) => f.css.toLowerCase() === v.toLowerCase() || f.label.toLowerCase() === v.toLowerCase()
  );
  return byName?.pdf;
}

export function resolvePageFormat(value: unknown): PageFormatKey | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase().replace(/\s+/g, "").replace(/[×*]/g, "x").replace(",", ".");
  const alias: Record<string, PageFormatKey> = { kdp: "6x9", print: "6x9", digital: "a4", usletter: "letter", lettre: "letter" };
  const key = (alias[v] || v) as PageFormatKey;
  return PAGE_FORMATS.some((p) => p.key === key) ? key : undefined;
}

export function resolveAccentColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v.slice(1).split("").map((c) => c + c).join("")}`.toLowerCase();
  return undefined;
}

/** Valide une entrée non fiable (corps de requête, arguments MCP) en ExportStyle. */
export function sanitizeExportStyle(input: unknown): ExportStyle {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const style: ExportStyle = {};
  const body = resolveFontKey(raw.bodyFont);
  const heading = resolveFontKey(raw.headingFont);
  const accent = resolveAccentColor(raw.accentColor);
  const format = resolvePageFormat(raw.pageFormat);
  if (body) style.bodyFont = body;
  if (heading) style.headingFont = heading;
  if (accent) style.accentColor = accent;
  if (format) style.pageFormat = format;
  if (typeof raw.includeToc === "boolean") style.includeToc = raw.includeToc;
  return style;
}

export function pageFormatDef(key: PageFormatKey): PageFormatDef {
  return PAGE_FORMATS.find((p) => p.key === key) || PAGE_FORMATS[0];
}
