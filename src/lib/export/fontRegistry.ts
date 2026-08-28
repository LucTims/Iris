/**
 * Registre UNIQUE des polices de l'application — source de vérité partagée par :
 *   - le sélecteur de police de l'éditeur (RichManuscriptEditor) ;
 *   - le mapping HTML → pdfmake (htmlToPdfmake) ;
 *   - l'enregistrement des polices dans la route d'export PDF ;
 *   - l'export DOCX.
 *
 * Chaque famille embarque ses 4 fontes (normal/bold/italics/bolditalics) en TTF
 * dans src/lib/export/fonts (voir scripts), donc TOUTE police proposée dans
 * l'éditeur est réellement rendue à l'export PDF — plus de police qui
 * « retombe » sur Roboto.
 *
 * `css`  = nom de la famille tel qu'utilisé dans l'éditeur (attribut
 *          font-family) et dans les @import Google Fonts (peut contenir des
 *          espaces).
 * `pdf`  = clé pdfmake ET préfixe des fichiers TTF (sans espace).
 */
export type FontCategory = "Serif" | "Sans-serif" | "Display" | "Manuscrite" | "Monospace";

export interface FontDef {
  css: string;
  pdf: string;
  label: string;
  category: FontCategory;
}

export const FONT_LIBRARY: FontDef[] = [
  // — Serif (idéales pour le corps d'un livre) —
  { css: "Lora", pdf: "Lora", label: "Lora", category: "Serif" },
  { css: "Merriweather", pdf: "Merriweather", label: "Merriweather", category: "Serif" },
  { css: "PT Serif", pdf: "PTSerif", label: "PT Serif", category: "Serif" },
  { css: "Source Serif 4", pdf: "SourceSerif4", label: "Source Serif", category: "Serif" },
  { css: "Crimson Text", pdf: "CrimsonText", label: "Crimson Text", category: "Serif" },
  { css: "EB Garamond", pdf: "EBGaramond", label: "EB Garamond", category: "Serif" },
  { css: "Libre Baskerville", pdf: "LibreBaskerville", label: "Libre Baskerville", category: "Serif" },
  { css: "Cormorant Garamond", pdf: "CormorantGaramond", label: "Cormorant Garamond", category: "Serif" },
  { css: "Bitter", pdf: "Bitter", label: "Bitter", category: "Serif" },
  // — Sans-serif —
  { css: "Montserrat", pdf: "Montserrat", label: "Montserrat", category: "Sans-serif" },
  { css: "Inter", pdf: "Inter", label: "Inter", category: "Sans-serif" },
  { css: "Open Sans", pdf: "OpenSans", label: "Open Sans", category: "Sans-serif" },
  { css: "Lato", pdf: "Lato", label: "Lato", category: "Sans-serif" },
  { css: "Poppins", pdf: "Poppins", label: "Poppins", category: "Sans-serif" },
  { css: "Raleway", pdf: "Raleway", label: "Raleway", category: "Sans-serif" },
  { css: "Nunito", pdf: "Nunito", label: "Nunito", category: "Sans-serif" },
  { css: "Work Sans", pdf: "WorkSans", label: "Work Sans", category: "Sans-serif" },
  { css: "Roboto", pdf: "Roboto", label: "Roboto", category: "Sans-serif" },
  // — Display / titres —
  { css: "Playfair Display", pdf: "PlayfairDisplay", label: "Playfair Display", category: "Display" },
  { css: "Lobster", pdf: "Lobster", label: "Lobster", category: "Display" },
  // — Manuscrites —
  { css: "Dancing Script", pdf: "DancingScript", label: "Dancing Script", category: "Manuscrite" },
  { css: "Pacifico", pdf: "Pacifico", label: "Pacifico", category: "Manuscrite" },
  { css: "Caveat", pdf: "Caveat", label: "Caveat", category: "Manuscrite" },
  // — Monospace —
  { css: "Fira Code", pdf: "FiraCode", label: "Fira Code", category: "Monospace" },
  { css: "JetBrains Mono", pdf: "JetBrainsMono", label: "JetBrains Mono", category: "Monospace" },
];

/** Ordre d'affichage des groupes dans le sélecteur de l'éditeur. */
export const FONT_CATEGORY_ORDER: FontCategory[] = [
  "Serif",
  "Sans-serif",
  "Display",
  "Manuscrite",
  "Monospace",
];

/** Familles regroupées par catégorie (pour un <optgroup> dans l'éditeur). */
export function fontsByCategory(): Record<FontCategory, FontDef[]> {
  const out = {} as Record<FontCategory, FontDef[]>;
  for (const cat of FONT_CATEGORY_ORDER) out[cat] = [];
  for (const f of FONT_LIBRARY) out[f.category].push(f);
  return out;
}

/** Map "nom css minuscule" → clé pdfmake (utilisé par htmlToPdfmake.mapFont). */
export const CSS_TO_PDF_FONT: Record<string, string> = Object.fromEntries(
  FONT_LIBRARY.map((f) => [f.css.toLowerCase(), f.pdf])
);

/** Toutes les clés pdfmake (pour enregistrer les fontes dans la route PDF). */
export const PDF_FONT_KEYS: string[] = FONT_LIBRARY.map((f) => f.pdf);

/**
 * URL Google Fonts (css2) chargeant TOUTES les familles de la bibliothèque —
 * pour l'aperçu dans l'éditeur. On demande les 4 axes quand ils existent ;
 * Google ignore silencieusement les axes absents d'une famille.
 */
export function googleFontsImportUrl(): string {
  const families = FONT_LIBRARY.map((f) => {
    const name = f.css.replace(/ /g, "+");
    // familles sans italique/graisses multiples : on reste simple
    if (["Pacifico", "Lobster"].includes(f.css)) return `family=${name}`;
    if (["Dancing Script", "Caveat", "Fira Code"].includes(f.css)) return `family=${name}:wght@400;700`;
    return `family=${name}:ital,wght@0,400;0,700;1,400;1,700`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
