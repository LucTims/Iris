import { extractLeadingHeading } from "./htmlToPdfmake";

interface ChapterData {
  title: string;
  content: string;
  number: number;
}

interface EpubImage {
  id: string;
  filename: string;
  mediaType: string;
  bytes: Uint8Array;
}

/**
 * Generate a valid EPUB 3.0 file from book chapters.
 * EPUB is essentially a ZIP file with specific XML/XHTML structure.
 * We use JSZip (bundled with docx) to create the zip.
 */
export async function generateEpub(
  title: string,
  subtitle: string | undefined,
  author: string,
  chapters: ChapterData[],
  coverUrl?: string
): Promise<Blob> {
  // Dynamic import of JSZip
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const bookId = `iris-${Date.now()}`;

  // 1. mimetype (must be first, uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 0. Couverture (facultative). On récupère l'image (data: URL ou http),
  // on l'ajoute au zip et on prépare les fragments manifest/spine/metadata.
  // En cas d'échec, la couverture est simplement omise (jamais bloquant).
  let coverExt = "";
  let coverMime = "";
  if (coverUrl) {
    try {
      let buf: Uint8Array | null = null;
      if (coverUrl.startsWith("data:image/")) {
        const m = coverUrl.match(/^data:image\/(png|jpe?g);base64,(.*)$/i);
        if (m) {
          coverMime = /png/i.test(m[1]) ? "image/png" : "image/jpeg";
          coverExt = coverMime === "image/png" ? "png" : "jpg";
          const bin = atob(m[2]);
          buf = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        }
      } else {
        const r = await fetch(coverUrl);
        if (r.ok) {
          const mime = (r.headers.get("content-type") || "").toLowerCase();
          coverMime = /png/.test(mime) ? "image/png" : "image/jpeg";
          coverExt = coverMime === "image/png" ? "png" : "jpg";
          buf = new Uint8Array(await r.arrayBuffer());
        }
      }
      if (buf && buf.length > 0 && buf.length < 8_000_000) {
        zip.file(`OEBPS/cover.${coverExt}`, buf);
      } else {
        coverExt = "";
      }
    } catch {
      coverExt = "";
    }
  }
  const hasCover = !!coverExt;

  // Process chapters: extract embedded/remote images so EPUB readers render them offline
  const embeddedImages: EpubImage[] = [];
  let imageCounter = 0;
  const processedChapters: { title: string; content: string }[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const { title: leadTitle, rest } = extractLeadingHeading(ch.content);
    const effectiveTitle = leadTitle || ch.title;
    let content = rest || "";

    const imgMatches = Array.from(content.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi));
    for (const match of imgMatches) {
      const src = match[1];
      let bytes: Uint8Array | null = null;
      let ext = "jpg";
      let mediaType = "image/jpeg";

      if (src.startsWith("data:image/")) {
        const m = src.match(/^data:image\/(png|jpe?g);base64,(.*)$/i);
        if (m) {
          ext = /png/i.test(m[1]) ? "png" : "jpg";
          mediaType = ext === "png" ? "image/png" : "image/jpeg";
          try {
            const bin = atob(m[2]);
            bytes = new Uint8Array(bin.length);
            for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
          } catch {}
        }
      } else if (/^https?:\/\//i.test(src)) {
        try {
          const r = await fetch(src);
          if (r.ok) {
            const mime = (r.headers.get("content-type") || "").toLowerCase();
            ext = /png/i.test(mime) ? "png" : "jpg";
            mediaType = ext === "png" ? "image/png" : "image/jpeg";
            bytes = new Uint8Array(await r.arrayBuffer());
          }
        } catch {}
      }

      if (bytes && bytes.length > 0 && bytes.length < 8_000_000) {
        imageCounter++;
        const filename = `images/img_${imageCounter}.${ext}`;
        const id = `img_${imageCounter}`;
        embeddedImages.push({ id, filename, mediaType, bytes });
        zip.file(`OEBPS/${filename}`, bytes);
        content = content.split(src).join(filename);
      }
    }

    processedChapters.push({
      title: effectiveTitle,
      content: sanitizeHtmlForXhtml(content),
    });
  }

  const coverManifest = hasCover
    ? `    <item id="cover-image" href="cover.${coverExt}" media-type="${coverMime}" properties="cover-image"/>\n    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n`
    : "";
  const coverMeta = hasCover ? `    <meta name="cover" content="cover-image"/>\n` : "";
  const coverSpine = hasCover ? `    <itemref idref="cover" linear="yes"/>\n` : "";

  const imagesManifest = embeddedImages
    .map((img) => `    <item id="${img.id}" href="${img.filename}" media-type="${img.mediaType}"/>`)
    .join("\n");

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
  const manifestItems = processedChapters
    .map((_, i) => `    <item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`)
    .join("\n");

  const spineItems = processedChapters
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
    <dc:publisher>${escapeXml(author)}</dc:publisher>
