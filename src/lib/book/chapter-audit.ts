/**
 * CONTRÔLE QUALITÉ D'UN CHAPITRE — la relecture qui manquait.
 *
 * Jusqu'ici, chaque chapitre était écrit en UN SEUL JET puis enregistré tel
 * quel. Aucun auteur ne travaille ainsi : on écrit, on relit, on reprend. C'est
 * précisément cette absence de reprise qui séparait Iris d'un texte « solide ».
 *
 * Le principe retenu est économe. L'audit ci-dessous est DÉTERMINISTE : il ne
 * consomme aucun jeton et ne coûte donc rien à l'auteur. Il ne cherche pas à
 * juger le style — un modèle est mauvais juge de sa propre prose — mais à
 * détecter des défauts FACTUELS et vérifiables :
 *
 *   · le chapitre est nettement plus court que demandé (génération tronquée) ;
 *   · il avance des chiffres sans la moindre source ;
 *   · il redit un chapitre précédent (recouvrement lexical anormal) ;
 *   · il n'a aucune respiration (aucun sous-titre dans un long chapitre) ;
 *   · il s'achève au milieu d'une phrase (coupure du modèle).
 *
 * Une reprise IA n'est déclenchée QUE si un défaut est trouvé, et une seule
 * fois. Un chapitre correct — le cas courant — ne coûte pas un jeton de plus.
 */

import { analyzeFactuality } from "@/lib/ai/factuality";

export type ChapterDefectKind =
  | "trop-court"
  | "chiffres-non-sources"
  | "redite"
  | "sans-structure"
  | "coupe-en-cours";

export interface ChapterDefect {
  kind: ChapterDefectKind;
  /** Description destinée au prompt de reprise, à la 2e personne. */
  instruction: string;
}

export interface AuditInput {
  html: string;
  /** Objectif de longueur en mots pour ce chapitre. */
  wordsTarget: number;
  /** Résumés des chapitres déjà écrits, pour repérer les redites. */
  previousSummaries?: string[];
  /** Des données vérifiées étaient-elles disponibles ? */
  searchContext?: string | null;
  /** Un guide assume les listes ; un livre attend de la prose. */
  isNarrativeBook?: boolean;
}

/** Mots vides français, exclus du calcul de recouvrement. */
const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "que", "qui", "quoi", "dont",
  "ce", "cet", "cette", "ces", "il", "elle", "ils", "elles", "on", "nous", "vous", "je", "tu",
  "son", "sa", "ses", "leur", "leurs", "notre", "votre", "mon", "ma", "mes", "ton", "ta",
  "dans", "pour", "par", "sur", "sous", "avec", "sans", "chez", "vers", "entre", "plus", "moins",
  "est", "sont", "etre", "avoir", "fait", "faire", "peut", "pas", "ne", "en", "y", "a", "au", "aux",
  "se", "si", "mais", "donc", "or", "ni", "car", "comme", "tout", "tous", "toute", "toutes",
  "cela", "ceci", "meme", "aussi", "tres", "bien", "plus", "leur", "the", "of",
]);

