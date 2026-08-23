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
} from "docx";

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
 * Strips HTML tags and returns plain text segments from HTML content.
 * Handles <p>, <h1>-<h3>, <strong>, <em>, <br>, <li>, <blockquote>, <table>,
 * and <div class="callout"> boxes.
 */
function htmlToDocxElements(html: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Isolate callout boxes first — rendered as bordered/shaded single-cell tables
  const calloutParts = html.split(/(<div[^>]*class="[^"]*\bcallout\b[^"]*"[^>]*>[\s\S]*?<\/div>)/gi);

  for (const cpart of calloutParts) {
    if (!cpart.trim()) continue;

    if (/^<div[^>]*class="[^"]*\bcallout\b/i.test(cpart.trim())) {
      elements.push(renderCallout(cpart));
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

        // Manual page break (Ctrl+Enter) from the Tiptap Pages extension.
        // The AI chapter marker <hr data-page-break> is intentionally NOT
        // matched here: chapters are already separate sections, so adding a
        // break for it would produce blank pages.
        if (/data-type=["']?pageBreak/i.test(trimmed)) {
          elements.push(new Paragraph({ children: [new PageBreak()] }));
          continue;
        }

        const h1Match = trimmed.match(/<h1[^>]*>/i);
        const h2Match = trimmed.match(/<h2[^>]*>/i);
        const h3Match = trimmed.match(/<h3[^>]*>/i);
        const liMatch = trimmed.match(/<li[^>]*>/i);
        const bqMatch = trimmed.match(/<blockquote[^>]*>/i);

        const plainText = trimmed
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        if (!plainText) continue;

        const runs = parseTextRuns(trimmed);

        if (h1Match) {
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmed, { forceBold: true, size: 32 }), // 16pt
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
              alignment: AlignmentType.CENTER,
            })
          );
        } else if (h2Match) {
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmed, { forceBold: true, size: 28 }), // 14pt
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 },
            })
          );
        } else if (h3Match) {
          elements.push(
            new Paragraph({
              children: parseTextRuns(trimmed, { forceBold: true, size: 26 }), // 13pt
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

  // Chapter Sections (each starts on a new page)
  for (const chapter of chapters) {
    const chapterElements: (Paragraph | Table)[] = [
      // Chapter title
      new Paragraph({
        children: [
          new TextRun({
            text: chapter.title,
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
      ...htmlToDocxElements(chapter.content),
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
