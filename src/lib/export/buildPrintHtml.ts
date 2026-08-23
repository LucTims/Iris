interface ChapterData {
  title: string;
  content: string;
  number: number;
}

/**
 * Google Fonts import covering the full set of families offered by the editor,
 * so a chapter that uses any of them renders faithfully when Chrome (Puppeteer)
 * prints the page to PDF. Kept in sync with RichManuscriptEditor's font list.
 */
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Roboto:ital,wght@0,300;0,400;0,700;1,400&family=Open+Sans:ital,wght@0,300;0,400;0,700;1,400&family=Lato:ital,wght@0,300;0,400;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Nunito:wght@300;400;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,700;1,400&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Dancing+Script:wght@400;700&family=Pacifico&family=Caveat:wght@400;700&family=Fira+Code:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap";

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build a complete, self-contained HTML document for the book, ready to be
 * rendered to PDF by a headless browser. The chapter HTML is inserted as-is,
 * so inline styles from the editor (font-family, color, tables, images) are
 * preserved exactly as the author sees them.
 */
export function buildPrintHtml(
  title: string,
  subtitle: string | undefined,
  chapters: ChapterData[]
): string {
  const chaptersHtml = chapters
    .map(
      (ch, idx) => `
      <section class="chapter">
        <h1 class="chapter-title">${escapeHtml(ch.title || `Chapitre ${ch.number || idx + 1}`)}</h1>
        <div class="chapter-rule">───────────────</div>
        <div class="chapter-content">${ch.content || ""}</div>
      </section>`
    )
    .join("\n");

  const tocHtml = chapters
    .map(
      (ch, idx) =>
        `<li>${escapeHtml(ch.title || `Chapitre ${ch.number || idx + 1}`)}</li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_FONTS_URL}" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Outfit', 'Georgia', serif;
      color: #333;
      font-size: 12pt;
      line-height: 1.7;
    }
    /* Force page breaks respecting the editor's markers.
       - <hr data-page-break> : marker used by AI-generated chapters
       - <div data-type="pageBreak"> : manual page break (Ctrl+Enter) from the
         Tiptap Pages extension */
    hr[data-page-break],
    div[data-type="pageBreak"],
    [data-page-break] {
      border: none;
      height: 0;
      margin: 0;
      page-break-before: always;
      break-before: page;
    }

    .title-page {
      text-align: center;
      padding-top: 220px;
      page-break-after: always;
    }
    .title-page h1 {
      font-size: 30pt;
      font-weight: 800;
      color: #222;
      letter-spacing: 1px;
      margin: 0 0 12px;
    }
    .title-page .subtitle { font-size: 14pt; font-style: italic; color: #666; margin-bottom: 30px; }
    .title-page .separator { color: #ccc; font-size: 14pt; margin: 20px 0 50px; }
    .title-page .branding { font-size: 10pt; font-style: italic; color: #999; }

    .toc { page-break-after: always; padding-top: 40px; }
    .toc h2 { font-size: 18pt; font-weight: 700; text-align: center; margin-bottom: 24px; color: #222; }
    .toc ul { list-style: none; padding: 0; max-width: 460px; margin: 0 auto; }
    .toc li { padding: 8px 0; border-bottom: 1px dotted #ddd; font-size: 12pt; color: #444; }

    .chapter { page-break-before: always; }
    .chapter-title {
      text-align: center;
      font-size: 22pt;
      font-weight: 800;
      color: #222;
      margin: 30px 0 6px;
      page-break-after: avoid;
    }
    .chapter-rule { text-align: center; color: #ddd; font-size: 12pt; margin-bottom: 30px; }

    .chapter-content { text-align: justify; }
    .chapter-content h1 { font-size: 18pt; page-break-after: avoid; margin: 22px 0 10px; }
    .chapter-content h2 { font-size: 15pt; page-break-after: avoid; margin: 20px 0 8px; }
    .chapter-content h3 { font-size: 13pt; page-break-after: avoid; margin: 16px 0 6px; }
    .chapter-content p { margin: 0 0 12px; orphans: 3; widows: 3; }
    .chapter-content blockquote {
      border-left: 3px solid #ccc;
      padding-left: 20px;
      margin: 15px 0;
      font-style: italic;
      color: #555;
    }
    .chapter-content img { max-width: 100%; height: auto; display: block; margin: 16px auto; }

    /* Encadrés / Callouts */
    .chapter-content .callout {
      border-left: 4px solid #94a3b8;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 16px 0;
      background: #f1f5f9;
      page-break-inside: avoid;
    }
    .chapter-content .callout > *:first-child { margin-top: 0; }
    .chapter-content .callout > *:last-child { margin-bottom: 0; }
    .chapter-content .callout::before {
      display: block;
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
    }
    .chapter-content .callout-info { background: #eff6ff; border-left-color: #3b82f6; }
    .chapter-content .callout-info::before { content: "Info"; color: #1d4ed8; }
    .chapter-content .callout-warning { background: #fff7ed; border-left-color: #f97316; }
    .chapter-content .callout-warning::before { content: "Attention"; color: #c2410c; }
    .chapter-content .callout-tip { background: #f0fdf4; border-left-color: #22c55e; }
    .chapter-content .callout-tip::before { content: "Conseil"; color: #15803d; }
    .chapter-content .callout-example { background: #faf5ff; border-left-color: #a855f7; }
    .chapter-content .callout-example::before { content: "Exemple"; color: #7e22ce; }

    /* Tables keep their look and avoid being split mid-row where possible */
    .chapter-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 11pt;
    }
    .chapter-content th, .chapter-content td {
      border: 1px solid #bfbfbf;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    .chapter-content th { background: #eeeeee; font-weight: 700; text-align: center; }
    .chapter-content tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="title-page">
    <h1>${escapeHtml((title || "Sans titre").toUpperCase())}</h1>
    ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ""}
    <div class="separator">───────────────</div>
    <div class="branding">Généré avec Iris</div>
  </div>

  <div class="toc">
    <h2>Table des Matières</h2>
    <ul>
      ${tocHtml}
    </ul>
  </div>

  ${chaptersHtml}
</body>
</html>`;
}
