import JSZip from 'jszip';

export interface EpubParseResult {
  title: string;
  html: string;
  chaptersFromSpine: { title: string; html: string }[];
}

function getDOMParser(): typeof DOMParser {
  if (typeof DOMParser !== 'undefined') {
    return DOMParser;
  }
  try {
    // Fallback for Node.js test environment
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const xmldom = require('@xmldom/xmldom');
    return xmldom.DOMParser;
  } catch {
    throw new Error('DOMParser non disponible dans cet environnement.');
  }
}

function resolveRelativePath(baseFile: string, relativePath: string): string {
  const cleanRelative = relativePath.split('#')[0].split('?')[0];
  const stack = baseFile.split('/');
  stack.pop(); // Remove filename of base file

  const parts = cleanRelative.split('/');
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

function getMimeType(extension: string): string {
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    case 'png':
    default:
      return 'image/png';
  }
}

/**
 * Parses an EPUB (.epub) zip archive into semantic HTML compatible with TipTap.
 * Reads META-INF/container.xml and OPF manifest/spine in reading order.
 * Resolves relative image references to Base64 data URLs.
 */
export async function parseEpubFile(file: File | Blob | ArrayBuffer): Promise<EpubParseResult> {
  const arrayBuffer =
    file instanceof ArrayBuffer
      ? file
      : (file as any).buffer
      ? (file as any).buffer
      : await (file as Blob).arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const ParserClass = getDOMParser();
  const parser = new ParserClass();

  // 1. Locate container.xml to find OPF path
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) {
    throw new Error('Fichier EPUB invalide : META-INF/container.xml introuvable.');
  }

  const containerDoc = parser.parseFromString(containerXml, 'text/xml');
  const rootfiles = containerDoc.getElementsByTagName('rootfile');
  let opfPath = '';

  for (let i = 0; i < rootfiles.length; i++) {
    const fullPath = rootfiles[i].getAttribute('full-path');
    if (fullPath) {
      opfPath = fullPath;
      break;
    }
  }

  if (!opfPath) {
    throw new Error('Fichier EPUB invalide : chemin OPF introuvable dans container.xml.');
  }

  // 2. Read OPF file
  const opfContent = await zip.file(opfPath)?.async('string');
  if (!opfContent) {
    throw new Error(`Fichier OPF introuvable à l'emplacement : ${opfPath}`);
  }

  const opfDoc = parser.parseFromString(opfContent, 'text/xml');
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

  // Extract Title
  const titleTags = opfDoc.getElementsByTagName('dc:title');
  const fallbackTitleTags = opfDoc.getElementsByTagName('title');
  const fileName = (file as File).name || 'Manuscrit.epub';
  const defaultTitle = fileName.replace(/\.[^/.]+$/, '');
  const title = (titleTags.length > 0 ? titleTags[0].textContent : fallbackTitleTags[0]?.textContent)
    ?.trim() || defaultTitle;

  // Build Manifest Map (id -> href)
  const itemTags = opfDoc.getElementsByTagName('item');
  const manifestMap = new Map<string, { href: string; mediaType: string }>();

  for (let i = 0; i < itemTags.length; i++) {
    const item = itemTags[i];
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') || '';
    if (id && href) {
      manifestMap.set(id, { href, mediaType });
    }
  }

  // 3. Read Spine Items in Reading Order
  const itemrefTags = opfDoc.getElementsByTagName('itemref');
  const spineChapters: { title: string; html: string }[] = [];
  let combinedHtml = '';

  for (let i = 0; i < itemrefTags.length; i++) {
    const idref = itemrefTags[i].getAttribute('idref');
    if (!idref) continue;

    const manifestItem = manifestMap.get(idref);
    if (!manifestItem) continue;

    const itemPath = opfDir ? `${opfDir}/${manifestItem.href}` : manifestItem.href;
    const normalizedPath = itemPath.replace(/\/+/g, '/');

    const htmlContent = await zip.file(normalizedPath)?.async('string');
    if (!htmlContent) continue;

    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 4. Resolve Relative Images to Base64
    const images = Array.from(doc.getElementsByTagName('img'));
    const svgImages = Array.from(doc.getElementsByTagName('image'));
    const allImageElements = [...images, ...svgImages];

    for (const img of allImageElements) {
      const srcAttr = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttribute('href');
      if (srcAttr && !srcAttr.startsWith('http://') && !srcAttr.startsWith('https://') && !srcAttr.startsWith('data:')) {
        const imgPath = resolveRelativePath(normalizedPath, srcAttr);
        const imgFile = zip.file(imgPath) || zip.file(decodeURIComponent(imgPath));

        if (imgFile) {
          const base64 = await imgFile.async('base64');
          const ext = imgPath.split('.').pop() || 'png';
          const mime = getMimeType(ext);
          img.setAttribute('src', `data:${mime};base64,${base64}`);
        }
      }
    }

    // Determine Chapter Title
    const h1s = doc.getElementsByTagName('h1');
    const h2s = doc.getElementsByTagName('h2');
    const docTitles = doc.getElementsByTagName('title');

    let chapterTitle = '';
    if (h1s.length > 0 && h1s[0].textContent?.trim()) {
      chapterTitle = h1s[0].textContent.trim();
    } else if (h2s.length > 0 && h2s[0].textContent?.trim()) {
      chapterTitle = h2s[0].textContent.trim();
    } else if (docTitles.length > 0 && docTitles[0].textContent?.trim()) {
      chapterTitle = docTitles[0].textContent.trim();
    } else {
      chapterTitle = `Chapitre ${i + 1}`;
    }

    const bodyEl = doc.getElementsByTagName('body')[0];
    let bodyHtml = '';
    if (bodyEl) {
      if (typeof (bodyEl as unknown as { innerHTML: string }).innerHTML === 'string') {
        bodyHtml = bodyEl.innerHTML;
      } else {
        const SerializerClass = typeof XMLSerializer !== 'undefined'
          ? XMLSerializer
          : // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('@xmldom/xmldom').XMLSerializer;
        const serializer = new SerializerClass();
        const children = Array.from(bodyEl.childNodes || []);
        bodyHtml = children.map((child) => serializer.serializeToString(child)).join('');
      }
    } else {
      bodyHtml = htmlContent;
    }
    bodyHtml = bodyHtml.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');

    spineChapters.push({ title: chapterTitle, html: bodyHtml });
    combinedHtml += bodyHtml + '\n';
  }

  return {
    title,
    html: combinedHtml.trim(),
    chaptersFromSpine: spineChapters
  };
}
