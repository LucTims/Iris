import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  ImageRun,
} from "docx";
import { extractLeadingHeading } from "./htmlToPdfmake";

/** Décode une data URI base64 (image) en octets — côté navigateur (atob). */
function dataUriToBytes(dataUri: string): Uint8Array {
  const b64 = dataUri.split(",")[1] || "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Lit les dimensions natives d'un PNG ou JPEG à partir de ses octets. */
function readImageSize(bytes: Uint8Array): { w: number; h: number } | null {
  // PNG : signature 8 octets, puis IHDR (largeur/hauteur en big-endian).
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    if (w > 0 && h > 0) return { w, h };
  }
  // JPEG : parcours des marqueurs jusqu'à un SOF (Start Of Frame).
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let o = 2;
    while (o + 9 < bytes.length) {
      if (bytes[o] !== 0xff) { o++; continue; }
      const marker = bytes[o + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const h = (bytes[o + 5] << 8) | bytes[o + 6];
        const w = (bytes[o + 7] << 8) | bytes[o + 8];
        if (w > 0 && h > 0) return { w, h };
      }
      const len = (bytes[o + 2] << 8) | bytes[o + 3];
      if (len <= 0) break;
      o += 2 + len;
    }
  }
  return null;
}

/** Encode des octets en base64 — par morceaux, pour ne pas saturer la pile. */
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

const MAX_EMBEDDED_IMAGE_BYTES = 8_000_000;

