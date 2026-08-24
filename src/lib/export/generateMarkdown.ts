import { extractLeadingHeading, isSummaryChapter } from "./htmlToPdfmake";

interface ChapterData {
  title: string;
  content: string;
  number: number;
}

/**
 * Converts HTML content to clean Markdown text.
 */
function htmlToMarkdown(html: string): string {
  return html
    // Headings
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
    // Bold and italic
    .replace(/<(?:strong|b)>(.*?)<\/(?:strong|b)>/gi, "**$1**")
    .replace(/<(?:em|i)>(.*?)<\/(?:em|i)>/gi, "*$1*")
    // Lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    // Blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "\n> $1\n")
    // Line breaks and paragraphs
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    // Strip remaining tags
    .replace(/<[^>]*>/g, "")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Generate a Markdown (.md) file from the book chapters.
 */
export function generateMarkdown(
  title: string,
  subtitle: string | undefined,
  chapters: ChapterData[]
): Blob {
  let content = `# ${title}\n`;
  if (subtitle) content += `*${subtitle}*\n`;
  content += "\n---\n\n";

  // Table of Contents — only when the book has no authored summary chapter
  // ("Sommaire" / "Table des matières"), which already serves as the TOC.
  const hasSummary = chapters.some((ch) => isSummaryChapter(ch.title, ch.content));
  if (!hasSummary) {
    content += "## Table des Matières\n\n";
    for (const ch of chapters) {
      content += `- ${ch.title}\n`;
    }
    content += "\n---\n\n";
  }

  // Chapters. Use the body's own leading heading as the title when present so
  // it is not duplicated.
  for (const ch of chapters) {
    const { title: leadTitle, rest } = extractLeadingHeading(ch.content);
    content += `# ${leadTitle || ch.title}\n\n`;
    content += htmlToMarkdown(rest);
    content += "\n\n---\n\n";
  }

  content += "\n*Généré avec Iris*\n";

  return new Blob([content], { type: "text/markdown;charset=utf-8" });
}
