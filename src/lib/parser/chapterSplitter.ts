export interface ParsedChapter {
  title: string;
  content: string; // TipTap compatible HTML string
}

function getDOMParser(): typeof DOMParser {
  if (typeof DOMParser !== 'undefined') {
    return DOMParser;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const xmldom = require('@xmldom/xmldom');
    return xmldom.DOMParser;
  } catch {
    throw new Error('DOMParser non disponible dans cet environnement.');
  }
}

function serializeElement(el: Element): string {
  const tag = el.tagName ? el.tagName.toUpperCase() : '';
  if (tag === 'SCRIPT' || tag === 'STYLE') {
    return '';
  }

  let html = '';
  if (typeof (el as unknown as { outerHTML: string }).outerHTML === 'string') {
    html = (el as unknown as { outerHTML: string }).outerHTML;
  } else {
    try {
      const SerializerClass = typeof XMLSerializer !== 'undefined'
        ? XMLSerializer
        : // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('@xmldom/xmldom').XMLSerializer;
      html = new SerializerClass().serializeToString(el);
    } catch {
      html = el.textContent || '';
    }
  }
  return html.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');
}

function serializeNode(node: Node): string {
  if (node.nodeType === 1) {
    return serializeElement(node as Element);
  }
  if (node.nodeType === 3) {
    const text = node.textContent || '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  return '';
}

function getContainerChildren(container: Element): Node[] {
  if (container.children && container.children.length > 0) {
    return Array.from(container.children);
  }
  const childNodes = Array.from(container.childNodes || []);
  return childNodes.filter((node: any) => {
    if (node.nodeType === 1) return true;
    if (node.nodeType === 3 && node.textContent && node.textContent.trim().length > 0) return true;
    return false;
  }) as Node[];
}

function sanitizeHtmlForXml(html: string): string {
  // Strip XML declarations and DOCTYPE statements
  let clean = html.replace(/<\?xml[^>]*\?>/gi, '').replace(/<!DOCTYPE[^>]*>/gi, '');

  // Normalize common HTML entity &nbsp; to numeric character reference
  clean = clean.replace(/&nbsp;?/gi, '&#160;');

  // Escape lone ampersands not part of valid XML entities
  clean = clean.replace(/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/gi, '&amp;');

  return clean;
}

/**
 * Splits an HTML manuscript string into chapters based on H1 and H2 tag boundaries.
 * Preserves all semantic HTML formatting tags (h1-h6, p, strong, em, u, del, ul, ol, li, blockquote, img, a).
 * If no H1 or H2 headings exist, returns a single chapter with the fallback title.
 */
export function splitHtmlIntoChapters(
  htmlString: string,
  fallbackTitle: string = 'Chapitre 1'
): ParsedChapter[] {
  if (!htmlString || !htmlString.trim()) {
    return [{ title: fallbackTitle, content: '' }];
  }

  const ParserClass = getDOMParser() as any;
  const parser = new ParserClass({
    errorHandler: {
      warning: () => {},
      error: () => {},
      fatalError: () => {}
    }
  });

  const sanitized = sanitizeHtmlForXml(htmlString);
  const doc = parser.parseFromString(`<div>${sanitized}</div>`, 'text/html');

  let container: Element = doc.getElementsByTagName('div')[0] || doc.body;
  if (!container) {
    return [{ title: fallbackTitle, content: htmlString }];
  }

  let children = getContainerChildren(container);

  // Unwrap single top-level div / section wrappers if present
  while (
    children.length === 1 &&
    children[0].nodeType === 1 &&
    ((children[0] as Element).tagName.toUpperCase() === 'DIV' || (children[0] as Element).tagName.toUpperCase() === 'SECTION')
  ) {
    container = children[0] as Element;
    children = getContainerChildren(container);
  }

  const h1s = container.getElementsByTagName('h1');
  const h2s = container.getElementsByTagName('h2');

  // Fallback if no H1 or H2 elements exist
  if (h1s.length === 0 && h2s.length === 0) {
    return [{ title: fallbackTitle, content: htmlString }];
  }

  const hasDirectHeadings = children.some((child) => {
    if (child.nodeType !== 1) return false;
    const tag = (child as Element).tagName ? (child as Element).tagName.toUpperCase() : '';
    return tag === 'H1' || tag === 'H2';
  });

  function getHeadingInfo(child: Node): { isHeading: boolean; title?: string } {
    if (child.nodeType !== 1) {
      return { isHeading: false };
    }
    const el = child as Element;
    const tag = el.tagName ? el.tagName.toUpperCase() : '';
    if (tag === 'H1' || tag === 'H2') {
      const rawTitle = el.textContent || '';
      const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();
      return { isHeading: true, title: cleanTitle };
    }
    if (!hasDirectHeadings) {
      const innerH1 = el.getElementsByTagName('h1')[0];
      const innerH2 = el.getElementsByTagName('h2')[0];
      const innerHeading = innerH1 || innerH2;
      if (innerHeading) {
        const rawTitle = innerHeading.textContent || '';
        const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();
        return { isHeading: true, title: cleanTitle };
      }
    }
    return { isHeading: false };
  }

  const chapters: ParsedChapter[] = [];
  let currentTitle = fallbackTitle;
  let currentNodes: Node[] = [];

  for (const child of children) {
    const headingInfo = getHeadingInfo(child);
    if (headingInfo.isHeading) {
      // If nodes were previously accumulated, save previous chapter
      if (currentNodes.length > 0) {
        const chapterHtml = currentNodes.map((node) => serializeNode(node)).join('');
        chapters.push({
          title: currentTitle,
          content: chapterHtml
        });
        currentNodes = [];
      }
      currentTitle = headingInfo.title || `Chapitre ${chapters.length + 1}`;
    }
    currentNodes.push(child);
  }

  // Push final accumulated chapter
  if (currentNodes.length > 0) {
    const chapterHtml = currentNodes.map((node) => serializeNode(node)).join('');
    chapters.push({
      title: currentTitle,
      content: chapterHtml
    });
  }

  return chapters;
}
