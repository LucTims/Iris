import { extractLeadingHeading, isSummaryChapter } from "@/lib/export/htmlToPdfmake";
import type { ExportStyle } from "@/lib/export/exportStyle";

/**
 * Structure du livre telle qu'elle sera exportée — partagée par le moteur PDF
 * et par l'aperçu des pages de début dans l'éditeur, pour que le sommaire vu
 * dans l'éditeur soit exactement celui du livre exporté.
 */

export interface BookChapterLike {
  title: string;
  content: string;
}

export interface BookTocEntry {
  /** « Chapitre 3 », « Introduction »… ou null. */
  label: string | null;
  title: string;
  /** Titre complet du chapitre (avant séparation de l'étiquette). */
  fullTitle: string;
  sections: string[];
}

/** Étiquette de chapitre détachée du titre : « Chapitre 3 : Titre » → { label, title }. */
export function splitChapterHeading(raw: string): { label: string | null; title: string } {
  const text = (raw || "").replace(/\s+/g, " ").trim();
  const m = text.match(
    /^(chapitre|chapter|étape|etape|partie|part|module|leçon|lecon|jour|day)\s+(\d{1,3}|[ivxlcdm]{1,7})\s*[:.–—-]\s*(.+)$/i
  );
  if (!m) {
    // Liminaires et fins d'ouvrage : « Introduction : Le grand cirque du monde ».
    const lim = text.match(
      /^(introduction|conclusion|prologue|épilogue|epilogue|préface|preface|avant-propos|postface|post-scriptum)\s*[:.–—-]\s*(.+)$/i
    );
    if (lim) return { label: lim[1].charAt(0).toUpperCase() + lim[1].slice(1).toLowerCase(), title: lim[2].trim() };
    return { label: null, title: text };
  }
  const noun = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return { label: `${noun} ${m[2].toUpperCase()}`, title: m[3].trim() };
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Titre du document unique produit en fin de rédaction (voir mergeBook). */
const MERGED_TITLE_RE = /^\s*livre complet\s*$/i;

/**
 * Un livre « rassemblé » tient dans un seul document où chaque chapitre ouvre
 * sur son <h1>. On le redécoupe en chapitres pour le sommaire et l'export :
 * sinon le sommaire ne voyait qu'UN chapitre (le premier titre du livre).
 */
export function expandBookChapters<T extends BookChapterLike>(chapters: T[], workType?: string | null): T[] {
  if (workType === "storybook") return chapters;
  const out: T[] = [];
  for (const ch of chapters) {
    const parts = (ch.content || "").split(/(?=<h1\b)/i);
    const headed = parts.filter((p) => /^<h1\b/i.test(p));
    if (headed.length <= 1) {
      out.push(ch);
      continue;
    }
    parts.forEach((part, i) => {
      // Le saut de page qui précédait le titre suivant est inutile : chaque
      // chapitre ouvre déjà sur une nouvelle page.
      const content = part.replace(/(?:\s*<hr[^>]*>\s*)+$/i, "");
      if (!/^<h1\b/i.test(content)) {
        if (plainText(content).length >= 20) out.push({ ...ch, content });
        return;
      }
      const title = plainText(content.match(/^<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "") || `${ch.title} (${i + 1})`;
      out.push({ ...ch, title, content });
    });
  }
  return out;
}

/**
 * Chapitres réellement imprimés : sans le chapitre-sommaire (plan de travail,
 * remplacé par le sommaire paginé) ni les chapitres encore vides.
 */
export function printableChapters<T extends BookChapterLike>(input: T[], workType?: string | null): T[] {
  const chapters = expandBookChapters(input, workType);
  const kept = chapters.filter((ch) => {
    if (workType !== "storybook" && isSummaryChapter(ch.title, ch.content)) return false;
    const { rest } = extractLeadingHeading(ch.content || "");
    return plainText(rest || "").length >= 20;
  });
  return kept.length === 0 && chapters.length > 0 ? chapters : kept;
}

/** Entrées du sommaire, intertitres (h2) compris, à partir du HTML des chapitres. */
export function bookTocEntries(chapters: BookChapterLike[], workType?: string | null): BookTocEntry[] {
  return printableChapters(chapters, workType).map((ch, idx) => {
    const { title: leadTitle, rest } = extractLeadingHeading(ch.content || "");
    const fullTitle = leadTitle || ch.title || `Chapitre ${idx + 1}`;
    const { label, title } = splitChapterHeading(fullTitle);
    const sections = Array.from((rest || "").matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi))
      .map((m) => plainText(m[1]))
      .filter(Boolean);
    return { label, title, fullTitle, sections };
  });
}

/**
 * Le livre comporte-t-il un sommaire ? Réglage explicite d'abord (création,
 * rassemblement du livre, assistant MCP) ; sinon oui s'il a un chapitre
 * « Sommaire », ou s'il a été rassemblé en « Livre complet » en fin de
 * rédaction — le sommaire, simple plan, est alors retiré du document.
 */
export function resolveIncludeToc(
  style: ExportStyle | null | undefined,
  workType: string | null | undefined,
  chapters: BookChapterLike[]
): boolean {
  if (workType === "storybook") return false;
  if (typeof style?.includeToc === "boolean") return style.includeToc;
  return chapters.some((ch) => isSummaryChapter(ch.title, ch.content) || MERGED_TITLE_RE.test(ch.title || ""));
}

/** Texte de la page de mentions légales (identique dans l'éditeur et à l'export). */
export function copyrightNotice(author?: string | null, year = new Date().getFullYear()): string {
  return `© ${year}${author ? ` ${author}` : ""}. Tous droits réservés.\n\nAucune partie de cet ouvrage ne peut être reproduite ou transmise sous quelque forme que ce soit sans l'autorisation écrite de l'auteur.`;
}

/** « Table des matières » si le plan du livre s'appelle ainsi, sinon « Sommaire ». */
export function tocHeading(chapters: BookChapterLike[]): string {
  const plan = chapters.find((ch) => isSummaryChapter(ch.title, ch.content));
  return plan && /table des mati/i.test(plan.title || "") ? "Table des matières" : "Sommaire";
}
