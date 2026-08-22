/**
 * Convert the editor's rich HTML (headings, paragraphs, lists, blockquotes,
 * tables, inline bold/italic, base64 images) into a pdfmake content array.
 *
 * Kept string/regex based (like generateDocx) so it runs anywhere — no DOM,
 * no browser — which is what we need inside a serverless API route.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type PdfNode = any;

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

/**
 * Parse an inline HTML fragment into pdfmake text runs, tracking bold/italic.
 */
function parseInlineRuns(
  html: string,
  opts?: { bold?: boolean; italics?: boolean }
): PdfNode[] {
  const runs: PdfNode[] = [];

  // Drop block-level tags so they don't leak into inline text
  const cleaned = html.replace(
    /<(?:p|h[1-6]|li|blockquote|div|table|thead|tbody|tr|td|th|ul|ol)[^>]*>/gi,
    ""
  );

  const segments = cleaned.split(/(<\/?(?:strong|b|em|i|span)[^>]*>)/gi);

  let bold = opts?.bold || false;
  let italics = opts?.italics || false;

  for (const seg of segments) {
    if (!seg) continue;
    const l = seg.toLowerCase();

    if (l.startsWith("<strong") || l.startsWith("<b")) {
      bold = true;
      continue;
    }
    if (l === "</strong>" || l === "</b>") {
      bold = opts?.bold || false;
      continue;
    }
    if (l.startsWith("<em") || l.startsWith("<i")) {
      italics = true;
      continue;
    }
    if (l === "</em>" || l === "</i>") {
      italics = false;
      continue;
    }
    // Ignore span open/close (styling not carried over to keep it robust)
    if (l.startsWith("<span") || l === "</span>") continue;

    const text = decodeEntities(seg.replace(/<[^>]*>/g, ""));
    if (text) runs.push({ text, bold, italics });
  }

  return runs.length ? runs : [{ text: "" }];
}

/** True for base64 PNG/JPEG data URLs, which pdfmake can embed directly. */
function isEmbeddableImage(src: string): boolean {
  return /^data:image\/(png|jpe?g);base64,/i.test(src.trim());
}

/** Build a pdfmake table node from a <table> HTML fragment. */
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
      const cellContent = tdMatch[3];

      cells.push({
        text: parseInlineRuns(cellContent, { bold: isHeader }),
        alignment: isHeader ? "center" : "left",
        fillColor: isHeader ? "#eeeeee" : undefined,
        margin: [4, 3, 4, 3],
      });
    }

    if (cells.length > 0) {
      rows.push(cells);
      if (rowHasHeader && rowIndex === headerRows) headerRows++;
      rowIndex++;
    }
  }

  if (rows.length === 0) return null;

  // pdfmake requires every row to have the same number of cells.
  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  for (const r of rows) {
    while (r.length < maxCols) r.push({ text: "" });
  }

  return {
    table: {
      headerRows: headerRows || 0,
      widths: Array(maxCols).fill("*"),
      body: rows,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#bfbfbf",
      vLineColor: () => "#bfbfbf",
    },
    margin: [0, 6, 0, 12],
  };
}

/**
 * Convert one chapter's HTML into a pdfmake content array.
 */
export function htmlToPdfmakeContent(html: string): PdfNode[] {
  const out: PdfNode[] = [];
  if (!html) return out;

  // Chapter page-break marker + horizontal rules are handled at doc level
  const source = html.replace(/<hr[^>]*>/gi, "");

  // Isolate tables so paragraph splitting doesn't tear them apart
  const parts = source.split(/(<table[^>]*>[\s\S]*?<\/table>)/gi);

  for (const part of parts) {
    if (!part.trim()) continue;

    if (part.toLowerCase().startsWith("<table")) {
      const tableNode = parseTable(part);
      if (tableNode) out.push(tableNode);
      continue;
    }

    // Normal blocks
    const blocks = part
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(ul|ol)>/gi, "")
      .split(/<\/(?:p|h[1-6]|li|blockquote|div)>/gi);

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      // Standalone / inline images (only embeddable base64 PNG/JPEG)
      const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
      let imgMatch: RegExpExecArray | null;
      let hadImage = false;
      while ((imgMatch = imgRegex.exec(trimmed)) !== null) {
        const src = imgMatch[1];
        if (isEmbeddableImage(src)) {
          out.push({
            image: src,
            width: 400,
            alignment: "center",
            margin: [0, 10, 0, 10],
          });
          hadImage = true;
        }
      }

      // Remove img tags before extracting text
      const withoutImg = trimmed.replace(/<img[^>]*>/gi, "");

      const plainText = decodeEntities(withoutImg.replace(/<[^>]*>/g, "")).trim();
      if (!plainText) {
        if (!hadImage) continue;
        continue;
      }

      const h1 = /<h1[^>]*>/i.test(withoutImg);
      const h2 = /<h2[^>]*>/i.test(withoutImg);
      const h3 = /<h3[^>]*>/i.test(withoutImg);
      const li = /<li[^>]*>/i.test(withoutImg);
      const bq = /<blockquote[^>]*>/i.test(withoutImg);

      if (h1) {
        out.push({ text: parseInlineRuns(withoutImg, { bold: true }), style: "h1" });
      } else if (h2) {
        out.push({ text: parseInlineRuns(withoutImg, { bold: true }), style: "h2" });
      } else if (h3) {
        out.push({ text: parseInlineRuns(withoutImg, { bold: true }), style: "h3" });
      } else if (bq) {
        out.push({
          text: parseInlineRuns(withoutImg, { italics: true }),
          style: "blockquote",
          margin: [24, 6, 0, 6],
        });
      } else if (li) {
        out.push({
          text: [{ text: "•  " }, ...parseInlineRuns(withoutImg)],
          margin: [12, 2, 0, 2],
        });
      } else {
        out.push({ text: parseInlineRuns(withoutImg), style: "paragraph" });
      }
    }
  }

  return out;
}
