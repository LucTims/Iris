/**
 * « LIVRE TERMINÉ » — quand un ouvrage peut-il être déclaré fini ?
 *
 * LE PROBLÈME. La colonne `projects.status` existait et la liste des projets
 * savait afficher un état « Terminé » (barre à 100 %, pastille verte), mais
 * RIEN dans l'application ne passait jamais un projet à cet état : tous les
 * projets naissaient « En cours » et y restaient à vie. L'auteur n'avait aucun
 * moyen de savoir — ni de montrer — qu'un livre était abouti.
 *
 * LE CRITÈRE. Un livre est terminé quand TOUS ses chapitres sont réellement
 * rédigés. On ne se fie donc ni au nombre de chapitres attendu (l'auteur peut
 * en ajouter ou en retirer), ni au nombre de mots total (un conte illustré fait
 * 600 mots, un essai 90 000) : on regarde, chapitre par chapitre, s'il contient
 * autre chose que son titre.
 *
 * Le sommaire / la table des matières est exclu du décompte : ce n'est pas un
 * chapitre à rédiger, et l'y inclure aurait rendu tout livre avec sommaire
 * définitivement « incomplet ».
 *
 * Module PUR (aucune dépendance Supabase/réseau) pour être utilisable côté
 * serveur comme côté client, et testable sans base.
 */

/** Seuil de caractères de texte réel en dessous duquel un chapitre est vide. */
export const MIN_CHAPTER_CHARS = 40;

export interface ChapterLike {
  title?: string | null;
  content?: string | null;
  word_count?: number | null;
}

export type BookStatus = "Brouillon" | "En rédaction" | "Terminé";

export interface CompletionReport {
  /** Chapitres rédigés (hors sommaire). */
  written: number;
  /** Chapitres à rédiger (hors sommaire). */
  total: number;
  /** Avancement en pourcentage, borné à 100. */
  percent: number;
  /** Titres des chapitres encore vides, dans l'ordre. */
  missing: string[];
  /** Vrai quand chaque chapitre à rédiger contient du texte. */
  isComplete: boolean;
  status: BookStatus;
}

/** Texte réel d'un fragment HTML, balises et entités retirées. */
function plainText(html: string | null | undefined): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Le sommaire n'est pas un chapitre à rédiger. */
export function isSummaryChapter(chapter: ChapterLike): boolean {
  return /sommaire|table des mati|prototype du livre/i.test(chapter.title || "");
}

/**
 * Un chapitre est rédigé s'il contient du texte au-delà de son propre titre.
 *
 * On retire le premier titre du contenu avant de mesurer : sans cela, un
 * chapitre réduit à `<h1>Chapitre 5 : Les Effets Cumulatifs</h1>` compterait
 * ses ~35 caractères de titre comme du corps de texte et passerait pour écrit.
 */
export function isChapterWritten(chapter: ChapterLike): boolean {
  if (typeof chapter.word_count === "number" && chapter.word_count > 0) return true;
  const withoutHeading = (chapter.content || "").replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/i, " ");
  return plainText(withoutHeading).length >= MIN_CHAPTER_CHARS;
}

/**
 * Évalue l'avancement d'un livre à partir de ses chapitres.
 *
 * Un projet sans aucun chapitre à rédiger (uniquement un sommaire, ou rien du
 * tout) n'est PAS terminé : c'est un brouillon. Déclarer « terminé » un livre
 * vide serait le pire faux positif possible.
 */
export function evaluateCompletion(chapters: ChapterLike[] | null | undefined): CompletionReport {
  const list = (chapters || []).filter((c) => !isSummaryChapter(c));
  const total = list.length;

  if (total === 0) {
    return { written: 0, total: 0, percent: 0, missing: [], isComplete: false, status: "Brouillon" };
  }

  const missing = list.filter((c) => !isChapterWritten(c)).map((c) => (c.title || "Chapitre sans titre").trim());
  const written = total - missing.length;
  const percent = Math.min(100, Math.round((written / total) * 100));
  const isComplete = missing.length === 0;

  return {
    written,
    total,
    percent,
    missing,
    isComplete,
    status: isComplete ? "Terminé" : written === 0 ? "Brouillon" : "En rédaction",
  };
}

/**
 * Statut d'affichage d'un projet.
 *
 * Le choix EXPLICITE de l'auteur prime : s'il a marqué son livre terminé (ou
 * l'a rouvert), on respecte sa décision plutôt que de la recalculer à chaque
 * lecture. L'évaluation automatique ne sert qu'aux projets jamais marqués.
 */
export function resolveBookStatus(
  storedStatus: string | null | undefined,
  report: CompletionReport
): BookStatus {
  const stored = (storedStatus || "").trim();
  if (stored === "Terminé") return "Terminé";
  if (stored === "Mise en page") return "En rédaction";
  return report.status;
}