/** Réencode en PNG une image que Word/docx ne sait pas embarquer (WEBP, GIF). */
async function blobToPngBytes(blob: Blob): Promise<Uint8Array | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return png ? new Uint8Array(await png.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * Remplace les images distantes (http/https) du HTML par des data URIs.
 *
 * Les images insérées depuis l'éditeur sont envoyées au stockage
 * (`/api/upload-image`) et le chapitre ne contient que leur URL : sans cette
 * étape, l'export Word ne gardait que les anciennes images base64 et toutes
 * les images récentes disparaissaient du .docx (l'export PDF, lui, les
 * récupère déjà — voir `embedExternalImages` dans pdfBook.ts). Une image
 * introuvable est simplement omise, jamais bloquante.
 */
export async function embedRemoteImages(
  html: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  if (!html) return html;
  const urls = Array.from(
    html.matchAll(/<img[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/gi),
    (m) => m[1]
  );
  for (const url of Array.from(new Set(urls))) {
    try {
      const res = await fetchImpl(url.replace(/&amp;/g, "&"));
      if (!res.ok) continue;
      const mime = (res.headers.get("content-type") || "").toLowerCase();
      let bytes: Uint8Array | null = new Uint8Array(await res.arrayBuffer());
      let type: "png" | "jpeg";
      if (/image\/png/.test(mime)) type = "png";
      else if (/image\/jpe?g/.test(mime)) type = "jpeg";
      else {
        bytes = await blobToPngBytes(new Blob([bytes as BlobPart], { type: mime }));
        type = "png";
      }
      if (!bytes || !bytes.length || bytes.length > MAX_EMBEDDED_IMAGE_BYTES) continue;
      html = html.split(url).join(`data:image/${type};base64,${bytesToBase64(bytes)}`);
    } catch {
      // Image injoignable (réseau, CORS) : omise.
    }
  }
  return html;
}

// Zone utile d'une page A4 avec marges d'un pouce, en pixels à 96 dpi
// (unité attendue par `ImageRun.transformation`).
const DOCX_MAX_IMAGE_WIDTH = 600;
const DOCX_MAX_IMAGE_HEIGHT = 880;

/**
 * Construit un paragraphe contenant une image base64 (PNG/JPEG), en
 * respectant la largeur et l'alignement choisis dans l'éditeur
 * (`width`, `data-align`).
 */
function renderImage(imgTag: string): Paragraph | null {
  const src = imgTag.match(/src=["'](data:image\/[^"']+)["']/i)?.[1];
  if (!src) return null;
  const m = src.match(/^data:image\/(png|jpe?g);base64,/i);
  if (!m) return null;
  try {
    const bytes = dataUriToBytes(src);
    const size = readImageSize(bytes);
    const widthAttr = parseFloat(imgTag.match(/\swidth=["']?(\d+(?:\.\d+)?)/i)?.[1] || "");
    const align = imgTag.match(/data-align=["']?(left|center|right)/i)?.[1]?.toLowerCase();
    const maxW = DOCX_MAX_IMAGE_WIDTH;
    let w = Number.isFinite(widthAttr) && widthAttr > 0 ? Math.min(maxW, widthAttr) : 460;
    let h = Math.round(w * 0.62);
    if (size) {
      const ratio = size.h / size.w;
      if (!(Number.isFinite(widthAttr) && widthAttr > 0)) w = Math.min(460, size.w);
      h = Math.round(w * ratio);
      if (h > DOCX_MAX_IMAGE_HEIGHT) {
        h = DOCX_MAX_IMAGE_HEIGHT;
        w = Math.round(h / ratio);
      }
    }
    const type = /png/i.test(m[1]) ? "png" : "jpg";
    return new Paragraph({
      alignment:
        align === "left" ? AlignmentType.LEFT : align === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER,
      spacing: { before: 120, after: 160 },
      children: [
        new ImageRun({
          data: bytes,
          transformation: { width: w, height: h },
          type: type as "png" | "jpg",
        } as any),
      ],
    });
  } catch {
    return null;
  }
}

/**
 * Récupère l'image de couverture (data: URL ou http) en octets pour l'embarquer
 * dans le DOCX. Renvoie null en cas d'échec (couverture alors omise).
 */
async function coverToBytes(url: string): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  try {
    if (url.startsWith("data:image/")) {
      const m = url.match(/^data:image\/(png|jpe?g);base64,/i);
      if (!m) return null;
      return { bytes: dataUriToBytes(url), type: /png/i.test(m[1]) ? "png" : "jpg" };
    }
    const r = await fetch(url);
    if (!r.ok) return null;
    const mime = (r.headers.get("content-type") || "").toLowerCase();
    const type: "png" | "jpg" = /png/.test(mime) ? "png" : "jpg";
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (!bytes.length || bytes.length > 8_000_000) return null;
    return { bytes, type };
  } catch {
    return null;
  }
}

interface ChapterData {
  title: string;
  content: string;
  number: number;
}

function parseDocxFontSize(val: string, unit?: string): number | undefined {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) return undefined;
  const u = (unit || "").toLowerCase();
  if (u === "pt") return Math.round(num * 2);
  if (u === "em" || u === "rem") return Math.round(num * 12 * 2);
  // px or unitless: 16px is base size (24 half-points = 12pt). 1px = 0.75pt = 1.5 half-points.
  return Math.round(num * 1.5);
}

/**
 * Parse inline HTML and extract TextRun objects with bold/italic/underline/strike/color/font/size formatting.
 */
function parseTextRuns(
  html: string,
  options?: { forceBold?: boolean; size?: number; defaultFontSize?: number }
): TextRun[] {
  const baseSize = options?.size ?? 24; // 24 = 12pt par défaut
  const runs: TextRun[] = [];

  // Remove block-level opening tags to avoid creating runs for them
  const cleaned = html.replace(/<(?:p|h[1-6]|li|blockquote|div|table|thead|tbody|tr|td|th)[^>]*>/gi, "");

  // Split by styling tags
  const segments = cleaned.split(/(<\/?(?:strong|b|em|i|u|s|strike|del|mark|sub|sup|span)[^>]*>)/gi);

  const boldStack: boolean[] = [options?.forceBold || false];
  const italicsStack: boolean[] = [false];
  const underlineStack: boolean[] = [false];
  const strikeStack: boolean[] = [false];
  const subStack: boolean[] = [false];
  const supStack: boolean[] = [false];
  const fontStack: string[] = ["Georgia"];
  const colorStack: string[] = ["222222"];
  const highlightStack: (string | undefined)[] = [undefined];
  const fontSizeStack: (number | undefined)[] = [options?.defaultFontSize];

  for (const segment of segments) {
    if (!segment) continue;
    const lower = segment.toLowerCase();

    if (/^<strong\b/i.test(lower) || /^<b\b/i.test(lower)) { boldStack.push(true); continue; }
    if (lower === "</strong>" || lower === "</b>") { if (boldStack.length > 1) boldStack.pop(); continue; }
    if (/^<em\b/i.test(lower) || /^<i\b/i.test(lower)) { italicsStack.push(true); continue; }
    if (lower === "</em>" || lower === "</i>") { if (italicsStack.length > 1) italicsStack.pop(); continue; }
    if (/^<u\b/i.test(lower)) { underlineStack.push(true); continue; }
    if (lower === "</u>") { if (underlineStack.length > 1) underlineStack.pop(); continue; }
    if (/^<s\b/i.test(lower) || /^<strike\b/i.test(lower) || /^<del\b/i.test(lower)) { strikeStack.push(true); continue; }
    if (lower === "</s>" || lower === "</strike>" || lower === "</del>") { if (strikeStack.length > 1) strikeStack.pop(); continue; }
    if (/^<sub\b/i.test(lower)) { subStack.push(true); continue; }
    if (lower === "</sub>") { if (subStack.length > 1) subStack.pop(); continue; }
    if (/^<sup\b/i.test(lower)) { supStack.push(true); continue; }
    if (lower === "</sup>") { if (supStack.length > 1) supStack.pop(); continue; }

    if (/^<mark\b/i.test(lower)) {
      const bgMatch = segment.match(/background(?:-color)?:\s*([^;"'>]+)/i) || segment.match(/data-color=["']([^"']+)["']/i);
      const col = bgMatch ? bgMatch[1].trim().replace(/^#/, "") : "FEF08A";
      highlightStack.push(col);
      continue;
    }
    if (lower === "</mark>") {
      if (highlightStack.length > 1) highlightStack.pop();
      continue;
    }

    if (/^<span\b/i.test(lower)) {
      let font = fontStack[fontStack.length - 1];
      let color = colorStack[colorStack.length - 1];

      // Extract font-family
      const fontMatch = segment.match(/font-family:\s*([^;"'>]+)/i);
      if (fontMatch) {
        font = fontMatch[1].replace(/['"]/g, "").trim();
      }

      // Extract color
      const colorMatch = segment.match(/(?:^|;|\s)color:\s*([^;"'>]+)/i);
      if (colorMatch) {
        color = colorMatch[1].trim().replace(/^#/, "");
      }

      // Extract font-size
      const sizeMatch = segment.match(/font-size:\s*([0-9.]+)\s*(px|pt|em|rem)?/i);
      const fs = sizeMatch ? parseDocxFontSize(sizeMatch[1], sizeMatch[2]) : fontSizeStack[fontSizeStack.length - 1];

      // Extract background
      const bgMatch = segment.match(/background(?:-color)?:\s*([^;"'>]+)/i);
      const bg = bgMatch ? bgMatch[1].trim().replace(/^#/, "") : highlightStack[highlightStack.length - 1];

      // Extract text-decoration
      const tdMatch = segment.match(/text-decoration:\s*([^;"'>]+)/i);
      underlineStack.push(tdMatch && /underline/i.test(tdMatch[1]) ? true : underlineStack[underlineStack.length - 1]);
      strikeStack.push(tdMatch && /line-through/i.test(tdMatch[1]) ? true : strikeStack[strikeStack.length - 1]);

      // Extract font-weight / style
      const fwMatch = segment.match(/font-weight:\s*(bold|[789]00)/i);
      boldStack.push(fwMatch ? true : boldStack[boldStack.length - 1]);
      const fsMatch = segment.match(/font-style:\s*italic/i);
      italicsStack.push(fsMatch ? true : italicsStack[italicsStack.length - 1]);

      fontStack.push(font);
      colorStack.push(color);
      fontSizeStack.push(fs);
      highlightStack.push(bg);
      continue;
    }
    if (lower === "</span>") {
      if (fontStack.length > 1) fontStack.pop();
      if (colorStack.length > 1) colorStack.pop();
      if (fontSizeStack.length > 1) fontSizeStack.pop();
      if (highlightStack.length > 1) highlightStack.pop();
      if (underlineStack.length > 1) underlineStack.pop();
      if (strikeStack.length > 1) strikeStack.pop();
      if (boldStack.length > 1) boldStack.pop();
      if (italicsStack.length > 1) italicsStack.pop();
      continue;
    }

    // Strip any remaining HTML tags and decode entities
    const text = segment
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    if (text) {
      const currentSize = fontSizeStack[fontSizeStack.length - 1] ?? baseSize;
      const currentColor = colorStack[colorStack.length - 1];
      const currentBg = highlightStack[highlightStack.length - 1];

      runs.push(
        new TextRun({
          text,
          bold: boldStack[boldStack.length - 1],
          italics: italicsStack[italicsStack.length - 1],
          underline: underlineStack[underlineStack.length - 1] ? {} : undefined,
          strike: strikeStack[strikeStack.length - 1],
          subScript: subStack[subStack.length - 1],
          superScript: supStack[supStack.length - 1],
          font: fontStack[fontStack.length - 1],
          color: currentColor,
          shading: currentBg ? { fill: currentBg, type: ShadingType.CLEAR, color: "auto" } : undefined,
          size: currentSize,
        })
      );
    }
  }

  return runs;
}

const CALLOUT_STYLES: Record<string, { bg: string; border: string; label: string; labelColor: string }> = {
  info: { bg: "EFF6FF", border: "3B82F6", label: "INFO", labelColor: "1D4ED8" },
  warning: { bg: "FFF7ED", border: "F97316", label: "ATTENTION", labelColor: "C2410C" },
  tip: { bg: "F0FDF4", border: "22C55E", label: "CONSEIL", labelColor: "15803D" },
  example: { bg: "FAF5FF", border: "A855F7", label: "EXEMPLE", labelColor: "7E22CE" },
};

/**
 * Render a callout <div class="callout callout-TYPE"> as a single-cell table
 * with a colored left border, light background and an uppercase label.
 */
function renderCallout(html: string): Table {
  const typeMatch =
    html.match(/callout-(info|warning|tip|example)/i) ||
    html.match(/data-callout-type=["'](info|warning|tip|example)/i);
  const type = (typeMatch?.[1] || "info").toLowerCase();
  const s = CALLOUT_STYLES[type] || CALLOUT_STYLES.info;

  const inner = html
    .replace(/^<div[^>]*>/i, "")
    .replace(/<\/div>\s*$/i, "");

  const labelPara = new Paragraph({
    children: [new TextRun({ text: s.label, bold: true, color: s.labelColor, font: "Outfit", size: 18 })],
    spacing: { after: 80 },
  });

  const innerElements = htmlToDocxElements(inner);
  const children = innerElements.length > 0 ? innerElements : [new Paragraph({})];

  const softBorder = { style: BorderStyle.SINGLE, size: 2, color: s.bg };
  const cell = new TableCell({
    children: [labelPara, ...children],
    shading: { fill: s.bg, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 120, bottom: 120, left: 180, right: 160 },
    borders: {
      left: { style: BorderStyle.SINGLE, size: 20, color: s.border },
      top: softBorder,
      bottom: softBorder,
      right: softBorder,
    },
  });

  return new Table({
    rows: [new TableRow({ children: [cell] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Render a key-figure <div class="key-figure"> as a centered bordered box.
 */
function renderKeyFigure(html: string): Table {
  const inner = html.replace(/^<div[^>]*>/i, "").replace(/<\/div>\s*$/i, "");
  const text = inner.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

  const para = new Paragraph({
    children: [new TextRun({ text, bold: true, font: "Outfit", size: 36, color: "92400E" })],
    alignment: AlignmentType.CENTER,
  });

  const border = { style: BorderStyle.SINGLE, size: 6, color: "F59E0B" };
  const cell = new TableCell({
    children: [para],
    shading: { fill: "FEF3C7", type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 200, bottom: 200, left: 200, right: 200 },
    borders: { top: border, bottom: border, left: border, right: border },
  });

  return new Table({
    rows: [new TableRow({ children: [cell] })],
    width: { size: 60, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
  });
}

/**
 * Render a pull-quote <div class="pull-quote"> as a centered italic paragraph
 * with top/bottom borders.
 */
function renderPullQuote(html: string): Paragraph {
  const inner = html.replace(/^<div[^>]*>/i, "").replace(/<\/div>\s*$/i, "");
  const text = inner.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

  return new Paragraph({
    children: [
      new TextRun({ text: "“ ", font: "Outfit", size: 32, color: "94A3B8" }),
      new TextRun({ text, italics: true, font: "Outfit", size: 26, color: "334155" }),
      new TextRun({ text: " ”", font: "Outfit", size: 32, color: "94A3B8" }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 300 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
    },
    indent: { left: 720, right: 720 },
  });
}

const DIVIDER_TEXT: Record<string, string> = {
  stars: "* * *",
  ornament: "❖  ❖  ❖",
  line: "─────────────",
  dots: "•  •  •  •  •",
};

/**
 * Render a section-divider <div class="section-divider section-divider-<style>">
 * as a centered text paragraph.
 */
function renderSectionDivider(html: string): Paragraph {
  const m = html.match(/section-divider-(stars|ornament|line|dots)/i);
  const style = m ? m[1].toLowerCase() : "ornament";
  const text = DIVIDER_TEXT[style] || DIVIDER_TEXT.ornament;

  return new Paragraph({
    children: [new TextRun({ text, font: "Outfit", size: 22, color: "94A3B8" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 300 },
  });
}

/**
 * Strips HTML tags and returns plain text segments from HTML content.
 * Handles <p>, <h1>-<h3>, <strong>, <em>, <br>, <li>, <blockquote>, <table>,
 * and <div class="callout"> boxes.
 */
function htmlToDocxElements(html: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Tout <hr> = saut de page. TipTap peut réécrire `<hr data-page-break>` en
  // simple `<hr>` (attribut non conservé) : ne reconnaître que la forme avec
  // attribut (et supprimer le reste) faisait disparaître les sauts de page des
  // chapitres. Les séparateurs de scène utilisent `<div class="section-divider">`,
  // jamais `<hr>`, donc traiter tout `<hr>` comme saut de page est sûr.
  html = html.replace(/<hr[^>]*>/gi, '<div data-type="pageBreak"></div>');

  // Isolate special block-level divs (callouts, key-figure, pull-quote, section-divider)
  const specialDivRe = /(<div[^>]*class="[^"]*\b(?:callout|key-figure|pull-quote|section-divider)\b[^"]*"[^>]*>[\s\S]*?<\/div>)/gi;
  const calloutParts = html.split(specialDivRe);

  for (const cpart of calloutParts) {
    if (!cpart.trim()) continue;

    if (/^<div[^>]*class="[^"]*\bcallout\b/i.test(cpart.trim())) {
      elements.push(renderCallout(cpart));
      elements.push(new Paragraph({ spacing: { after: 160 } }));
      continue;
    }

    if (/^<div[^>]*class="[^"]*\bkey-figure\b/i.test(cpart.trim())) {
      elements.push(renderKeyFigure(cpart));
      elements.push(new Paragraph({ spacing: { after: 160 } }));
      continue;
    }

    if (/^<div[^>]*class="[^"]*\bpull-quote\b/i.test(cpart.trim())) {
      elements.push(renderPullQuote(cpart));
      elements.push(new Paragraph({ spacing: { after: 160 } }));
      continue;
    }

    if (/^<div[^>]*class="[^"]*\bsection-divider\b/i.test(cpart.trim())) {
      elements.push(renderSectionDivider(cpart));
      elements.push(new Paragraph({ spacing: { after: 160 } }));
      continue;
    }

  // Split out tables so they are not broken by paragraph splits
  const tableParts = cpart.split(/(<table[^>]*>[\s\S]*?<\/table>)/gi);

  for (const part of tableParts) {
    if (!part.trim()) continue;

    if (part.toLowerCase().startsWith("<table")) {
      const rows: TableRow[] = [];
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;

      while ((trMatch = trRegex.exec(part)) !== null) {
        const rowContent = trMatch[1];
        const cells: TableCell[] = [];
        let rowHasHeader = false;

        const tdRegex = /<(td|th)([^>]*)>([\s\S]*?)<\/\1>/gi;
        let tdMatch;
        while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
          const isHeader = tdMatch[1].toLowerCase() === "th";
          if (isHeader) rowHasHeader = true;
          const cellAttrs = tdMatch[2] || "";
          const cellContent = tdMatch[3];

          // Support des cellules fusionnées (colspan / rowspan)
          const colSpan = parseInt((cellAttrs.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || "1", 10);
          const rowSpan = parseInt((cellAttrs.match(/rowspan\s*=\s*["']?(\d+)/i) || [])[1] || "1", 10);

          const runs = parseTextRuns(cellContent, { forceBold: isHeader });

          const paragraph = new Paragraph({
            children: runs,
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          });

          cells.push(new TableCell({
            children: [paragraph],
            shading: isHeader ? { fill: "EEEEEE", type: ShadingType.CLEAR, color: "auto" } : undefined,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            ...(colSpan > 1 ? { columnSpan: colSpan } : {}),
            ...(rowSpan > 1 ? { rowSpan } : {}),
          }));
        }

        if (cells.length > 0) {
          rows.push(new TableRow({
            children: cells,
            cantSplit: true, // ne pas couper une ligne entre deux pages
            ...(rowHasHeader ? { tableHeader: true } : {}), // répéter l'en-tête sur chaque page
          }));
        }
      }

      if (rows.length > 0) {
        const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
        elements.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: cellBorder,
            bottom: cellBorder,
            left: cellBorder,
            right: cellBorder,
            insideHorizontal: cellBorder,
            insideVertical: cellBorder,
          },
        }));
        // Add a spacer after the table
        elements.push(new Paragraph({ spacing: { after: 200 } }));
      }
    } else {
      // Normal HTML blocks processing
      const blocks = part
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?(ul|ol)>/gi, "")
        .split(/<\/(?:p|h[1-6]|li|blockquote|div)>/gi);

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        // Page break: either a manual break (Ctrl+Enter) from the Tiptap Pages
        // extension, or an AI "new grand point" marker normalized above. A
        // leading marker was already stripped by the caller, so this only fires
        // for breaks *between* points inside a chapter body.
        if (/data-type=["']?pageBreak/i.test(trimmed)) {
          elements.push(new Paragraph({ children: [new PageBreak()] }));
          continue;
        }

        // Images base64 : rendues comme images Word. Les images distantes ont
        // été converties en base64 en amont (`embedRemoteImages`).
        const imgRegex = /<img[^>]*src=["']data:image\/[^"']+["'][^>]*>/gi;
        let imgMatch: RegExpExecArray | null;
        let hadImage = false;
        while ((imgMatch = imgRegex.exec(trimmed)) !== null) {
          const imgPara = renderImage(imgMatch[0]);
          if (imgPara) { elements.push(imgPara); hadImage = true; }
        }
        // Retire les balises image du texte restant (évite un « pseudo-texte »).
        const trimmedNoImg = trimmed.replace(/<img[^>]*>/gi, "").trim();
        if (!trimmedNoImg) {
          if (hadImage) continue;
        }

        const dropCapMatch = /<p[^>]*class="[^"]*\bdrop-cap\b/i.test(trimmedNoImg);
        const h1Match = trimmedNoImg.match(/<h1[^>]*>/i);
        const h2Match = trimmedNoImg.match(/<h2[^>]*>/i);
        const h3Match = trimmedNoImg.match(/<h3[^>]*>/i);
        const liMatch = trimmedNoImg.match(/<li[^>]*>/i);
        const bqMatch = trimmedNoImg.match(/<blockquote[^>]*>/i);

        const plainText = trimmedNoImg
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        if (!plainText) continue;

        // Block-level style attributes: alignment, line-height, font-size
        const alignMatch = trimmedNoImg.match(/text-align:\s*(left|center|right|justify)/i) ||
                           trimmedNoImg.match(/class=["'][^"']*has-text-align-(left|center|right|justify)/i);
        const paraAlignment = alignMatch
          ? (alignMatch[1].toLowerCase() === "left"
              ? AlignmentType.LEFT
              : alignMatch[1].toLowerCase() === "center"
              ? AlignmentType.CENTER
              : alignMatch[1].toLowerCase() === "right"
              ? AlignmentType.RIGHT
              : AlignmentType.JUSTIFIED)
          : AlignmentType.JUSTIFIED;

        const lhMatch = trimmedNoImg.match(/line-height:\s*([0-9.]+)/i);
        const paraLineSpacing = lhMatch ? Math.round(parseFloat(lhMatch[1]) * 240) : 320;

        const fsBlockMatch = trimmedNoImg.match(/<(?:p|h[1-6]|blockquote)[^>]*style="[^"]*font-size:\s*([0-9.]+)\s*(px|pt|em|rem)?/i);
        const defaultDocxSize = fsBlockMatch ? parseDocxFontSize(fsBlockMatch[1], fsBlockMatch[2]) : undefined;

        const runs = parseTextRuns(trimmedNoImg, { defaultFontSize: defaultDocxSize });

        if (dropCapMatch) {
          const dcRuns = parseTextRuns(trimmedNoImg, { defaultFontSize: defaultDocxSize });
          if (dcRuns.length > 0 && plainText.length > 0) {
            const firstLetter = plainText.charAt(0);
            const firstRun = dcRuns[0] as any;
            if (firstRun && typeof firstRun.options?.text === "string") {
              firstRun.options.text = firstRun.options.text.replace(/^\s+/, "").slice(1);
            }
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({ text: firstLetter, bold: true, font: "Georgia", size: 56, color: "1E293B" }),
                  ...dcRuns,
                ],
                spacing: { before: 120, after: 120, line: paraLineSpacing },
                alignment: paraAlignment,
              })
            );
          }
        } else if (h1Match) {
          // Un <h1> = nouveau chapitre → nouvelle page (sauf en tout début de
          // document). Garantit la pagination même si les marqueurs <hr> ont
          // été retirés du contenu par l'éditeur.
          if (elements.length > 0) {
            elements.push(new Paragraph({ children: [new PageBreak()] }));
          }
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmedNoImg, { forceBold: true, size: 32, defaultFontSize: defaultDocxSize }), // 16pt
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200, line: paraLineSpacing },
              alignment: alignMatch ? paraAlignment : AlignmentType.CENTER,
            })
          );
        } else if (h2Match) {
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmedNoImg, { forceBold: true, size: 28, defaultFontSize: defaultDocxSize }), // 14pt
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150, line: paraLineSpacing },
              alignment: alignMatch ? paraAlignment : undefined,
            })
          );
        } else if (h3Match) {
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmedNoImg, { forceBold: true, size: 26, defaultFontSize: defaultDocxSize }), // 13pt
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100, line: paraLineSpacing },
              alignment: alignMatch ? paraAlignment : undefined,
            })
          );
        } else if (bqMatch) {
          elements.push(
            new Paragraph({
              children: runs,
              indent: { left: 720 },
              border: {
                left: { style: BorderStyle.SINGLE, size: 6, color: "999999" },
              },
              spacing: { before: 100, after: 100, line: paraLineSpacing },
              alignment: alignMatch ? paraAlignment : undefined,
            })
          );
        } else if (liMatch) {
          elements.push(
            new Paragraph({
              children: [new TextRun({ text: "• " }), ...runs],
              indent: { left: 360 },
              spacing: { before: 60, after: 60, line: paraLineSpacing },
            })
          );
        } else {
          elements.push(
            new Paragraph({
              children: runs,
              spacing: { before: 60, after: 120, line: paraLineSpacing },
              alignment: paraAlignment,
            })
          );
        }
      }
    }
  }
  }

  return elements;
}

export async function generateDocx(
  title: string,
  subtitle: string | undefined,
  chapters: ChapterData[],
  coverUrl?: string,
  author?: string
): Promise<Blob> {
  const sections: any[] = [];

  // Cover Section (image pleine page sur sa propre page, avant la page de titre).
  if (coverUrl) {
    const cov = await coverToBytes(coverUrl);
    if (cov) {
      const size = readImageSize(cov.bytes);
      let w = 480;
      let h = 700;
      if (size && size.w > 0) {
        const ratio = size.h / size.w;
        h = Math.round(w * ratio);
        if (h > 720) { h = 720; w = Math.round(h / ratio); }
      }
      sections.push({
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: cov.bytes,
                transformation: { width: w, height: h },
                type: cov.type,
              } as any),
            ],
          }),
        ],
      });
    }
  }

  // Title Page Section
  const titlePageChildren: Paragraph[] = [
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          font: "Georgia",
          size: 56, // 28pt
          color: "333333",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  ];

  if (subtitle) {
    titlePageChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: subtitle,
            italics: true,
            font: "Georgia",
            size: 28, // 14pt
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // Filet décoratif seul : la page de titre ne porte aucune marque de
  // fabrique, le document exporté appartient entièrement à son auteur.
  titlePageChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "───────────────",
          color: "CCCCCC",
          font: "Outfit",
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );
  if (author) {
    titlePageChildren.push(
      new Paragraph({
        children: [new TextRun({ text: author, font: "Georgia", size: 28, color: "333333" })],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  sections.push({
    properties: {},
    children: titlePageChildren,
  });

  // Chapter Sections (each starts on a new page). When the body already begins
  // with its own <h1> title we use that text and drop the duplicate heading, so
  // there is exactly one chapter title (no doubled title, no near-blank page).
  for (const chapter of chapters) {
    const content = await embedRemoteImages(chapter.content);
    const { title: leadTitle, rest } = extractLeadingHeading(content);
    const effectiveTitle = leadTitle || chapter.title;

    const chapterElements: (Paragraph | Table)[] = [
      // Chapter title
      new Paragraph({
        children: [
          new TextRun({
            text: effectiveTitle,
            bold: true,
            font: "Outfit",
            size: 40, // 20pt
            color: "222222",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "───────────────",
            color: "DDDDDD",
            font: "Outfit",
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      // Chapter content
      ...htmlToDocxElements(rest),
    ];

    sections.push({
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: chapterElements,
    });
  }

  const doc = new Document({
    title: title,
    description: title,
    ...(author ? { creator: author } : {}),
    sections,
  });

  return await Packer.toBlob(doc);
}
