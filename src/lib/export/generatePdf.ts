interface ChapterData {
  title: string;
  content: string;
  number: number;
}

/**
 * Generate a PDF by opening a print dialog with formatted HTML content.
 * This uses the browser's built-in print-to-PDF functionality which produces
 * high-quality, properly formatted PDF files.
 */
export function generatePdf(
  title: string,
  subtitle: string | undefined,
  chapters: ChapterData[]
): void {
  // Build full HTML document for printing
  const chaptersHtml = chapters
    .map(
      (ch) => `
      <div class="chapter" style="page-break-before: always;">
        <h1 style="text-align: center; font-size: 24pt; margin-top: 80px; margin-bottom: 10px; font-family: 'Outfit', 'Georgia', serif; color: #222;">
          ${ch.title}
        </h1>
        <div style="text-align: center; color: #ccc; margin-bottom: 40px; font-size: 14pt;">───────────────</div>
        <div class="chapter-content" style="font-family: 'Outfit', 'Georgia', serif; font-size: 12pt; line-height: 1.8; text-align: justify; color: #333;">
          ${ch.content}
        </div>
      </div>
    `
    )
    .join("\n");

  const fullHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 2.5cm;
    }
    body {
      font-family: 'Outfit', 'Georgia', serif;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .print-container {
      max-width: 17cm;
      margin: 0 auto;
      padding: 0 1cm;
    }
    /* Table trick to force top/bottom margins on every page */
    table.page-wrapper {
      width: 100%;
      border-collapse: collapse;
      border: none;
    }
    table.page-wrapper > thead > tr > th,
    table.page-wrapper > tfoot > tr > td {
      height: 2cm;
      border: none;
      padding: 0;
      margin: 0;
    }
    table.page-wrapper > tbody > tr > td {
      border: none;
      padding: 0;
      margin: 0;
    }
    .title-page {
      text-align: center;
      padding-top: 200px;
      page-break-after: always;
    }
    .title-page h1 {
      font-size: 32pt;
      font-weight: 800;
      color: #222;
      letter-spacing: 2px;
      margin-bottom: 15px;
    }
    .title-page .subtitle {
      font-size: 14pt;
      font-style: italic;
      color: #666;
      margin-bottom: 40px;
    }
    .title-page .separator {
      color: #ccc;
      font-size: 14pt;
      margin-bottom: 60px;
    }
    .title-page .branding {
      font-size: 10pt;
      font-style: italic;
      color: #999;
    }
    .toc {
      page-break-after: always;
      padding-top: 60px;
    }
    .toc h2 {
      font-size: 18pt;
      font-weight: 700;
      text-align: center;
      margin-bottom: 30px;
      color: #222;
    }
    .toc ul {
      list-style: none;
      padding: 0;
      max-width: 400px;
      margin: 0 auto;
    }
    .toc li {
      padding: 8px 0;
      border-bottom: 1px dotted #ddd;
      font-size: 12pt;
      color: #444;
    }
    .chapter h1 { page-break-after: avoid; }
    .chapter h2 { page-break-after: avoid; font-size: 16pt; margin-top: 30px; margin-bottom: 10px; }
    .chapter h3 { page-break-after: avoid; font-size: 13pt; margin-top: 20px; margin-bottom: 8px; }
    .chapter p { margin-bottom: 12px; orphans: 3; widows: 3; }
    .chapter blockquote {
      border-left: 3px solid #ccc;
      padding-left: 20px;
      margin: 15px 0;
      font-style: italic;
      color: #555;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <table class="page-wrapper">
      <thead>
        <tr><th></th></tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <!-- Title Page -->
            <div class="title-page">
              <h1>${title.toUpperCase()}</h1>
              ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
              <div class="separator">───────────────</div>
              <div class="branding">Généré avec Iris</div>
            </div>

            <!-- Table of Contents -->
            <div class="toc">
              <h2>Table des Matières</h2>
              <ul>
                ${chapters.map((ch) => `<li>${ch.title}</li>`).join("\n")}
              </ul>
            </div>

            <!-- Chapters -->
            ${chaptersHtml}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr><td></td></tr>
      </tfoot>
    </table>
  </div>
</body>
</html>
  `;

  // Open a new window with the formatted content and trigger print
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    // Wait for fonts to load then print
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  }
}
