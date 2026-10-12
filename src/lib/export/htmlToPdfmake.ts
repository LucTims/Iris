/**
 * Convert the editor's rich HTML into a pdfmake content array.
 * String/regex based (no DOM) so it runs inside a serverless API route.
 *
 * Handles: headings, paragraphs, lists, blockquotes, tables (header styling,
 * colspan), inline bold/italic + text color + font family, base64 images,
 * callout boxes, and manual page breaks. External-URL images are inlined by
 * the route before this runs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSS_TO_PDF_FONT } from "@/lib/export/fontRegistry";

type PdfNode = any;

/**
 * Correspondance « nom de police CSS (minuscule) » → clé pdfmake. Dérivée du
 * registre unique (fontRegistry), donc toute police du sélecteur de l'éditeur
 * est reconnue et réellement appliquée à l'export PDF.
 */
export const SUPPORTED_PDF_FONTS: Record<string, string> = CSS_TO_PDF_FONT;

function mapFont(rawFamily: string): string | undefined {
  const first = rawFamily.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
  return SUPPORTED_PDF_FONTS[first];
}

/**
 * Chapter bodies produced by the AI writers begin with their own title — an
 * <h1>, optionally preceded by a page-break marker (`<hr data-page-break><h1>…`).
 * The exporters also render the chapter title separately, which duplicated the
 * heading AND doubled the page break (producing near-blank pages). This pulls
 * that leading heading out so the exporter can (a) use its text as the chapter's
 * displayed title and (b) render the rest of the body cleanly with a single
 * page break. Returns the original HTML untouched when no leading <h1> exists.
 */
export function extractLeadingHeading(html: string): { title: string | null; rest: string } {
  if (!html) return { title: null, rest: html || "" };
  // Drop a single leading page-break marker / empty spacer: the chapter already
  // starts on a fresh page, so this break is redundant.
  // Retire un éventuel marqueur de saut de page (n'importe quel <hr>, avec ou
  // sans attribut data-page-break — TipTap peut avoir retiré l'attribut) ou un
  // paragraphe vide en tête, avant de chercher le <h1> du titre à dédupliquer.
  const stripped = html.replace(
    /^\s*(?:<hr[^>]*>|<p>\s*(?:&nbsp;)?\s*<\/p>|&nbsp;)\s*/i,
    ""
  );
  const m = stripped.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return { title: null, rest: html };
  const title = decodeEntities(m[1].replace(/<[^>]*>/g, "")).trim();
  return { title: title || null, rest: stripped.slice(m[0].length) };
}

/** True when a chapter is the book's summary / table of contents. */
export function isSummaryChapter(title: string, content: string): boolean {
  const re = /sommaire|table des mati/i;
  if (re.test(title || "")) return true;
  const lead = extractLeadingHeading(content || "").title || "";
  return re.test(lead);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»");
}

function normalizeColor(raw: string): string | undefined {
  const v = raw.trim();
  const rgb = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const hex = [rgb[1], rgb[2], rgb[3]]
      .map((n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  }
  if (v.startsWith("#")) return v;
  return undefined;
}

export function parseFontSize(val: string, unit?: string): number | undefined {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) return undefined;
  const u = (unit || "").toLowerCase();
  if (u === "pt") return num;
  if (u === "em" || u === "rem") return Math.round(num * 11.5 * 10) / 10;
  // px or unitless: standard web conversion (16px in editor -> 12pt in PDF)
  return Math.round(num * 0.75 * 10) / 10;
}

