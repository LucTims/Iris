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
type PdfNode = any;

/**
 * The only fonts we support in the PDF (must match the editor's font picker
 * and the fonts registered by the export route). Keys are lowercased CSS
 * family names; values are the pdfmake font names.
 */
export const SUPPORTED_PDF_FONTS: Record<string, string> = {
  roboto: "Roboto",
  merriweather: "Merriweather",
  lora: "Lora",
  montserrat: "Montserrat",
  "playfair display": "PlayfairDisplay",
};

function mapFont(rawFamily: string): string | undefined {
  const first = rawFamily.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
  return SUPPORTED_PDF_FONTS[first];
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

/** Parse an inline HTML fragment into pdfmake text runs (bold/italic/color/font). */
function parseInlineRuns(
  html: string,
  opts?: { bold?: boolean; italics?: boolean }
): PdfNode[] {
  const runs: PdfNode[] = [];
  const cleaned = html.replace(
    /<(?:p|h[1-6]|li|blockquote|div|table|thead|tbody|tr|td|th|ul|ol)[^>]*>/gi,
    ""
  );
  const segments = cleaned.split(/(<\/?(?:strong|b|em|i|span)[^>]*>)/gi);

  let bold = opts?.bold || false;
  let italics = opts?.italics || false;
  const colorStack: (string | undefined)[] = [undefined];
  const fontStack: (string | undefined)[] = [undefined];

  for (const seg of segments) {
    if (!seg) continue;
    const l = seg.toLowerCase();

    if (l.startsWith("<strong") || l.startsWith("<b")) { bold = true; continue; }
    if (l === "</strong>" || l === "</b>") { bold = opts?.bold || false; continue; }
    if (l.startsWith("<em") || l.startsWith("<i")) { italics = true; continue; }
    if (l === "</em>" || l === "</i>") { italics = false; continue; }
    if (l.startsWith("<span")) {
      const cm = seg.match(/color:\s*([^;"'>]+)/i);
      const fm = seg.match(/font-family:\s*([^;"'>]+)/i);
      colorStack.push(cm ? normalizeColor(cm[1]) : colorStack[colorStack.length - 1]);
      fontStack.push(fm ? mapFont(fm[1]) : fontStack[fontStack.length - 1]);
      continue;
    }
    if (l === "</span>") {
      if (colorStack.length > 1) colorStack.pop();
      if (fontStack.length > 1) fontStack.pop();
      continue;
    }

    const text = decodeEntities(seg.replace(/<[^>]*>/g, ""));
    if (text) {
      const run: PdfNode = { text, bold, italics };
      const color = colorStack[colorStack.length - 1];
      const font = fontStack[fontStack.length - 1];
      if (color) run.color = color;
      if (font) run.font = font;
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
    table: { headerRows: headerRows || 0, widths: Array(maxCols).fill("*"), body: rows },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#bfbfbf",
      vLineColor: () => "#bfbfbf",
    },
    margin: [0, 6, 0, 12],
  };
}

/** Convert one chapter's HTML into a pdfmake content array. */
export function htmlToPdfmakeContent(html: string): PdfNode[] {
  const out: PdfNode[] = [];
  if (!html) return out;

  // Normalize page-break markers, strip other <hr>
  const source = html
    .replace(/<hr[^>]*data-page-break[^>]*>/gi, '<div data-type="pageBreak"></div>')
    .replace(/<hr[^>]*>/gi, "");

  // A page-break marker sets pageBreak:'before' on the NEXT emitted node.
  let pendingBreak = false;
  const push = (node: PdfNode) => {
    if (pendingBreak) { node.pageBreak = "before"; pendingBreak = false; }
    out.push(node);
  };

  const calloutParts = source.split(/(<div[^>]*class="[^"]*\bcallout\b[^"]*"[^>]*>[\s\S]*?<\/div>)/gi);

  for (const cpart of calloutParts) {
    if (!cpart.trim()) continue;
    if (/^<div[^>]*class="[^"]*\bcallout\b/i.test(cpart.trim())) {
      push(parseCallout(cpart));
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
            push({ image: imgMatch[1], width: 400, alignment: "center", margin: [0, 10, 0, 10] });
          }
        }

        const withoutImg = trimmed.replace(/<img[^>]*>/gi, "");
        const plainText = decodeEntities(withoutImg.replace(/<[^>]*>/g, "")).trim();
        if (!plainText) continue;

        const h1 = /<h1[^>]*>/i.test(withoutImg);
        const h2 = /<h2[^>]*>/i.test(withoutImg);
        const h3 = /<h3[^>]*>/i.test(withoutImg);
        const li = /<li[^>]*>/i.test(withoutImg);
        const bq = /<blockquote[^>]*>/i.test(withoutImg);

        if (h1) push({ text: parseInlineRuns(withoutImg, { bold: true }), style: "h1" });
        else if (h2) push({ text: parseInlineRuns(withoutImg, { bold: true }), style: "h2" });
        else if (h3) push({ text: parseInlineRuns(withoutImg, { bold: true }), style: "h3" });
        else if (bq) push({ text: parseInlineRuns(withoutImg, { italics: true }), style: "blockquote", margin: [24, 6, 0, 6] });
        else if (li) push({ text: [{ text: "•  " }, ...parseInlineRuns(withoutImg)], margin: [12, 2, 0, 2] });
        else push({ text: parseInlineRuns(withoutImg), style: "paragraph" });
      }
    }
  }

  return out;
}
