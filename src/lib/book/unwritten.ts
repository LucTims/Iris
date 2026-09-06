/**
 * DÉTECTION DES CHAPITRES NON RÉDIGÉS — y compris dans un document fusionné.
 *
 * LE PROBLÈME. Le bouton « Continuer la rédaction » existait déjà, mais il ne
 * s'affichait que lorsque des LIGNES de chapitre étaient vides en base. Or,
 * quand l'auteur interrompt une génération alors qu'il travaille sur la vue
 * « Livre complet », le livre n'est qu'UNE SEULE ligne : les chapitres restants
 * n'y sont que des titres nus, sans corps, à l'intérieur du même document.
 *
 *     <h1>Chapitre 4 : …</h1><p>…deux mille mots…</p>
 *     <h1>Chapitre 5 : Les Effets Cumulatifs</h1>   ← rien en dessous
 *     <h1>Chapitre 6 : Un Passé à Corriger</h1>     ← rien en dessous
 *
 * Aucune ligne n'étant vide, la reprise était jugée impossible et le bouton
 * restait caché : l'auteur n'avait d'autre choix que de relancer tout le livre,
 * en repayant les chapitres déjà écrits.
 *
 * Ce module raisonne donc sur les SECTIONS d'un document (le résultat du
 * découpage par grands titres), et non sur les lignes en base. Il est
 * volontairement pur — aucune dépendance au parseur ni au réseau — pour rester
 * testable et réutilisable des deux côtés.
 */

export interface DocumentSection {
  title: string;
  content: string;
}

/**
 * En dessous de ce nombre de caractères de texte réel (balises retirées), une
 * section est considérée comme un titre sans corps : le chapitre n'a jamais été
 * rédigé. Le seuil est volontairement bas — une phrase de transition laissée
 * par l'auteur suffit à considérer le chapitre comme commencé.
 */
export const EMPTY_BODY_CHARS = 40;

/** Texte réel d'un fragment HTML, balises et espaces normalisés. */
function plainText(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Corps d'une section, c'est-à-dire son contenu privé de son propre titre. */
export function sectionBody(section: DocumentSection): string {
  const withoutHeading = (section.content || "").replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/i, " ");
  return plainText(withoutHeading);
}

/** Une section réduite à son titre = un chapitre annoncé mais jamais écrit. */
export function isUnwrittenSection(section: DocumentSection): boolean {
  if (isSummarySection(section)) return false; // le sommaire n'a pas à être « rédigé »
  return sectionBody(section).length < EMPTY_BODY_CHARS;
}

/** Le sommaire / la table des matières n'est pas un chapitre à rédiger. */
export function isSummarySection(section: DocumentSection): boolean {
  return /sommaire|table des mati/i.test(section.title || "");
}

export interface UnwrittenReport {
  /** Sections qui ne sont qu'un titre, dans l'ordre du document. */
  unwritten: { index: number; title: string }[];
  /** Nombre de sections réellement rédigées (hors sommaire). */
  writtenCount: number;
  /** Nombre total de chapitres (hors sommaire). */
  totalCount: number;
}

/**
 * Analyse les sections d'un document et dit lesquelles restent à écrire.
 * Fonctionne aussi bien sur un livre déjà découpé en lignes que sur un
 * document fusionné qu'on vient de redécouper.
 */
export function findUnwrittenSections(sections: DocumentSection[]): UnwrittenReport {
  const unwritten: { index: number; title: string }[] = [];
  let writtenCount = 0;
  let totalCount = 0;

  sections.forEach((section, index) => {
    if (isSummarySection(section)) return;
    totalCount += 1;
    if (isUnwrittenSection(section)) {
      unwritten.push({ index, title: section.title || `Chapitre ${index + 1}` });
    } else {
      writtenCount += 1;
    }
  });

  return { unwritten, writtenCount, totalCount };
}

/**
 * La reprise a-t-elle un sens ? Il faut à la fois des chapitres à écrire ET au
 * moins un chapitre déjà écrit : sur un livre entièrement vierge, c'est
 * « Générer tout le livre » qu'il faut proposer, pas « Continuer ».
 */
export function canResume(report: UnwrittenReport): boolean {
  return report.unwritten.length > 0 && report.writtenCount > 0;
}

/** Message d'attente affiché à l'auteur pendant la reprise. */
export function resumeLabel(report: UnwrittenReport): string {
  const n = report.unwritten.length;
  if (n === 0) return "Tous les chapitres sont déjà rédigés.";
  return n === 1
    ? "Rédaction du chapitre restant…"
    : `Rédaction des ${n} chapitres restants…`;
}
