/**
 * TYPE D'OUVRAGE — livre, guide ou ebook.
 *
 * Iris connaissait jusqu'ici deux axes : la CATÉGORIE (Roman, Développement
 * Personnel, Business…) et le GENRE déduit (fiction / non-fiction). Il manquait
 * l'axe le plus visible pour le lecteur : la FORME de l'ouvrage.
 *
 * Conséquence concrète du manque : un livre de Développement Personnel tombait
 * dans la branche « non-fiction », qui autorise toute la panoplie du guide
 * pratique — encadrés, tableaux comparatifs, listes à puces, checklists. Le
 * résultat se lisait comme une formation d'entreprise (on y trouvait un tableau
 * « Dépense / Nature / Priorité » avec une ligne « Marketing Digital ») alors
 * que l'auteur voulait un LIVRE : des chapitres qui se lisent d'une traite.
 *
 * Les trois formes se distinguent par la DENSITÉ D'APPAREIL ÉDITORIAL, pas par
 * le sujet — on peut écrire un livre, un guide ou un ebook sur le même thème :
 *
 *   livre  — la prose porte tout. Chapitres longs et continus, très peu
 *            d'encadrés, pas de checklist. On lit du début à la fin.
 *   guide  — l'ouvrage sert à FAIRE. Étapes numérotées, procédures, encadrés,
 *            tableaux, points-clés en fin de chapitre. On y revient par section.
 *   ebook  — format court et scannable. Chapitres brefs, sous-titres fréquents,
 *            listes assumées, une action concrète à la fin de chaque partie.
 *
 * Ce module est la source unique de vérité : il pilote à la fois les consignes
 * de rédaction et la mise en page à l'export.
 */

import type { BookGenre } from "@/lib/ai/book-style";
import type { ChapterNoun } from "@/lib/book/chapter-heading";

export type WorkType = "livre" | "guide" | "ebook";

export const WORK_TYPES: WorkType[] = ["livre", "guide", "ebook"];

export interface WorkTypeMeta {
  value: WorkType;
  label: string;
  /** Une ligne affichée sous le libellé dans l'assistant de création. */
  hint: string;
  /** Comment on nomme une division de l'ouvrage. */
  chapterNoun: ChapterNoun;
}

export const WORK_TYPE_META: Record<WorkType, WorkTypeMeta> = {
  livre: {
    value: "livre",
    label: "Livre",
    hint: "Des chapitres qui se lisent d'une traite. La prose porte le propos.",
    chapterNoun: "Chapitre",
  },
  guide: {
    value: "guide",
    label: "Guide pratique",
    hint: "Des étapes, des procédures et des encadrés. On s'en sert pour faire.",
    chapterNoun: "Étape",
  },
  ebook: {
    value: "ebook",
    label: "Ebook",
    hint: "Format court et direct. Sous-titres fréquents, une action à la fin de chaque partie.",
    chapterNoun: "Chapitre",
  },
};

/**
 * Détermine le type d'ouvrage. Le choix EXPLICITE de l'auteur prime toujours ;
 * l'heuristique ne sert qu'aux projets créés avant l'ajout du sélecteur (leur
 * colonne `work_type` est nulle) pour éviter une régression de comportement.
 *
 * Heuristique volontairement prudente : on ne bascule sur `guide` que si le
 * titre ou la catégorie l'annoncent franchement, et sur `ebook` que pour un
 * format court explicitement destiné à ça (lead magnet). Tout le reste — dont
 * le développement personnel, qui était précisément le cas mal traité — est un
 * LIVRE.
 */
export function resolveWorkType(input: {
  explicit?: string | null;
  category?: string | null;
  title?: string | null;
  length?: string | null;
}): WorkType {
  const explicit = (input.explicit || "").toLowerCase().trim();
  if (explicit === "livre" || explicit === "guide" || explicit === "ebook") {
    return explicit as WorkType;
  }

  const hay = `${input.title || ""} ${input.category || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\b(guide|manuel|methode|tutoriel|formation|mode d'emploi|checklist|pas a pas)\b/.test(hay)) {
    return "guide";
  }
  if (/\b(ebook|e-book|lead magnet)\b/.test(hay)) return "ebook";
  if (/lead magnet/i.test(input.length || "")) return "ebook";

  return "livre";
}

/**
 * Consignes de rédaction propres au type d'ouvrage, à combiner avec les règles
 * de genre (fiction / non-fiction). En fiction, la forme est toujours celle du
 * livre : un roman n'a ni étapes ni checklist, quel que soit le sélecteur.
 */
export function workTypeWritingRules(workType: WorkType, genre: BookGenre): string {
  if (genre === "fiction") {
    return `FORME : LIVRE (récit). Le texte se lit d'une traite, du début à la fin. Aucune étape numérotée, aucune checklist, aucun encadré : la narration porte tout.`;
  }

  if (workType === "guide") {
    return `FORME : GUIDE PRATIQUE. Le lecteur ouvre cet ouvrage pour FAIRE quelque chose, pas pour le lire au lit.
- Chaque chapitre suit une progression opérationnelle : le problème, la méthode, les étapes concrètes, les pièges à éviter.
- Numérote les actions (<ol>) dès qu'il y a une marche à suivre. Les listes à puces sont bienvenues.
- Utilise les encadrés (callout-tip, callout-warning, callout-example) là où ils font gagner du temps : 2 à 4 par chapitre.
- Les tableaux comparatifs sont encouragés quand ils remplacent trois paragraphes d'explication.
- Termine chaque chapitre par un encadré <div class="callout callout-info"> intitulé « À retenir » : 3 à 5 points actionnables.
- Écris à la deuxième personne (« vous »), avec des verbes d'action.`;
  }

  if (workType === "ebook") {
    return `FORME : EBOOK court. Le lecteur lit sur écran et va vite.
- Chapitres brefs et denses : pas de délayage, pas de longue mise en contexte.
- Un sous-titre <h2> tous les 3 à 4 paragraphes pour que la page reste scannable.
- Paragraphes courts (3 à 5 lignes). Les listes à puces sont assumées.
- 1 à 2 encadrés maximum par chapitre, et un chiffre-clé <div class="key-figure"> seulement s'il est vraiment marquant.
- Termine chaque chapitre par UNE action concrète que le lecteur peut faire aujourd'hui.`;
  }

  return `FORME : LIVRE. C'est un vrai livre, pas un guide ni une formation : il se lit d'une traite, chapitre après chapitre.
- La PROSE porte le propos. Développe tes idées en paragraphes construits et enchaînés, avec des transitions écrites.
- Les listes à puces sont l'exception, pas la règle : au maximum UNE liste courte par chapitre, et seulement si elle remplace vraiment un paragraphe indigeste. N'énumère pas ce qui se raconte.
- AUCUN tableau de données, AUCUNE checklist, AUCUNE section « À retenir », AUCUNE étape numérotée : ces éléments appartiennent au guide pratique et cassent la lecture d'un livre.
- Au maximum UN encadré (<div class="callout">) ou UNE citation détachée (<div class="pull-quote">) par chapitre — et seulement quand la phrase mérite vraiment d'être isolée.
- Illustre par des exemples RACONTÉS (une situation, une personne, une scène), pas par des tableaux comparatifs.
- Sous-titres <h2> avec parcimonie : deux à quatre par chapitre, formulés comme des idées, pas comme des rubriques de manuel.`;
}