export function textOf(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(html: string): number {
  const t = textOf(html);
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

/**
 * Taux de recouvrement entre le chapitre et un résumé précédent, mesuré sur le
 * vocabulaire significatif. Un chapitre qui reprend l'essentiel d'un autre
 * partage une part anormalement élevée de son vocabulaire.
 */
export function overlapRatio(chapterText: string, previousSummary: string): number {
  const summaryWords = significantWords(previousSummary);
  if (summaryWords.size < 8) return 0; // résumé trop court pour conclure
  const chapterWords = significantWords(chapterText);
  if (chapterWords.size === 0) return 0;
  let shared = 0;
  for (const w of summaryWords) if (chapterWords.has(w)) shared++;
  return shared / summaryWords.size;
}

/** En dessous de cette part de l'objectif, le chapitre est jugé tronqué. */
const SHORT_RATIO = 0.55;
/** Au-dessus de ce recouvrement avec un résumé précédent, on suspecte une redite. */
const OVERLAP_THRESHOLD = 0.75;
/** Longueur à partir de laquelle un chapitre sans sous-titre devient illisible. */
const NEEDS_SUBHEADS_ABOVE = 900;

/**
 * Analyse un chapitre et renvoie la liste de ses défauts objectifs.
 * Ne juge jamais le style : uniquement des faits vérifiables.
 */
export function auditChapter(input: AuditInput): ChapterDefect[] {
  const { html, wordsTarget, previousSummaries = [], searchContext, isNarrativeBook } = input;
  const defects: ChapterDefect[] = [];
  const text = textOf(html);
  const words = wordCount(html);

  if (!text) return defects; // rien à auditer : l'appelant gère déjà le vide

  if (wordsTarget > 0 && words < Math.floor(wordsTarget * SHORT_RATIO)) {
    defects.push({
      kind: "trop-court",
      instruction: `Le chapitre ne fait que ${words} mots alors qu'il en visait environ ${wordsTarget}. Développe-le réellement : approfondis les idées déjà présentes, ajoute des exemples concrets et des transitions écrites. N'ajoute pas de remplissage ni de redites pour atteindre la longueur.`,
    });
  }

  // Une phrase finale sans ponctuation de clôture = génération interrompue.
  if (text.length > 200 && !/[.!?»"'’)\]]\s*$/.test(text)) {
    defects.push({
      kind: "coupe-en-cours",
      instruction: `Le chapitre s'interrompt au milieu d'une phrase. Termine-le proprement : conclus l'idée en cours et referme le chapitre.`,
    });
  }

  const factuality = analyzeFactuality(html);
  if (factuality.suspicious && !searchContext) {
    defects.push({
      kind: "chiffres-non-sources",
      instruction: `Le chapitre avance des données chiffrées (${factuality.figures
        .slice(0, 3)
        .join(", ")}) alors qu'aucune source vérifiée n'était disponible. Retire ces chiffres et reformule les passages concernés en qualitatif, sans rien inventer et sans appauvrir le propos.`,
    });
  }

  for (const summary of previousSummaries) {
    if (overlapRatio(text, summary) >= OVERLAP_THRESHOLD) {
      defects.push({
        kind: "redite",
        instruction: `Ce chapitre reprend l'essentiel d'un chapitre précédent (« ${summary.slice(
          0,
          120
        )}… »). Réécris-le pour qu'il apporte du NOUVEAU : appuie-toi sur ce qui précède en une phrase, puis traite ce qui relève réellement de ce chapitre.`,
      });
      break; // une seule consigne de redite suffit
    }
  }

  const subheads = (html.match(/<h2\b/gi) || []).length;
  if (!isNarrativeBook && words > NEEDS_SUBHEADS_ABOVE && subheads === 0) {
    defects.push({
      kind: "sans-structure",
      instruction: `Le chapitre est long et n'a aucun sous-titre : il se lit comme un bloc compact. Ajoute deux à quatre sous-titres <h2> qui découpent la progression du propos.`,
    });
  }

  return defects;
}

/**
 * Construit la consigne de reprise. On ne redemande PAS d'écrire le chapitre
 * depuis zéro (le second jet perdrait ce que le premier avait de bon) : on
 * demande une révision ciblée du texte existant.
 */
export function buildRepairPrompt(html: string, defects: ChapterDefect[], heading: string): string {
  return `Voici un chapitre de livre à réviser. Il est globalement bon mais présente des défauts précis, listés ci-dessous.

DÉFAUTS À CORRIGER :
${defects.map((d, i) => `${i + 1}. ${d.instruction}`).join("\n")}

RÈGLES DE LA RÉVISION :
- Conserve tout ce qui va bien : le propos, le plan, le ton et les passages réussis. Tu RÉVISES, tu ne réécris pas depuis zéro.
- Le chapitre doit toujours commencer par <hr data-page-break><h1>${heading}</h1>, à l'identique.
- Réponds UNIQUEMENT avec le HTML complet du chapitre révisé, sans commentaire, sans préambule et sans bloc de code.

CHAPITRE À RÉVISER :
${html}`;
}