/** Parse an inline HTML fragment into pdfmake text runs (bold/italic/underline/strike/color/font/size/background). */
export function parseInlineRuns(
  html: string,
  opts?: { bold?: boolean; italics?: boolean; defaultFontSize?: number }
): PdfNode[] {
  const runs: PdfNode[] = [];
  const cleaned = html.replace(
    /<(?:p|h[1-6]|li|blockquote|div|table|thead|tbody|tr|td|th|ul|ol)[^>]*>/gi,
    ""
  );
  const segments = cleaned.split(/(<\/?(?:strong|b|em|i|u|s|strike|del|mark|sub|sup|span)[^>]*>)/gi);

  const boldStack: boolean[] = [opts?.bold || false];
  const italicsStack: boolean[] = [opts?.italics || false];
  const underlineStack: boolean[] = [false];
  const strikeStack: boolean[] = [false];
  const subStack: boolean[] = [false];
  const supStack: boolean[] = [false];
  const colorStack: (string | undefined)[] = [undefined];
  const fontStack: (string | undefined)[] = [undefined];
  const fontSizeStack: (number | undefined)[] = [opts?.defaultFontSize];
  const bgStack: (string | undefined)[] = [undefined];

  for (const seg of segments) {
    if (!seg) continue;
    const l = seg.toLowerCase();

    if (/^<strong\b/i.test(l) || /^<b\b/i.test(l)) { boldStack.push(true); continue; }
    if (l === "</strong>" || l === "</b>") { if (boldStack.length > 1) boldStack.pop(); continue; }
    if (/^<em\b/i.test(l) || /^<i\b/i.test(l)) { italicsStack.push(true); continue; }
    if (l === "</em>" || l === "</i>") { if (italicsStack.length > 1) italicsStack.pop(); continue; }
    if (/^<u\b/i.test(l)) { underlineStack.push(true); continue; }
    if (l === "</u>") { if (underlineStack.length > 1) underlineStack.pop(); continue; }
    if (/^<s\b/i.test(l) || /^<strike\b/i.test(l) || /^<del\b/i.test(l)) { strikeStack.push(true); continue; }
    if (l === "</s>" || l === "</strike>" || l === "</del>") { if (strikeStack.length > 1) strikeStack.pop(); continue; }
    if (/^<sub\b/i.test(l)) { subStack.push(true); continue; }
    if (l === "</sub>") { if (subStack.length > 1) subStack.pop(); continue; }
    if (/^<sup\b/i.test(l)) { supStack.push(true); continue; }
    if (l === "</sup>") { if (supStack.length > 1) supStack.pop(); continue; }

    if (/^<mark\b/i.test(l)) {
      const bgm = seg.match(/background(?:-color)?:\s*([^;"'>]+)/i) || seg.match(/data-color=["']([^"']+)["']/i);
      bgStack.push(bgm ? normalizeColor(bgm[1]) : "#fef08a");
      continue;
    }
    if (l === "</mark>") {
      if (bgStack.length > 1) bgStack.pop();
      continue;
    }

    if (/^<span\b/i.test(l)) {
      const cm = seg.match(/(?:^|;|\s)color:\s*([^;"'>]+)/i);
      const fm = seg.match(/font-family:\s*([^;"'>]+)/i);
      const sm = seg.match(/font-size:\s*([0-9.]+)\s*(px|pt|em|rem)?/i);
      const bgm = seg.match(/background(?:-color)?:\s*([^;"'>]+)/i);
      const tdm = seg.match(/text-decoration:\s*([^;"'>]+)/i);
      const bm = seg.match(/font-weight:\s*(bold|[789]00)/i);
      const im = seg.match(/font-style:\s*italic/i);

      colorStack.push(cm ? normalizeColor(cm[1]) : colorStack[colorStack.length - 1]);
      fontStack.push(fm ? mapFont(fm[1]) : fontStack[fontStack.length - 1]);
      fontSizeStack.push(sm ? parseFontSize(sm[1], sm[2]) : fontSizeStack[fontSizeStack.length - 1]);
      bgStack.push(bgm ? normalizeColor(bgm[1]) : bgStack[bgStack.length - 1]);
      underlineStack.push(tdm && /underline/i.test(tdm[1]) ? true : underlineStack[underlineStack.length - 1]);
      strikeStack.push(tdm && /line-through/i.test(tdm[1]) ? true : strikeStack[strikeStack.length - 1]);
      boldStack.push(bm ? true : boldStack[boldStack.length - 1]);
      italicsStack.push(im ? true : italicsStack[italicsStack.length - 1]);
      continue;
    }
    if (l === "</span>") {
      if (colorStack.length > 1) colorStack.pop();
      if (fontStack.length > 1) fontStack.pop();
      if (fontSizeStack.length > 1) fontSizeStack.pop();
      if (bgStack.length > 1) bgStack.pop();
      if (underlineStack.length > 1) underlineStack.pop();
      if (strikeStack.length > 1) strikeStack.pop();
      if (boldStack.length > 1) boldStack.pop();
      if (italicsStack.length > 1) italicsStack.pop();
      continue;
    }

    const text = decodeEntities(seg.replace(/<[^>]*>/g, ""));
    if (text) {
      const isBold = boldStack[boldStack.length - 1];
      const isItalic = italicsStack[italicsStack.length - 1];
      const isUnder = underlineStack[underlineStack.length - 1];
      const isStrike = strikeStack[strikeStack.length - 1];
      const run: PdfNode = { text };
      if (isBold) run.bold = true;
      if (isItalic) run.italics = true;
      const color = colorStack[colorStack.length - 1];
      const font = fontStack[fontStack.length - 1];
      const fontSize = fontSizeStack[fontSizeStack.length - 1];
      const bg = bgStack[bgStack.length - 1];
      if (color) run.color = color;
      if (font) run.font = font;
      if (fontSize) run.fontSize = fontSize;
      if (bg) run.background = bg;
      if (isUnder && isStrike) run.decoration = ["underline", "lineThrough"];
      else if (isUnder) run.decoration = "underline";
      else if (isStrike) run.decoration = "lineThrough";
      if (subStack[subStack.length - 1]) run.sub = true;
      if (supStack[supStack.length - 1]) run.sup = true;
      runs.push(run);
    }
  }
  return runs.length ? runs : [{ text: "" }];
}

function isEmbeddableImage(src: string): boolean {
  return /^data:image\/(png|jpe?g);base64,/i.test(src.trim());
}

const CALLOUT_STYLES: Record<string, { bg: string; accent: string; label: string; labelColor: string }> = {
  info: { bg: "#eff6ff", accent: "#3b82f6", label: "INFO", labelColor: "#1d4ed8" },
  warning: { bg: "#fff7ed", accent: "#f97316", label: "ATTENTION", labelColor: "#c2410c" },
  tip: { bg: "#f0fdf4", accent: "#22c55e", label: "CONSEIL", labelColor: "#15803d" },
  example: { bg: "#faf5ff", accent: "#a855f7", label: "EXEMPLE", labelColor: "#7e22ce" },
};

function parseCallout(html: string): PdfNode {
  const m =
    html.match(/callout-(info|warning|tip|example)/i) ||
    html.match(/data-callout-type=["'](info|warning|tip|example)/i);
  const type = (m?.[1] || "info").toLowerCase();
  const s = CALLOUT_STYLES[type] || CALLOUT_STYLES.info;

  const inner = html.replace(/^<div[^>]*>/i, "").replace(/<\/div>\s*$/i, "");
  const innerNodes = htmlToPdfmakeContent(inner);

  return {
    table: {
      widths: [3, "*"],
      body: [
        [
          { text: "", fillColor: s.accent },
          {
            fillColor: s.bg,
            margin: [10, 8, 10, 8],
            stack: [
              { text: s.label, bold: true, color: s.labelColor, fontSize: 9, margin: [0, 0, 0, 4] },
              ...(innerNodes.length ? innerNodes : [{ text: "" }]),
            ],
          },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, 8, 0, 12],
  };
}

function parseTable(tableHtml: string): PdfNode | null {
  const rows: PdfNode[][] = [];
  let headerRows = 0;
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  let rowIndex = 0;

  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    const rowContent = trMatch[1];
    const cells: PdfNode[] = [];
    let rowHasHeader = false;

    const tdRegex = /<(td|th)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      const isHeader = tdMatch[1].toLowerCase() === "th";
      if (isHeader) rowHasHeader = true;
      const attrs = tdMatch[2] || "";
      const content = tdMatch[3];
      const colSpan = parseInt((attrs.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || "1", 10);

      const cell: PdfNode = {
        text: parseInlineRuns(content, { bold: isHeader }),
        alignment: isHeader ? "center" : "left",
        fillColor: isHeader ? "#eeeeee" : undefined,
        margin: [4, 3, 4, 3],
      };
      if (colSpan > 1) cell.colSpan = colSpan;
      cells.push(cell);
      for (let i = 1; i < colSpan; i++) cells.push({});
    }

    if (cells.length > 0) {
      rows.push(cells);
      if (rowHasHeader && rowIndex === headerRows) headerRows++;
      rowIndex++;
    }
  }

  if (rows.length === 0) return null;
  const maxCols = rows.reduce((mx, r) => Math.max(mx, r.length), 0);
  for (const r of rows) while (r.length < maxCols) r.push({ text: "" });

  return {
    table: { headerRows: headerRows || 0, dontBreakRows: true, keepWithHeaderRows: 1, widths: Array(maxCols).fill("*"), body: rows },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#bfbfbf",
      vLineColor: () => "#bfbfbf",
    },
    margin: [0, 6, 0, 12],
  };
}

function parseKeyFigure(html: string): PdfNode {
  const inner = html.replace(/^<div[^>]*>/i, "").replace(/<\/div>\s*$/i, "");
  const text = decodeEntities(inner.replace(/<[^>]*>/g, "")).trim();

  return {
    table: {
      widths: ["*"],
      body: [[{
        text,
        bold: true,
        fontSize: 18,
        color: "#92400e",
        alignment: "center",
        fillColor: "#fef3c7",
        margin: [16, 14, 16, 14],
      }]],
    },
    layout: {
      hLineWidth: () => 1.5,
      vLineWidth: () => 1.5,
      hLineColor: () => "#f59e0b",
      vLineColor: () => "#f59e0b",
    },
    margin: [80, 10, 80, 14],
  };
}

/**
 * Page de STORYBOOK : l'illustration en haut, quelques phrases centrées
 * dessous. La page entière est rendue comme un bloc INSÉCABLE — c'est tout
 * l'intérêt du format : une image ne doit jamais être séparée de son texte par
 * un saut de page.
 *
 * Les images externes ont déjà été converties en base64 en amont
 * (`embedExternalImages` dans la route d'export), donc `isEmbeddableImage`
 * accepte ici les visuels importés par l'auteur.
 */
function parseStoryPage(html: string): PdfNode {
  const inner = html.replace(/^<div[^>]*>/i, "").replace(/<\/div>\s*$/i, "");

  const imgMatch = inner.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  const text = decodeEntities(
    inner.replace(/<img[^>]*>/gi, "").replace(/<[^>]*>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();

  const stack: PdfNode[] = [];

  if (imgMatch && isEmbeddableImage(imgMatch[1])) {
    stack.push({
      image: imgMatch[1],
      // `fit` (et non `width`) préserve le rapport hauteur/largeur et garantit
      // que le visuel tient dans la page quelle que soit son orientation.
      fit: [400, 330],
      alignment: "center",
      margin: [0, 6, 0, 14],
    });
  }

  if (text) {
    stack.push({
      text,
      alignment: "center",
      fontSize: 13,
      lineHeight: 1.6,
      margin: [40, 0, 40, 6],
    });
  }

  return {
    stack: stack.length ? stack : [{ text: "" }],
    // `unbreakable` garantit que l'illustration n'est jamais séparée de son
    // texte par un saut de page — c'est tout l'intérêt du format.
    unbreakable: true,
    margin: [0, 10, 0, 18],
  };
}

/**
 * Isole chaque page de storybook sur SA page PDF.
 *
 * Dans un album, une page du livre = une page imprimée : deux illustrations
 * qui se suivent sur la même feuille cassent le rythme de lecture à voix haute
 * et rendent l'album inutilisable à l'impression. `unbreakable` empêche une
 * page d'être coupée en deux, mais n'empêche pas deux pages de cohabiter —
 * d'où ce saut explicite entre elles.
 *
 * Le saut est posé AVANT chaque page sauf la première du chapitre, qui suit
 * déjà le titre.
 */
function paginateStoryPages(nodes: PdfNode[]): PdfNode[] {
  let seenFirst = false;
  return nodes.map((node) => {
    if (!node || !("unbreakable" in node) || !node.unbreakable || !Array.isArray(node.stack)) {
      return node;
    }
    if (!seenFirst) {
      seenFirst = true;
      return node;
    }
    return { ...node, pageBreak: "before" };
  });
}

function parsePullQuote(html: string): PdfNode {
  const inner = html.replace(/^<div[^>]*>/i, "").replace(/<\/div>\s*$/i, "");
  const text = decodeEntities(inner.replace(/<[^>]*>/g, "")).trim();

  return {
    stack: [
      { canvas: [{ type: "line", x1: 60, y1: 0, x2: 380, y2: 0, lineWidth: 0.8, lineColor: "#cbd5e1" }] },
      {
        text: [
          { text: "“ ", fontSize: 18, color: "#94a3b8" },
          { text, italics: true, fontSize: 12.5, color: "#334155" },
          { text: " ”", fontSize: 18, color: "#94a3b8" },
        ],
        alignment: "center",
        margin: [32, 8, 32, 8],
        lineHeight: 1.5,
      },
      { canvas: [{ type: "line", x1: 60, y1: 0, x2: 380, y2: 0, lineWidth: 0.8, lineColor: "#cbd5e1" }] },
    ],
    margin: [0, 10, 0, 14],
  };
}

const PDF_DIVIDER_TEXT: Record<string, string> = {
  stars: "* * *",
  ornament: "❖  ❖  ❖",
  line: "─────────────",
  dots: "•  •  •  •  •",
};

function parseSectionDivider(html: string): PdfNode {
  const m = html.match(/section-divider-(stars|ornament|line|dots)/i);
  const style = m ? m[1].toLowerCase() : "ornament";
  const text = PDF_DIVIDER_TEXT[style] || PDF_DIVIDER_TEXT.ornament;

  return {
    text,
    alignment: "center",
    color: "#94a3b8",
    fontSize: 12,
    margin: [0, 16, 0, 16],
    characterSpacing: style === "line" ? 0 : 3,
  };
}

/**
 * Convert one chapter's HTML into a pdfmake content array.
 *
 * `opts.onePageEach` isole chaque page de storybook sur sa propre page PDF
 * (voir `paginateStoryPages`). Les autres formats laissent le texte s'écouler
 * normalement.
 */
export function htmlToPdfmakeContent(
  html: string,
  opts: { onePageEach?: boolean } = {}
): PdfNode[] {
  const out: PdfNode[] = [];
  if (!html) return out;

  // Tout <hr> = saut de page. IMPORTANT : l'éditeur TipTap peut réécrire
  // `<hr data-page-break>` en simple `<hr>` (l'attribut data n'est pas conservé
  // par l'extension HorizontalRule par défaut). L'ancienne version ne
  // reconnaissait que la forme avec attribut et SUPPRIMAIT le `<hr>` simple →
  // les chapitres ne partaient plus sur une nouvelle page. Les séparateurs de
  // scène utilisent `<div class="section-divider">` (jamais `<hr>`), donc
  // traiter tout `<hr>` comme saut de page est sûr.
  const source = html.replace(/<hr[^>]*>/gi, '<div data-type="pageBreak"></div>');

  // A page-break marker sets pageBreak:'before' on the NEXT emitted node.
  let pendingBreak = false;
  const push = (node: PdfNode) => {
    if (pendingBreak) { node.pageBreak = "before"; pendingBreak = false; }
    out.push(node);
  };

  const specialDivRe = /(<div[^>]*class="[^"]*\b(?:callout|key-figure|pull-quote|section-divider|story-page)\b[^"]*"[^>]*>[\s\S]*?<\/div>)/gi;
  const calloutParts = source.split(specialDivRe);

  for (const cpart of calloutParts) {
    if (!cpart.trim()) continue;
    if (/^<div[^>]*class="[^"]*\bstory-page\b/i.test(cpart.trim())) {
      push(parseStoryPage(cpart));
      continue;
    }
    if (/^<div[^>]*class="[^"]*\bcallout\b/i.test(cpart.trim())) {
      push(parseCallout(cpart));
      continue;
    }
    if (/^<div[^>]*class="[^"]*\bkey-figure\b/i.test(cpart.trim())) {
      push(parseKeyFigure(cpart));
      continue;
    }
    if (/^<div[^>]*class="[^"]*\bpull-quote\b/i.test(cpart.trim())) {
      push(parsePullQuote(cpart));
      continue;
    }
    if (/^<div[^>]*class="[^"]*\bsection-divider\b/i.test(cpart.trim())) {
      push(parseSectionDivider(cpart));
      continue;
    }

    const tableParts = cpart.split(/(<table[^>]*>[\s\S]*?<\/table>)/gi);
    for (const part of tableParts) {
      if (!part.trim()) continue;

      if (part.toLowerCase().startsWith("<table")) {
        const t = parseTable(part);
        if (t) push(t);
        continue;
      }

      const blocks = part
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?(ul|ol)>/gi, "")
        .split(/<\/(?:p|h[1-6]|li|blockquote|div)>/gi);

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        // Manual page break marker (empty block)
        if (/data-type=["']?pageBreak/i.test(trimmed)) {
          pendingBreak = true;
          continue;
        }

        const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
        let imgMatch: RegExpExecArray | null;
        while ((imgMatch = imgRegex.exec(trimmed)) !== null) {
          if (isEmbeddableImage(imgMatch[1])) {
            const widthAttr = parseFloat(imgMatch[0].match(/\swidth=["']?(\d+(?:\.\d+)?)/i)?.[1] || "");
            const alignAttr = imgMatch[0].match(/data-align=["']?(left|center|right)/i)?.[1]?.toLowerCase() || "center";
            const w = Number.isFinite(widthAttr) && widthAttr > 0 ? Math.min(460, widthAttr) : 400;
            push({ image: imgMatch[1], width: w, alignment: alignAttr, margin: [0, 10, 0, 10] });
          }
        }

        const withoutImg = trimmed.replace(/<img[^>]*>/gi, "");
        const plainText = decodeEntities(withoutImg.replace(/<[^>]*>/g, "")).trim();
        if (!plainText) continue;

        // Block-level style attributes: alignment, line-height, font-size
        const alignMatch = trimmed.match(/text-align:\s*(left|center|right|justify)/i) ||
                           trimmed.match(/class=["'][^"']*has-text-align-(left|center|right|justify)/i);
        const blockAlign = alignMatch ? (alignMatch[1].toLowerCase() as any) : undefined;

        const lhMatch = trimmed.match(/line-height:\s*([0-9.]+)/i);
        const blockLineHeight = lhMatch ? parseFloat(lhMatch[1]) : undefined;

        const fsBlockMatch = trimmed.match(/<(?:p|h[1-6]|blockquote)[^>]*style="[^"]*font-size:\s*([0-9.]+)\s*(px|pt|em|rem)?/i);
        const defaultFontSize = fsBlockMatch ? parseFontSize(fsBlockMatch[1], fsBlockMatch[2]) : undefined;

        const dropCap = /<p[^>]*class="[^"]*\bdrop-cap\b/i.test(withoutImg);
        const h1 = /<h1[^>]*>/i.test(withoutImg);
        const h2 = /<h2[^>]*>/i.test(withoutImg);
        const h3 = /<h3[^>]*>/i.test(withoutImg);
        const li = /<li[^>]*>/i.test(withoutImg);
        const bq = /<blockquote[^>]*>/i.test(withoutImg);

        if (dropCap && plainText.length > 0) {
          // Vraie lettrine : la capitale initiale posée à gauche, le texte du
          // premier paragraphe s'écoulant À SA DROITE (mise en colonnes), au
          // lieu d'une grosse lettre seule sur sa ligne suivie d'un retour à la
          // ligne — ce qui n'était pas professionnel.
          const runs = parseInlineRuns(withoutImg, { defaultFontSize });
          // Retire la 1re lettre du flux (elle devient la lettrine).
          if (runs.length && typeof runs[0].text === "string" && runs[0].text.length) {
            runs[0] = { ...runs[0], text: runs[0].text.replace(/^\s+/, "").slice(1) };
          }
          const colNode: PdfNode = {
            columns: [
              {
                width: "auto",
                text: plainText.charAt(0).toUpperCase(),
                fontSize: 46,
                bold: true,
                color: "#1a1a1a",
                margin: [0, 2, 6, 0],
              },
              { width: "*", text: runs, style: "paragraph", ...(blockAlign ? { alignment: blockAlign } : {}), ...(blockLineHeight ? { lineHeight: blockLineHeight } : {}) },
            ],
            columnGap: 2,
            margin: [0, 0, 0, 8],
          };
          push(colNode);
        } else if (h1) {
          // Un <h1> marque un nouveau chapitre : il DOIT commencer sur une
          // nouvelle page (sauf s'il ouvre le document ou si un saut de page
          // est déjà en attente). Garantit la pagination même quand les
          // marqueurs <hr> ont disparu du contenu.
          if (out.length > 0) pendingBreak = true;
          const node: PdfNode = { text: parseInlineRuns(withoutImg, { bold: true, defaultFontSize }), style: "h1", margin: [0, 40, 0, 12] };
          if (blockAlign) node.alignment = blockAlign;
          if (blockLineHeight) node.lineHeight = blockLineHeight;
          push(node);
        }
        else if (h2) {
          const node: PdfNode = { text: parseInlineRuns(withoutImg, { bold: true, defaultFontSize }), style: "h2" };
          if (blockAlign) node.alignment = blockAlign;
          if (blockLineHeight) node.lineHeight = blockLineHeight;
          push(node);
        }
        else if (h3) {
          const node: PdfNode = { text: parseInlineRuns(withoutImg, { bold: true, defaultFontSize }), style: "h3" };
          if (blockAlign) node.alignment = blockAlign;
          if (blockLineHeight) node.lineHeight = blockLineHeight;
          push(node);
        }
        else if (bq) {
          const node: PdfNode = { text: parseInlineRuns(withoutImg, { italics: true, defaultFontSize }), style: "blockquote", margin: [24, 6, 0, 6] };
          if (blockAlign) node.alignment = blockAlign;
          if (blockLineHeight) node.lineHeight = blockLineHeight;
          push(node);
        }
        else if (li) {
          const node: PdfNode = { text: [{ text: "•  " }, ...parseInlineRuns(withoutImg, { defaultFontSize })], margin: [12, 2, 0, 2] };
          if (blockAlign) node.alignment = blockAlign;
          if (blockLineHeight) node.lineHeight = blockLineHeight;
          push(node);
        }
        else {
          const node: PdfNode = { text: parseInlineRuns(withoutImg, { defaultFontSize }), style: "paragraph" };
          if (blockAlign) node.alignment = blockAlign;
          if (blockLineHeight) node.lineHeight = blockLineHeight;
          push(node);
        }
      }
    }
  }

  return opts.onePageEach ? paginateStoryPages(out) : out;
}
