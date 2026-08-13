import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  BorderStyle,
} from "docx";

interface ChapterData {
  title: string;
  content: string;
  number: number;
}

/**
 * Strips HTML tags and returns plain text segments from HTML content.
 * Handles <p>, <h1>-<h3>, <strong>, <em>, <br>, <li>, <blockquote>.
 */
function htmlToDocxParagraphs(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Split by block-level elements
  const blocks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(ul|ol)>/gi, "")
    .split(/<\/(?:p|h[1-6]|li|blockquote|div)>/gi);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Detect heading level
    const h1Match = trimmed.match(/<h1[^>]*>/i);
    const h2Match = trimmed.match(/<h2[^>]*>/i);
    const h3Match = trimmed.match(/<h3[^>]*>/i);
    const liMatch = trimmed.match(/<li[^>]*>/i);
    const bqMatch = trimmed.match(/<blockquote[^>]*>/i);

    // Strip all remaining HTML tags for the text content
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

    // Detect bold/italic segments within the text
    const runs = parseTextRuns(trimmed);

    if (h1Match) {
      paragraphs.push(
        new Paragraph({
          children: runs,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          alignment: AlignmentType.CENTER,
        })
      );
    } else if (h2Match) {
      paragraphs.push(
        new Paragraph({
          children: runs,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (h3Match) {
      paragraphs.push(
        new Paragraph({
          children: runs,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (bqMatch) {
      paragraphs.push(
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
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "• " }), ...runs],
          indent: { left: 360 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: runs,
          spacing: { before: 60, after: 120 },
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    }
  }

  return paragraphs;
}

/**
 * Parse inline HTML and extract TextRun objects with bold/italic formatting.
 */
function parseTextRuns(html: string): TextRun[] {
  const runs: TextRun[] = [];

  // Remove block-level opening tags
  let cleaned = html.replace(/<(?:p|h[1-6]|li|blockquote|div)[^>]*>/gi, "");

  // Simple approach: split by strong/em tags
  const segments = cleaned.split(/(<\/?(?:strong|b|em|i)>)/gi);

  let isBold = false;
  let isItalic = false;

  for (const segment of segments) {
    const lower = segment.toLowerCase();

    if (lower === "<strong>" || lower === "<b>") {
      isBold = true;
      continue;
    }
    if (lower === "</strong>" || lower === "</b>") {
      isBold = false;
      continue;
    }
    if (lower === "<em>" || lower === "<i>") {
      isItalic = true;
      continue;
    }
    if (lower === "</em>" || lower === "</i>") {
      isItalic = false;
      continue;
    }

    // Strip any remaining HTML tags
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
          font: "Outfit",
          size: 24, // 12pt
        })
      );
    }
  }

  return runs;
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
    const chapterParagraphs: Paragraph[] = [
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
      ...htmlToDocxParagraphs(chapter.content),
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
      children: chapterParagraphs,
    });
  }

  const doc = new Document({
    title: title,
    description: `Livre généré avec Iris - ${title}`,
    sections,
  });

  return await Packer.toBlob(doc);
}
