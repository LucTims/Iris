/**
 * Nettoyage du HTML produit par les modèles.
 *
 * Constat sur un livre réel (« L'Audace de Réussir », 6 480 mots) : même avec
 * une consigne « HTML uniquement, jamais de Markdown », les modèles laissent
 * passer, chapitre après chapitre, des défauts qui se voient IMMÉDIATEMENT à
 * l'export et donnent l'impression d'un livre bâclé :
 *
 *  - des clôtures de bloc de code : ```html … ``` restées dans le manuscrit ;
 *  - du Markdown brut mélangé au HTML (« ### Titre », « **gras** », « - item »)
 *    qui s'affiche tel quel dans le PDF ;
 *  - la lettrine cassée : `<p class="drop-cap">L</p>e monde…` — le modèle ferme
 *    le paragraphe après la seule initiale, et tout le reste du paragraphe se
 *    retrouve en texte nu, hors balise ;
 *  - un encadré posé AU MILIEU d'une phrase : « touche environ <div
 *    class="key-figure">70 %</div> à un moment » — le bloc coupe la phrase en
 *    deux à l'export ;
 *  - le titre du chapitre écrit deux fois, avec deux numéros différents.
 *
 * Ce module répare tout cela AVANT l'enregistrement en base, pour que le
 * manuscrit stocké soit déjà propre — l'éditeur, l'export PDF, l'ePub et le
 * DOCX partent donc tous d'une source saine.
 */

/** Retire les clôtures de bloc de code Markdown (```html … ```). */
function stripCodeFences(html: string): string {
  return html
    .replace(/^\s*```+[a-zA-Z]*\s*$/gm, "")
    .replace(/```+[a-zA-Z]*/g, "")
    .replace(/```+/g, "");
}

/**
 * Convertit le Markdown résiduel en HTML. On ne traite QUE les lignes qui ne
 * sont pas déjà à l'intérieur d'une balise HTML (une ligne qui commence par
 * « < » est laissée intacte), pour ne jamais abîmer du HTML valide.
 */
function convertResidualMarkdown(html: string): string {
  const lines = html.split("\n");
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // Titres Markdown : ###### → h6 … # → h1 (borné à h6).
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 6);
      out.push(`<h${level}>${heading[2].trim()}</h${level}>`);
      continue;
    }

    // Puces Markdown en début de ligne : « - item » ou « * item ».
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet && !trimmed.startsWith("<")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${bullet[1].trim()}</li>`);
      continue;
    }

    closeList();
    out.push(line);
  }
  closeList();

  // Gras / italique Markdown, uniquement hors balise (on ne touche pas au
  // contenu d'un attribut : le motif exige du texte non vide sans « < » ni « > »).
  return out
    .join("\n")
    .replace(/\*\*([^*<>\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*<>\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
}

/**
 * Répare la lettrine cassée. Le modèle écrit souvent :
 *   `<p class="drop-cap">L</p>e monde dans lequel…`
 * ce qui laisse « e monde dans lequel… » hors de toute balise. On ré-agrège la
 * lettrine et le texte qui la suit dans un seul paragraphe.
 */
function fixBrokenDropCap(html: string): string {
  return html.replace(
    /<p([^>]*class="[^"]*\bdrop-cap\b[^"]*"[^>]*)>\s*([A-Za-zÀ-ÿ])\s*<\/p>\s*([^<]+)/g,
    (_m, attrs: string, initial: string, rest: string) =>
      `<p${attrs}>${initial}${rest.replace(/\s+$/, "")}</p>\n`
  );
}

const BLOCK_DIV_RE =
  /<div\s+class="[^"]*\b(?:callout|key-figure|pull-quote|section-divider)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi;

/**
 * Sort les encadrés de BLOC posés au milieu d'une phrase.
 *
 * `<p>… touche environ <div class="key-figure">70 %</div> à un moment …</p>`
 * devient
 * `<p>… touche environ 70 % à un moment …</p>`
 *
 * On garde le TEXTE dans la phrase (la retirer casserait le sens) et on
 * supprime l'encadré : un chiffre-clé n'a de valeur détachée que s'il forme un
 * bloc autonome, jamais au milieu d'une proposition.
 */
function unwrapInlineBlockDivs(html: string): string {
  return html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, (paragraph) => {
    if (!BLOCK_DIV_RE.test(paragraph)) {
      BLOCK_DIV_RE.lastIndex = 0;
      return paragraph;
    }
    BLOCK_DIV_RE.lastIndex = 0;
    return paragraph.replace(BLOCK_DIV_RE, (block) => {
      const inner = block.replace(/^<div[^>]*>/i, "").replace(/<\/div>$/i, "");
      // Un séparateur de section n'a aucun texte utile : on le retire.
      return /section-divider/i.test(block) ? "" : inner.trim();
    });
  });
}

