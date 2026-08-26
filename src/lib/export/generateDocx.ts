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

/** Construit un paragraphe centré contenant une image base64 (PNG/JPEG). */
function renderImage(dataUri: string): Paragraph | null {
  const m = dataUri.match(/^data:image\/(png|jpe?g);base64,/i);
  if (!m) return null;
  try {
    const bytes = dataUriToBytes(dataUri);
    const size = readImageSize(bytes);
    const maxW = 460; // largeur max en points (marges A4)
    let w = maxW;
    let h = Math.round(maxW * 0.62);
    if (size) {
      const ratio = size.h / size.w;
      w = Math.min(maxW, size.w);
      h = Math.round(w * ratio);
    }
    const type = /png/i.test(m[1]) ? "png" : "jpg";
    return new Paragraph({
      alignment: AlignmentType.CENTER,
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

interface ChapterData {
  title: string;
  content: string;
  number: number;
}

/**
 * Parse inline HTML and extract TextRun objects with bold/italic/color/font formatting.
 */
function parseTextRuns(html: string, options?: { forceBold?: boolean; size?: number }): TextRun[] {
  const baseSize = options?.size ?? 24; // 24 = 12pt par défaut
  const runs: TextRun[] = [];

  // Remove block-level opening tags to avoid creating runs for them
  let cleaned = html.replace(/<(?:p|h[1-6]|li|blockquote|div|table|thead|tbody|tr|td|th)[^>]*>/gi, "");

  // Split by styling tags
  const segments = cleaned.split(/(<\/?(?:strong|b|em|i|span)[^>]*>)/gi);

  let isBold = options?.forceBold || false;
  let isItalic = false;
  const fontStack: string[] = ["Outfit"];
  const colorStack: string[] = ["222222"];

  for (const segment of segments) {
    if (!segment) continue;
    const lower = segment.toLowerCase();

    if (lower.startsWith("<strong") || lower.startsWith("<b")) {
      isBold = true;
      continue;
    }
    if (lower === "</strong>" || lower === "</b>") {
      isBold = options?.forceBold || false; // Revert to base state
      continue;
    }
    if (lower.startsWith("<em") || lower.startsWith("<i")) {
      isItalic = true;
      continue;
    }
    if (lower === "</em>" || lower === "</i>") {
      isItalic = false;
      continue;
    }
    if (lower.startsWith("<span")) {
      let font = fontStack[fontStack.length - 1];
      let color = colorStack[colorStack.length - 1];

      // Extract font-family
      const fontMatch = segment.match(/font-family:\s*([^;"'>]+)/i);
      if (fontMatch) {
        font = fontMatch[1].replace(/['"]/g, "").trim();
      }

      // Extract color
      const colorMatch = segment.match(/color:\s*([^;"'>]+)/i);
      if (colorMatch) {
        color = colorMatch[1].trim();
        if (color.startsWith("#")) {
          color = color.substring(1);
        }
      }

      fontStack.push(font);
      colorStack.push(color);
      continue;
    }
    if (lower === "</span>") {
      if (fontStack.length > 1) fontStack.pop();
      if (colorStack.length > 1) colorStack.pop();
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
      runs.push(
        new TextRun({
          text,
          bold: isBold,
          italics: isItalic,
          font: fontStack[fontStack.length - 1],
          color: colorStack[colorStack.length - 1],
          size: baseSize,
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

  // Normalize the AI writers' page-break marker (<hr data-page-break>) into the
  // manual-page-break form handled below, so a new "grand point" inside a single
  // chapter body starts on a fresh page. A LEADING marker is stripped by the
  // caller (extractLeadingHeading) so this never adds a blank page at the top of
  // a section, which already begins on a new page. Any other <hr> is dropped.
  html = html
    .replace(/<hr[^>]*data-page-break[^>]*>/gi, '<div data-type="pageBreak"></div>')
    .replace(/<hr[^>]*>/gi, "");

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

        // Images base64 (upload local dans l'éditeur) : rendues comme images
        // Word. Les URLs externes ne sont pas récupérables côté navigateur ici.
        const imgRegex = /<img[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi;
        let imgMatch: RegExpExecArray | null;
        let hadImage = false;
        while ((imgMatch = imgRegex.exec(trimmed)) !== null) {
          const imgPara = renderImage(imgMatch[1]);
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

        const runs = parseTextRuns(trimmedNoImg);

        if (dropCapMatch) {
          const dcRuns = parseTextRuns(trimmedNoImg);
          if (dcRuns.length > 0 && plainText.length > 0) {
            const firstLetter = plainText.charAt(0);
            const rest = plainText.substring(1);
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({ text: firstLetter, bold: true, font: "Outfit", size: 56, color: "1E293B" }),
                  new TextRun({ text: rest, font: "Outfit", size: 24, color: "222222" }),
                ],
                spacing: { before: 120, after: 120 },
                alignment: AlignmentType.JUSTIFIED,
              })
            );
          }
        } else if (h1Match) {
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmedNoImg, { forceBold: true, size: 32 }), // 16pt
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
              alignment: AlignmentType.CENTER,
            })
          );
        } else if (h2Match) {
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmedNoImg, { forceBold: true, size: 28 }), // 14pt
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 },
            })
          );
        } else if (h3Match) {
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmedNoImg, { forceBold: true, size: 26 }), // 13pt
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 },
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
              spacing: { before: 100, after: 100 },
            })
          );
        } else if (liMatch) {
          elements.push(
            new Paragraph({
              children: [new TextRun({ text: "• " }), ...runs],
              indent: { left: 360 },
              spacing: { before: 60, after: 60 },
            })
          );
        } else {
          elements.push(
            new Paragraph({
              children: runs,
              spacing: { before: 60, after: 120 },
              alignment: AlignmentType.JUSTIFIED,
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
  chapters: ChapterData[]
): Promise<Blob> {
  const sections = [];

  // Title Page Section
  const titlePageChildren: Paragraph[] = [
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          font: "Outfit",
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
            font: "Outfit",
            size: 28, // 14pt
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

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
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Généré avec Iris",
          italics: true,
          font: "Outfit",
          size: 20,
          color: "999999",
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  sections.push({
    properties: {},
    children: titlePageChildren,
  });

  // Chapter Sections (each starts on a new page). When the body already begins
  // with its own <h1> title we use that text and drop the duplicate heading, so
  // there is exactly one chapter title (no doubled title, no near-blank page).
  for (const chapter of chapters) {
    const { title: leadTitle, rest } = extractLeadingHeading(chapter.content);
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
    description: `Livre généré avec Iris - ${title}`,
    sections,
  });

  return await Packer.toBlob(doc);
}
