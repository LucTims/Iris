/**
 * Titres et numérotation des chapitres — source unique de vérité.
 *
 * POURQUOI CE MODULE EXISTE (bug observé en production, livre « L'Audace de
 * Réussir ») : le livre rendu contenait des titres comme
 *
 *     <h1>Chapitre 1 : Forger une Résilience Psychologique</h1>
 *     <h1>Chapitre 3 : Forger une Résilience Psychologique</h1>
 *     <h1>Chapitre 5 : Chapitre 3 : Réappropriation de son Ambition</h1>
 *     <h1>Chapitre 2 : Introduction : L'Avenir Appartient aux Audacieux</h1>
 *
 * Trois défauts se cumulaient :
 *
 *  1. DÉCALAGE. Le chapitre-sommaire occupe la ligne `number = 1` en base ; le
 *     premier vrai chapitre du livre porte donc `number = 2`. Ce numéro de
 *     STOCKAGE était injecté tel quel dans le prompt (« Chapitre 2 : … »), donc
 *     tout le livre était numéroté avec un décalage de +1.
 *  2. DOUBLE PRÉFIXE. Les titres issus du sommaire contiennent déjà « Chapitre
 *     3 : ». Le gabarit ajoutait par-dessus « Chapitre ${number} : » →
 *     « Chapitre 5 : Chapitre 3 : … ».
 *  3. LIMINAIRES NUMÉROTÉS. « Introduction » et « Conclusion » recevaient un
 *     numéro de chapitre, ce qui n'existe dans aucun livre édité.
 *
 * La parade : on ne laisse plus JAMAIS le modèle (ni un gabarit de chaîne)
 * recomposer un titre à partir d'un numéro. On calcule ici, une fois pour
 * toutes, le titre affiché définitif de chaque chapitre, et c'est ce texte
 * exact qui part dans le prompt, s'écrit dans le manuscrit et sert à l'export.
 */

/** Type d'entrée dans la structure du livre. */
export type ChapterRole = "front" | "chapter" | "back";

/**
 * Titres liminaires (avant le premier chapitre numéroté). Ils gardent leur
 * nom propre : on n'écrit pas « Chapitre 1 : Introduction ».
 */
const FRONT_MATTER = [
  "introduction",
  "preface",
  "avant-propos",
  "avant propos",
  "prologue",
  "preambule",
  "note de l'auteur",
  "note de lauteur",
];

/** Titres de fin d'ouvrage — jamais numérotés non plus. */
const BACK_MATTER = [
  "conclusion",
  "epilogue",
  "postface",
  "annexe",
  "annexes",
  "remerciements",
  "glossaire",
  "bibliographie",
  "ressources",
  "a propos de l'auteur",
  "a propos de lauteur",
  "pour aller plus loin",
];

function normalize(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Retire un préfixe de numérotation déjà présent dans le titre, quelle qu'en
 * soit la forme : « Chapitre 3 : », « Chapitre III - », « Chapter 2. »,
 * « Partie 1 — », « Étape 4 : », « Module 2 : », ou un simple « 3. ».
 *
 * Ne touche jamais à un titre qui ne commence pas par une numérotation, et
 * refuse de renvoyer une chaîne vide (un titre réduit à « Chapitre 3 » reste
 * « Chapitre 3 » plutôt que de disparaître).
 */
export function stripChapterPrefix(rawTitle: string): string {
  let title = (rawTitle || "").trim();
  // On boucle : « Chapitre 5 : Chapitre 3 : Titre » doit se réduire à « Titre ».
  for (let i = 0; i < 3; i++) {
    const next = title.replace(
      /^\s*(?:chapitre|chapter|partie|part|section|etape|étape|module|leçon|lecon|jour|day)\s*(?:\d{1,3}|[ivxlcdm]{1,7})\s*(?:[:.)\-–—]\s*|\s+)/i,
      ""
    );
    const bare = next === title ? title.replace(/^\s*\d{1,3}\s*[:.)\-–—]\s+/, "") : next;
    if (bare === title || !bare.trim()) break;
    title = bare.trim();
  }
  return title || (rawTitle || "").trim();
}

/** « Introduction : L'Avenir… » → rôle `front`. */
export function detectChapterRole(rawTitle: string): ChapterRole {
  const stripped = normalize(stripChapterPrefix(rawTitle));
  // On compare sur le premier segment : « Introduction : L'Avenir Appartient… »
  const head = stripped.split(/\s*[:–—-]\s*/)[0].trim();
  if (FRONT_MATTER.includes(head)) return "front";
  if (BACK_MATTER.includes(head)) return "back";
  return "chapter";
}

export interface PlannedChapter {
  title: string;
  brief?: string;
}

export interface LabeledChapter {
  /** Titre nettoyé, sans aucun préfixe de numérotation. */
  cleanTitle: string;
  /** Rôle dans l'ouvrage (liminaire, chapitre numéroté, fin d'ouvrage). */
  role: ChapterRole;
  /** Numéro affiché (1, 2, 3…), uniquement pour `role === "chapter"`. */
  displayNumber: number | null;
  /**
   * Le titre DÉFINITIF tel qu'il doit apparaître dans le livre. C'est cette
   * chaîne exacte — et elle seule — qui part dans le prompt et dans le <h1>.
   */
  heading: string;
}

/**
 * Nom du chapitre selon le type d'ouvrage. Un guide parle d'« Étape », un
 * livre de « Chapitre ». Volontairement conservateur : tout ce qui n'est pas
 * explicitement un guide séquentiel reste « Chapitre ».
 */
export type ChapterNoun = "Chapitre" | "Étape" | "Partie";

/**
 * Calcule les titres définitifs de toute la structure d'un livre.
 *
 * La numérotation repose sur la POSITION parmi les vrais chapitres — pas sur
 * l'index en base, pas sur ce que le titre prétend, pas sur ce que le modèle
 * décide. Un chapitre-sommaire passé par erreur dans la liste est ignoré par
 * l'appelant (il ne doit pas figurer dans le plan).
 */
export function assignChapterLabels(
  plan: PlannedChapter[],
  chapterNoun: ChapterNoun = "Chapitre"
): LabeledChapter[] {
  let counter = 0;
  return plan.map((entry) => {
    const cleanTitle = stripChapterPrefix(entry.title || "").trim();
    const role = detectChapterRole(entry.title || "");
    if (role !== "chapter") {
      return { cleanTitle, role, displayNumber: null, heading: cleanTitle || "Sans titre" };
    }
    counter += 1;
    const heading = cleanTitle
      ? `${chapterNoun} ${counter} : ${cleanTitle}`
      : `${chapterNoun} ${counter}`;
    return { cleanTitle, role, displayNumber: counter, heading };
  });
}
