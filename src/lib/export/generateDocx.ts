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

/**
 * Strips HTML tags and returns plain text segments from HTML content.
 * Handles <p>, <h1>-<h3>, <strong>, <em>, <br>, <li>, <blockquote>, <table>.
 */
function htmlToDocxElements(html: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Split out tables first so they are not broken by paragraph splits
  const tableParts = html.split(/(<table[^>]*>[\s\S]*?<\/table>)/gi);

  for (const part of tableParts) {
    if (!part.trim()) continue;

    if (part.toLowerCase().startsWith("<table")) {
      const rows: TableRow[] = [];
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;

      while ((trMatch = trRegex.exec(part)) !== null) {
        const rowContent = trMatch[1];
        const cells: TableCell[] = [];
        
        const tdRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
        let tdMatch;
        while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
          const isHeader = tdMatch[1].toLowerCase() === "th";
          const cellContent = tdMatch[2];
          
          const runs = parseTextRuns(cellContent, { forceBold: isHeader });

          const paragraph = new Paragraph({
            children: runs,
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          });

          cells.push(new TableCell({
            children: [paragraph],
            shading: isHeader ? { fill: "EEEEEE", type: ShadingType.CLEAR, color: "auto" } : undefined,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
          }));
        }

        if (cells.length > 0) {
          rows.push(new TableRow({ children: cells }));
        }
      }

      if (rows.length > 0) {
        elements.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
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