/** Nom de division (« Chapitre » / « Étape ») pour ce type d'ouvrage. */
export function chapterNounFor(workType: WorkType, genre: BookGenre): ChapterNoun {
  if (genre === "fiction") return "Chapitre";
  return WORK_TYPE_META[workType].chapterNoun;
}

/**
 * Consigne donnée au générateur de SOMMAIRE, pour que la structure elle-même
 * corresponde à la forme voulue (un guide se découpe en étapes, un livre en
 * chapitres thématiques, un ebook en parties courtes).
 */
export function workTypeOutlineRules(workType: WorkType, genre: BookGenre): string {
  if (genre === "fiction") {
    return `Structure de RÉCIT : des chapitres qui font progresser l'intrigue. Pas de partie « méthode » ni d'annexe.`;
  }
  if (workType === "guide") {
    return `Structure de GUIDE : une progression opérationnelle du début à la fin. Chaque entrée est une ÉTAPE ou un module qui fait avancer le lecteur vers le résultat promis. Formule les titres avec des verbes d'action.`;
  }
  if (workType === "ebook") {
    return `Structure d'EBOOK court : 5 à 8 parties brèves maximum, chacune tenant une seule idée forte. Titres courts et concrets.`;
  }
  return `Structure de LIVRE : des chapitres thématiques qui s'enchaînent et se lisent dans l'ordre. Formule les titres comme des idées ou des moments, pas comme des rubriques de manuel (évite « Les 5 clés de… », « Méthodologie », « Outils et ressources »).`;
}

/**
 * Réglages de MISE EN PAGE à l'export, par type d'ouvrage. Un livre s'habille
 * comme un livre (lettrine, fleuron, titre centré haut de page) ; un guide se
 * lit comme un manuel (titre à gauche, pas de lettrine, texte non justifié
 * pour éviter les lézardes dans un texte riche en listes).
 */
export interface WorkTypeLayout {
  /** Fleuron ❦ sous les titres de chapitre et en fin d'ouvrage. */
  ornaments: boolean;
  /** Lettrine autorisée en ouverture de chapitre. */
  dropCaps: boolean;
  /** Alignement du corps de texte. */
  bodyAlignment: "justify" | "left";
  /** Alignement du titre de chapitre. */
  chapterTitleAlignment: "center" | "left";
  /** Blanc au-dessus du titre de chapitre, en points. */
  chapterTitleTopMargin: number;
  /** Page de copyright (mentions légales) dans les pages liminaires. */
  copyrightPage: boolean;
  /** Titre courant en haut des pages de contenu. */
  runningHead: boolean;
  /** Page « Fin » en clôture. */
  endPage: boolean;
  /** Interligne du corps. */
  lineHeight: number;
}

export function workTypeLayout(workType: WorkType, genre: BookGenre): WorkTypeLayout {
  if (genre === "fiction" || workType === "livre") {
    return {
      ornaments: true,
      dropCaps: true,
      bodyAlignment: "justify",
      chapterTitleAlignment: "center",
      chapterTitleTopMargin: 60,
      copyrightPage: true,
      runningHead: true,
      endPage: true,
      lineHeight: 1.45,
    };
  }
  if (workType === "guide") {
    return {
      ornaments: false,
      dropCaps: false,
      bodyAlignment: "left",
      chapterTitleAlignment: "left",
      chapterTitleTopMargin: 24,
      copyrightPage: true,
      runningHead: true,
      endPage: false,
      lineHeight: 1.4,
    };
  }
  // ebook
  return {
    ornaments: false,
    dropCaps: false,
    bodyAlignment: "left",
    chapterTitleAlignment: "left",
    chapterTitleTopMargin: 20,
    copyrightPage: false,
    runningHead: false,
    endPage: false,
    lineHeight: 1.5,
  };
}
