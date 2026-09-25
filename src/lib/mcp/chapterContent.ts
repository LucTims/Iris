/**
 * Contenu d'un chapitre écrit par un LLM via MCP → HTML du manuscrit Iris.
 *
 * Constat en production : un livre écrit via MCP arrivait en TEXTE BRUT
 * (paragraphes séparés par des retours à la ligne, listes « - », parfois du
 * Markdown). Le manuscrit étant du HTML, chaque chapitre devenait UN SEUL
 * paragraphe géant dans l'éditeur comme dans tous les exports (PDF, ePub,
 * DOCX), listes et intertitres compris.
 *
 * Le contenu est donc converti AVANT l'enregistrement, dans le format exact
 * que produit la rédaction intégrée : `<hr data-page-break><h1>Titre</h1>`
 * puis paragraphes, intertitres, listes, citations et séparateurs de scène.
 * Le texte brut, le Markdown et le HTML sont acceptés.
 */

export interface NormalizedChapter {
  /** HTML prêt à être enregistré dans `chapters.content`. */
  html: string;
  /** Mots du chapitre entier (titre compris), comme la rédaction intégrée. */
  wordCount: number;
  /** Mots du corps seul (hors titre) : base de la facturation. */
  bodyWordCount: number;
}

/** Séparateur de scène de l'éditeur (jamais un <hr>, qui vaut saut de page à l'export). */
export const SCENE_BREAK_HTML =
  '<div class="section-divider section-divider-ornament" data-divider-style="ornament"></div>';

const BLOCK_TAGS = "p|h[1-6]|ul|ol|li|blockquote|div|table|thead|tbody|tr|td|th|figure|figcaption|pre|section|article";
const BLOCK_OPEN_RE = new RegExp(`^<(?:${BLOCK_TAGS})\\b`, "i");
const BLOCK_CLOSE_RE = new RegExp(`^</(?:${BLOCK_TAGS})\\s*>`, "i");
const STANDALONE_RE = /^<(?:hr|img)\b/i;
const HAS_HTML_BLOCKS_RE = new RegExp(`<(?:${BLOCK_TAGS}|hr|br|img)\\b[^>]*>`, "i");

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

export function countWordsInHtml(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

/* ------------------------------------------------------------------ *
 * Sécurité : un LLM (éventuellement manipulé par un contenu qu'il a lu)
 * ne doit pas pouvoir glisser de script dans un manuscrit. L'éditeur
 * (TipTap) filtre déjà par son schéma ; ceci est une défense en profondeur
 * pour les exports, qui lisent le HTML stocké tel quel.
 * ------------------------------------------------------------------ */

const UNSAFE_URL = "(?:javascript|vbscript|data(?!:image\\/(?:png|jpe?g|gif|webp)))\\s*:";
const UNSAFE_URL_ATTR_RE = new RegExp(
  `\\s(?:href|src|action|formaction|xlink:href)\\s*=\\s*(?:"\\s*${UNSAFE_URL}[^"]*"|'\\s*${UNSAFE_URL}[^']*'|${UNSAFE_URL}[^\\s>]*)`,
  "gi"
);

function cleanTag(tag: string): string {
  return tag
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(UNSAFE_URL_ATTR_RE, "")
    .replace(/\sstyle\s*=\s*(?:"[^"]*(?:expression\s*\(|javascript:)[^"]*"|'[^']*(?:expression\s*\(|javascript:)[^']*')/gi, "");
}

export function stripDangerousHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|template|noscript|svg|math|textarea|select|button|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed|template|noscript|svg|math|textarea|select|button|form|input|link|meta|base|frame|frameset)\b[^>]*>/gi, "")
    .replace(/<[a-z][^>]*>/gi, cleanTag);
}

function stripCodeFences(text: string): string {
  return text.replace(/^\s*```+[\w-]*\s*$/gm, "").replace(/```+[\w-]*/g, "");
}

/** Balises inline sans attribut tolérées telles quelles dans du texte brut. */
const SAFE_INLINE_TAG_RE = /&lt;(\/?)(strong|em|b|i|u|s|sup|sub|mark|code|br)\s*\/?&gt;/gi;

/**
 * Markdown inline → HTML. En mode texte, le texte est d'abord échappé ; en
 * mode HTML, il contient déjà des balises, que les motifs n'enjambent jamais.
 */