/**
 * Emballe dans un `<p>` le texte nu resté entre deux blocs. Sans cela, ce
 * texte survit dans l'éditeur mais disparaît ou se colle mal à l'export.
 */
function wrapOrphanText(html: string): string {
  const parts = html.split(/(<[^>]+>)/g);
  let depth = 0;
  let out = "";
  for (const part of parts) {
    if (part.startsWith("<")) {
      if (/^<\/(p|h[1-6]|li|td|th|blockquote|div)\b/i.test(part)) depth = Math.max(0, depth - 1);
      else if (/^<(p|h[1-6]|li|td|th|blockquote|div)\b/i.test(part) && !/\/>$/.test(part)) depth += 1;
      out += part;
      continue;
    }
    if (depth === 0 && part.trim().length > 0) {
      out += `<p>${part.trim()}</p>\n`;
    } else {
      out += part;
    }
  }
  return out;
}

/**
 * Force le titre du chapitre : on retire TOUS les `<h1>` en tête de contenu
 * (le modèle en produit régulièrement deux, avec deux numéros différents), et
 * on réinstalle le titre canonique unique calculé par `chapter-heading`.
 */
function enforceHeading(html: string, expectedHeading: string): string {
  let body = html;
  // Retire les h1 successifs en tête (avec un éventuel saut de page devant).
  for (let i = 0; i < 4; i++) {
    const next = body.replace(
      /^\s*(?:<hr[^>]*data-page-break[^>]*>\s*)?<h1[^>]*>[\s\S]*?<\/h1>\s*/i,
      ""
    );
    if (next === body) break;
    body = next;
  }
  const escaped = expectedHeading
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<hr data-page-break><h1>${escaped}</h1>\n${body.trim()}`;
}

export interface SanitizeOptions {
  /**
   * Titre canonique du chapitre. Quand il est fourni, tout `<h1>` de tête est
   * remplacé par ce titre exact — c'est ce qui supprime définitivement les
   * doublons et les numéros incohérents.
   */
  expectedHeading?: string;
}

/**
 * Nettoie le HTML d'un chapitre fraîchement généré. Sans effet de bord et
 * tolérante : une entrée vide ressort vide, jamais d'exception.
 */
export function sanitizeGeneratedHtml(raw: string, options: SanitizeOptions = {}): string {
  if (!raw || !raw.trim()) return "";

  let html = raw;
  html = stripCodeFences(html);
  html = convertResidualMarkdown(html);
  html = fixBrokenDropCap(html);
  html = unwrapInlineBlockDivs(html);
  html = wrapOrphanText(html);

  // Préambules bavards que la consigne n'élimine pas toujours.
  html = html.replace(
    /^\s*<p>\s*(?:bien s[ûu]r|absolument|voici|avec plaisir|d'accord)\b[^<]{0,120}<\/p>\s*/i,
    ""
  );

  html = html.replace(/\n{3,}/g, "\n\n").trim();

  if (options.expectedHeading) {
    html = enforceHeading(html, options.expectedHeading);
  }
  return html;
}
