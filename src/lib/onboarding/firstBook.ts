/**
 * Parcours guidé « Mon premier livre » — logique PURE (aucune dépendance
 * React/Supabase) pour être testable et partagée entre le tableau de bord et
 * la fenêtre d'accueil.
 *
 * Chaque étape est DÉDUITE des données réelles renvoyées par /api/projects
 * (aucun état « coché à la main ») :
 *   1. Créer mon livre        → au moins un projet existe ;
 *   2. Générer le plan        → le projet a des chapitres à rédiger, ou son
 *                               sommaire contient du texte (word_count > 0) ;
 *   3. Écrire le 1er chapitre → au moins un chapitre (hors sommaire) rédigé
 *                               (`completion.written`, calculé côté serveur) ;
 *   4. Créer la couverture    → `cover_url` renseigné.
 * L'export n'est PAS suivi : aucun signal fiable n'est enregistré en base.
 */

import {
  COVER_IMAGE_COINS,
  DEFAULT_WRITING_MODEL,
  OUTLINE_MAX_COINS,
  PLAN_MAX_COINS,
  WELCOME_COINS,
  estimateChapterCoins,
  maxChargeForQuote,
} from "@/lib/ai/pricing";

/** Longueur de chapitre de référence pour le devis affiché (mots). */
export const REFERENCE_CHAPTER_WORDS = 800;

/** Coût maximal d'un chapitre de référence avec le modèle par défaut. */
export const FIRST_CHAPTER_MAX_COINS = maxChargeForQuote(
  estimateChapterCoins(REFERENCE_CHAPTER_WORDS, DEFAULT_WRITING_MODEL)
);

/**
 * Nombre de chapitres de référence couverts par les pièces offertes, une fois
 * le plan payé. On réserve aussi le plafond d'une structure (OUTLINE) pour
 * rester prudent : la promesse affichée doit toujours être tenue.
 */
export function welcomeChaptersCovered(budget: number = WELCOME_COINS): number {
  const left = budget - PLAN_MAX_COINS - OUTLINE_MAX_COINS;
  if (!Number.isFinite(left) || left <= 0) return 0;
  return Math.floor(left / FIRST_CHAPTER_MAX_COINS);
}

/** Sous-ensemble des champs d'un projet renvoyés par GET /api/projects. */
export interface FirstBookProject {
  id: string;
  title?: string | null;
  cover_url?: string | null;
  total_words?: number | null;
  completion?: { written?: number | null; total?: number | null } | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export type FirstBookStepId = "create" | "plan" | "chapter" | "cover";

export interface FirstBookStep {
  id: FirstBookStepId;
  label: string;
  description: string;
  done: boolean;
  /** Lien de l'action à mener (null si l'étape est faite). */
  href: string | null;
  ctaLabel: string;
  /** Coût maximal en pièces (0 = gratuit, null = variable). */
  maxCoins: number | null;
  /** Libellé du coût à afficher. */
  costLabel: string;
}

export interface FirstBookProgress {
  steps: FirstBookStep[];
  completed: number;
  total: number;
  percent: number;
  isComplete: boolean;
  /** Projet sur lequel portent les étapes 2 à 4 (null sans projet). */
  focusProjectId: string | null;
}

function hasPlan(p: FirstBookProject): boolean {
  return (p.completion?.total ?? 0) > 0 || (p.total_words ?? 0) > 0;
}

function hasWrittenChapter(p: FirstBookProject): boolean {
  return (p.completion?.written ?? 0) > 0;
}

function hasCover(p: FirstBookProject): boolean {
  return typeof p.cover_url === "string" && p.cover_url.trim().length > 0;
}

function projectScore(p: FirstBookProject): number {
  return [hasPlan(p), hasWrittenChapter(p), hasCover(p)].filter(Boolean).length;
}

/**
 * Projet le plus avancé (à égalité, le premier de la liste — /api/projects
 * trie par date de mise à jour décroissante, donc le plus récent).
 */
export function pickFocusProject<T extends FirstBookProject>(projects: T[]): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const p of projects || []) {
    if (!p || !p.id) continue;
    const score = projectScore(p);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

export function computeFirstBookProgress(projects: FirstBookProject[] | null | undefined): FirstBookProgress {
  const focus = pickFocusProject(projects || []);
  const id = focus ? encodeURIComponent(focus.id) : null;
  const redaction = id ? `/redaction?projectId=${id}` : "/projects/new";

  const steps: FirstBookStep[] = [
    {
      id: "create",
      label: "Créer mon livre",
      description: "Titre, thème et public : l'assistant vous guide en quelques minutes.",
      done: !!focus,
      href: focus ? null : "/projects/new",
      ctaLabel: "Créer mon livre",
      maxCoins: 0,
      costLabel: "Gratuit",
    },
    {
      id: "plan",
      label: "Générer le plan",
      description: "L'IA rédige le sommaire détaillé de votre ouvrage.",
      done: !!focus && hasPlan(focus),
      // `new=true` relance la génération automatique du plan dans l'éditeur
      // (uniquement si le premier chapitre est encore vide : sans risque).
      href: focus && !hasPlan(focus) ? `${redaction}&new=true` : null,
      ctaLabel: "Générer le plan",
      maxCoins: PLAN_MAX_COINS,
      costLabel: `${fmt(PLAN_MAX_COINS)} pièces max`,
    },
    {
      id: "chapter",
      label: "Écrire le premier chapitre",
      description: `Un chapitre d'environ ${fmt(REFERENCE_CHAPTER_WORDS)} mots, prêt à relire et modifier.`,
      done: !!focus && hasWrittenChapter(focus),
      href: focus && !hasWrittenChapter(focus) ? redaction : null,
      ctaLabel: "Écrire le chapitre",
      maxCoins: FIRST_CHAPTER_MAX_COINS,
      costLabel: `${fmt(FIRST_CHAPTER_MAX_COINS)} pièces max`,
    },
    {
      id: "cover",
      label: "Créer la couverture",
      description: `Version standard pour quelques pièces, ou premium pour ${fmt(COVER_IMAGE_COINS)} pièces.`,
      done: !!focus && hasCover(focus),
      href: focus && !hasCover(focus) ? `/cover-studio/${id}` : null,
      ctaLabel: "Créer la couverture",
      maxCoins: null,
      costLabel: "Quelques pièces",
    },
  ];

  // Une étape ne propose son action que si la précédente est faite :
  // un seul appel à l'action clair à la fois, dans l'ordre du parcours.
  let blocked = false;
  for (const step of steps) {
    if (blocked) step.href = null;
    if (!step.done) blocked = true;
  }

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  return {
    steps,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    isComplete: completed === total,
    focusProjectId: focus ? focus.id : null,
  };
}