${coverMeta}    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${coverManifest}    <item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
${imagesManifest ? imagesManifest + "\n" : ""}${manifestItems}
  </manifest>
  <spine>
${coverSpine}    <itemref idref="titlepage"/>
${spineItems}
  </spine>
</package>`
  );

  // Page de couverture (image pleine page) — placée en tout premier dans le spine.
  if (hasCover) {
    zip.file(
      "OEBPS/cover.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Couverture</title>
  <style>html,body{margin:0;padding:0;height:100%;text-align:center;} img{max-width:100%;max-height:100%;object-fit:contain;}</style>
</head>
<body>
  <img src="cover.${coverExt}" alt="Couverture"/>
</body>
</html>`
    );
  }

  // 4. OEBPS/nav.xhtml (Navigation Document - required for EPUB 3)
  const navItems = processedChapters
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
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
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
/* Callouts */
.callout {
  border-left: 4px solid #3b82f6;
  background-color: #eff6ff;
  padding: 0.8em 1em;
  margin: 1.2em 0;
  border-radius: 4px;
  text-indent: 0;
}
.callout p { text-indent: 0; margin-bottom: 0.4em; }
.callout-warning { border-left-color: #f97316; background-color: #fff7ed; }
.callout-tip { border-left-color: #22c55e; background-color: #f0fdf4; }
.callout-example { border-left-color: #a855f7; background-color: #faf5ff; }

/* Key figures & Pull quotes */
.key-figure {
  text-align: center;
  font-weight: bold;
  font-size: 1.3em;
  color: #92400e;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  padding: 0.8em;
  margin: 1.5em 0;
  border-radius: 6px;
  text-indent: 0;
}
.pull-quote {
  text-align: center;
  font-style: italic;
  font-size: 1.2em;
  color: #334155;
  border-top: 1px solid #cbd5e1;
  border-bottom: 1px solid #cbd5e1;
  padding: 1em 0;
  margin: 1.5em 0;
  text-indent: 0;
}
.section-divider {
  text-align: center;
  color: #94a3b8;
  margin: 2em 0;
  letter-spacing: 0.3em;
  text-indent: 0;
}
p.drop-cap::first-letter {
  font-size: 3.2em;
  float: left;
  line-height: 0.8;
  padding-right: 0.1em;
  font-weight: bold;
}
.has-text-align-center { text-align: center; text-indent: 0; }
.has-text-align-right { text-align: right; text-indent: 0; }
.has-text-align-left { text-align: left; text-indent: 0; }
.has-text-align-justify { text-align: justify; }
mark { background-color: #fef08a; padding: 0.1em 0.2em; }
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
  </div>
</body>
</html>`
  );

  // 7. Chapter XHTML files
  for (let i = 0; i < processedChapters.length; i++) {
    const ch = processedChapters[i];
    zip.file(
      `OEBPS/chapter${i + 1}.xhtml`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeXml(ch.title)}</h1>
  ${ch.content}
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
 * Style and class attributes are preserved so reader styles (font-size, color, etc.) are applied.
 */
function sanitizeHtmlForXhtml(html: string): string {
  return html
    // Close self-closing tags properly for XHTML (including <hr> variants that
    // carry attributes such as the internal page-break marker <hr data-page-break>)
    .replace(/<br\s*\/?>/gi, "<br/>")
    .replace(/<hr\b[^>]*\/?>/gi, "<hr/>")
    .replace(/<img([^>]*?)\/?>/gi, "<img$1/>")
    // Remove internal data attributes that might confuse EPUB readers
    .replace(/\s+data-(?:type|rotation|align|bookmark-id|page-break|callout-type)="[^"]*"/gi, "")
    // Ensure & is properly encoded
    .replace(/&(?!amp;|lt;|gt;|quot;|#39;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;")
    .trim();
}