function renderInline(text: string, escape: boolean): string {
  const base = escape
    ? escapeHtml(text).replace(SAFE_INLINE_TAG_RE, (_m, slash: string, tag: string) => `<${slash}${tag.toLowerCase()}>`)
    : text;
  return base
    .replace(/\[([^\]<>\n]+)\]\((https?:\/\/[^\s)<>"]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`<>\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*<>\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_<>\n]+?)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?!\s)([^*<>\n]+?)\*(?![*\w])/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_(?!\s)([^_<>\n]+?)_(?![_\w])/g, "$1<em>$2</em>");
}

type HeadingLevelOf = (hashes: number) => number;

/**
 * Texte brut / Markdown → blocs HTML. Comme l'éditeur quand on y colle du
 * texte, chaque ligne non vide devient un paragraphe : un LLM sépare ses
 * paragraphes aussi bien par une ligne vide que par un simple retour.
 */
function textToBlocks(text: string, headingLevelOf: HeadingLevelOf, escape: boolean): string {
  const out: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];
  const inline = (s: string) => renderInline(s.trim(), escape);

  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li><p>${i}</p></li>`).join("")}</${list.tag}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote>${quote.map((q) => `<p>${q}</p>`).join("")}</blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushList();
    flushQuote();
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || /^(?:<br\s*\/?>\s*)+$/i.test(line)) {
      flushAll();
      continue;
    }

    // Séparateur de scène (---, ***, * * *, ⁂) : jamais un saut de page.
    if (/^(?:[-*_]\s*){3,}$/.test(line) || /^[⁂❦✻]+$/.test(line)) {
      flushAll();
      out.push(SCENE_BREAK_HTML);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      flushAll();
      const level = headingLevelOf(heading[1].length);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)<>"]+)\)$/);
    if (image) {
      flushAll();
      out.push(`<img src="${escapeAttr(image[2])}" alt="${escapeAttr(image[1])}">`);
      continue;
    }

    // Puces Markdown. Les tirets longs (— / –) ne sont PAS des puces : en
    // français, ils ouvrent les répliques d'un dialogue.
    const bullet = line.match(/^[-*+•]\s+(.+)$/) || line.match(/^\d{1,3}[.)]\s+(.+)$/);
    if (bullet) {
      const tag = /^\d/.test(line) ? "ol" : "ul";
      flushQuote();
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(inline(bullet[1]));
      continue;
    }

    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) {
      flushList();
      if (quoted[1].trim()) quote.push(inline(quoted[1]));
      continue;
    }

    flushAll();
    out.push(`<p>${inline(line)}</p>`);
  }
  flushAll();
  return out.join("\n");
}

/**
 * HTML écrit par le LLM : ses blocs sont conservés, mais le texte laissé HORS
 * de tout bloc (lignes nues, Markdown, balises inline) est regroupé puis
 * converti bloc par bloc — sinon il fusionnerait en un seul paragraphe.
 */
function htmlToBlocks(html: string, headingLevelOf: HeadingLevelOf): string {
  const parts = html.split(/(<[^>]+>)/g);
  let depth = 0;
  let pending = "";
  let out = "";

  const flushPending = () => {
    if (pending.trim()) out += `\n${textToBlocks(pending, headingLevelOf, false)}\n`;
    pending = "";
  };

  for (const part of parts) {
    if (!part) continue;
    const isTag = part.startsWith("<");

    if (depth === 0) {
      if (isTag && (BLOCK_OPEN_RE.test(part) || BLOCK_CLOSE_RE.test(part) || STANDALONE_RE.test(part))) {
        flushPending();
      } else {
        // Texte nu ou balise inline hors bloc : on accumule (<br> = retour).
        pending += isTag && /^<br\b/i.test(part) ? "\n" : part;
        continue;
      }
    }

    if (isTag) {
      if (BLOCK_CLOSE_RE.test(part)) depth = Math.max(0, depth - 1);
      else if (BLOCK_OPEN_RE.test(part) && !/\/>$/.test(part)) depth += 1;
    }
    out += part;
  }
  flushPending();
  return out;
}

function stripLeadingTitle(html: string): string {
  let body = html.trim();
  for (let i = 0; i < 4; i++) {
    const next = body
      .replace(/^(?:<hr[^>]*>\s*|<p>\s*(?:&nbsp;|<br\s*\/?>)?\s*<\/p>\s*)+/i, "")
      .replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "");
    if (next === body) break;
    body = next.trim();
  }
  return body;
}

/** Mots du corps d'un chapitre déjà enregistré (titre de tête exclu). */
export function chapterBodyWordCount(html: string | null | undefined): number {
  return html ? countWordsInHtml(stripLeadingTitle(html)) : 0;
}

export function normalizeLlmChapterContent(
  content: string,
  opts: { title: string; startsOnNewPage: boolean }
): NormalizedChapter {
  const source = stripCodeFences((content || "").replace(/\r\n?/g, "\n")).trim();

  // Premier intertitre « # » = titre du chapitre (remplacé par `title`) ;
  // un « # » plus loin est un intertitre de section : en <h1>, il ouvrirait
  // une nouvelle page à l'export et serait pris pour un nouveau chapitre.
  let seenHeading = false;
  const headingLevelOf: HeadingLevelOf = (hashes) => {
    const first = !seenHeading;
    seenHeading = true;
    if (hashes === 1) return first ? 1 : 2;
    return Math.min(hashes, 3);
  };

  let body = HAS_HTML_BLOCKS_RE.test(source)
    ? htmlToBlocks(stripDangerousHtml(source), headingLevelOf)
    : textToBlocks(source, headingLevelOf, true);

  body = stripLeadingTitle(body)
    // Un seul <h1> par chapitre : son titre (voir headingLevelOf).
    .replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi, "<h2$1>$2</h2>")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const heading = `<h1>${escapeHtml(opts.title.trim() || "Chapitre")}</h1>`;
  const html = `${opts.startsOnNewPage ? "<hr data-page-break>" : ""}${heading}${body ? `\n${body}` : ""}`;

  return { html, wordCount: countWordsInHtml(html), bodyWordCount: countWordsInHtml(body) };
}
