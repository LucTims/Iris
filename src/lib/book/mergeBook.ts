/**
 * Assemblage des chapitres en UN seul document « Livre complet ».
 *
 * À la fin d'une génération, l'auteur doit voir son livre d'un seul tenant,
 * pas une liste de chapitres séparés (« Découper en chapitres » reste
 * disponible). Module pur, partagé par l'éditeur et testé unitairement.
 */

export interface MergeableChapter {
  title?: string | null;
  content?: string | null;
}

/** Titre du chapitre-sommaire (plan de travail généré par Iris). */
export const isOutlineTitle = (title: string | null | undefined): boolean =>
  /sommaire|table des mati/i.test(title || "");

export const MERGED_BOOK_TITLE = "Livre complet";

const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Concatène les chapitres, séparés par un vrai saut de page. Un chapitre qui
 * commence déjà par son <h1> n'est jamais re-titré (sinon deux titres
 * consécutifs, parfois avec deux numéros différents). Le premier chapitre
 * n'ouvre pas sur un saut de page (page blanche en tête à l'export).
 */
export function mergeChaptersHtml(
  chapters: MergeableChapter[],
  opts: { skipOutline?: boolean } = {}
): string {
  const kept = opts.skipOutline ? chapters.filter((c) => !isOutlineTitle(c.title)) : chapters;
  return kept
    .map((c, idx) => {
      const body = (c.content || "").trim();
      const startsWithHeading = /^\s*(?:<hr[^>]*data-page-break[^>]*>\s*)?<h1\b/i.test(body);
      const block = startsWithHeading ? body : `<h1>${escapeHtml(c.title || `Chapitre ${idx + 1}`)}</h1>\n${body}`;
      const withoutLeadingBreak = block.replace(/^\s*<hr[^>]*data-page-break[^>]*>\s*/i, "");
      return idx === 0 ? withoutLeadingBreak : `<hr data-page-break>${withoutLeadingBreak}`;
    })
    .join("\n");
}
