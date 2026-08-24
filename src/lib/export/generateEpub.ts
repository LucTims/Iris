import { extractLeadingHeading } from "./htmlToPdfmake";

interface ChapterData {
  title: string;
  content: string;
  number: number;
}

/**
 * Generate a valid EPUB file from book chapters.
 * EPUB is essentially a ZIP file with specific XML/XHTML structure.
 * We use JSZip (bundled with docx) to create the zip.
 */
export async function generateEpub(
  title: string,
  subtitle: string | undefined,
  author: string,
  chapters: ChapterData[]
): Promise<Blob> {
  // Dynamic import of JSZip
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const bookId = `iris-${Date.now()}`;

  // 1. mimetype (must be first, uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. OEBPS/content.opf (Package Document)
  const manifestItems = chapters
    .map((_, i) => `    <item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`)
    .join("\n");

  const spineItems = chapters
    .map((_, i) => `    <itemref idref="chapter${i + 1}"/>`)
    .join("\n");

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>fr</dc:language>
    <dc:publisher>Iris</dc:publisher>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine>
    <itemref idref="titlepage"/>
${spineItems}
  </spine>
</package>`
  );

  // 4. OEBPS/nav.xhtml (Navigation Document - required for EPUB 3)
  const navItems = chapters
    .map((ch, i) => `      <li><a href="chapter${i + 1}.xhtml">${escapeXml(ch.title)}</a></li>`)
    .join("\n");

  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Table des matières</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc">
    <h1>Table des Matières</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`
  );

  // 5. OEBPS/style.css
  zip.file(
    "OEBPS/style.css",
    `body {
  font-family: 'Georgia', serif;
  line-height: 1.8;
  color: #333;
  margin: 1em;
  text-align: justify;
}
h1 {
  font-size: 1.8em;
  font-weight: 700;
  text-align: center;
  margin-top: 2em;
  margin-bottom: 0.5em;
  color: #222;
}
h2 {
  font-size: 1.4em;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
h3 {
  font-size: 1.1em;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
}
p {
  margin-bottom: 0.8em;
  text-indent: 1.5em;
}
blockquote {
  border-left: 3px solid #ccc;
  padding-left: 1em;
  margin: 1em 0;
  font-style: italic;
  color: #555;
}
.title-page {
  text-align: center;
  padding-top: 30%;
}
.title-page h1 {
  font-size: 2.2em;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.title-page .subtitle {
  font-size: 1.1em;
  font-style: italic;
  color: #666;
  margin-top: 0.5em;
}
.title-page .separator {
  color: #ccc;
  margin: 2em 0;
}
.title-page .branding {
  font-size: 0.8em;
  font-style: italic;
  color: #999;
  margin-top: 3em;
}
`
  );

  // 6. OEBPS/titlepage.xhtml
  zip.file(
    "OEBPS/titlepage.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="title-page">
    <h1>${escapeXml(title)}</h1>
    ${subtitle ? `<p class="subtitle">${escapeXml(subtitle)}</p>` : ""}
    <p class="separator">───────────────</p>
    <p class="branding">Généré avec Iris</p>
  </div>
</body>
</html>`
  );

  // 7. Chapter XHTML files
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    // Use the body's own leading <h1> as the title when present, so the chapter
    // heading is not duplicated (each chapter is already its own XHTML file).
    const { title: leadTitle, rest } = extractLeadingHeading(ch.content);
    const effectiveTitle = leadTitle || ch.title;
    const cleanContent = sanitizeHtmlForXhtml(rest);

    zip.file(
      `OEBPS/chapter${i + 1}.xhtml`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(effectiveTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeXml(effectiveTitle)}</h1>
  ${cleanContent}
</body>
</html>`
    );
  }

  return await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize HTML content to be valid XHTML for EPUB.
 * XHTML requires all tags to be properly closed and uses strict XML rules.
 */
function sanitizeHtmlForXhtml(html: string): string {
  return html
    // Close self-closing tags properly for XHTML (including <hr> variants that
    // carry attributes such as the internal page-break marker <hr data-page-break>)
    .replace(/<br\s*\/?>/gi, "<br/>")
    .replace(/<hr\b[^>]*\/?>/gi, "<hr/>")
    .replace(/<img([^>]*?)\/?>/gi, "<img$1/>")
    // Remove data attributes that might confuse EPUB readers
    .replace(/\s+data-[a-z-]+="[^"]*"/gi, "")
    // Remove style attributes (use CSS instead)
    .replace(/\s+style="[^"]*"/gi, "")
    // Remove class attributes
    .replace(/\s+class="[^"]*"/gi, "")
    // Ensure & is properly encoded
    .replace(/&(?!amp;|lt;|gt;|quot;|#39;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;")
    .trim();
}
