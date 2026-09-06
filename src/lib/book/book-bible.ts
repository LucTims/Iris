/**
 * BIBLE DU LIVRE — la mémoire permanente de l'ouvrage.
 *
 * LE PROBLÈME QU'ELLE RÉSOUT. Iris écrit un livre chapitre par chapitre, un
 * appel IA par chapitre (contrainte de temps : 60 s par requête). Chaque appel
 * repartait presque de zéro. Tout ce que le modèle savait du livre en écrivant
 * le chapitre 9, c'était :
 *
 *   - le sommaire, TRONQUÉ à 2 000 caractères ;
 *   - un résumé de 2 à 3 phrases des 4 derniers chapitres seulement ;
 *   - le synopsis initial.
 *
 * Autrement dit : au chapitre 9, il ignorait tout des chapitres 1 à 4. D'où
 * exactement ce que l'auteur décrit — « l'IA s'embrouille », « rien n'est
 * cohérent » : elle redéfinit un concept déjà défini, contredit une position
 * prise trois chapitres plus tôt, reprend le même exemple (Mandela, Oprah,
 * J.K. Rowling apparaissaient dans plusieurs chapitres du livre réel), et
 * empiète sur le sujet du chapitre suivant.
 *
 * Un humain qui écrit un livre ne travaille jamais ainsi : il garde à portée
 * de main un document de référence — thèse, promesse, lecteur, voix,
 * vocabulaire, et surtout ce que chaque chapitre doit traiter ET NE PAS
 * traiter. C'est ce document que ce module fabrique une fois, au démarrage,
 * puis injecte EN ENTIER dans chaque prompt de chapitre.
 *
 * Le coût est négligeable : la bible fait 2 à 4 Ko, soit une fraction de
 * pourcent de la fenêtre de contexte des modèles utilisés. C'est le meilleur
 * rapport qualité/prix de toute la chaîne.
 */

import type { WorkType } from "@/lib/book/work-type";
import { WORK_TYPE_META } from "@/lib/book/work-type";
import type { BookGenre } from "@/lib/ai/book-style";

export interface BookBible {
  /** La thèse ou la ligne directrice, en une phrase. */
  thesis: string;
  /** Ce que le lecteur saura, saura faire ou aura ressenti à la fin. */
  promise: string;
  /** Le lecteur visé, décrit concrètement. */
  reader: string;
  /** La voix : personne, registre, rapport au lecteur. */
  voice: string;
  /** Termes et concepts propres au livre, à employer de façon constante. */
  glossary: string[];
  /** Exemples, figures ou cas déjà « réservés » — pour ne pas les resservir. */
  recurringExamples: string[];
  /** Ce que le livre s'interdit (sujets hors périmètre, travers à éviter). */
  outOfScope: string[];
}

export const EMPTY_BIBLE: BookBible = {
  thesis: "",
  promise: "",
  reader: "",
  voice: "",
  glossary: [],
  recurringExamples: [],
  outOfScope: [],
};

/** La bible contient-elle assez de matière pour valoir la peine d'être injectée ? */
export function isUsefulBible(bible: BookBible | null | undefined): boolean {
  if (!bible) return false;
  return !!(bible.thesis?.trim() || bible.promise?.trim() || bible.reader?.trim());
}

/**
 * Prompt qui fabrique la bible. On demande du TEXTE à sections préfixées
 * plutôt que du JSON : `generateObject` s'est révélé fragile avec la
 * combinaison de SDK utilisée ici (c'est ce qui avait fait échouer
 * generate-outline pendant des semaines), alors qu'un format à préfixes se
 * parse de façon tolérante et ne casse jamais la génération du livre.
 */
export function buildBiblePrompt(input: {
  title: string;
  subtitle?: string;
  synopsis?: string;
  audience?: string;
  tone?: string;
  category?: string;
  instructions?: string;
  outline?: string;
  workType: WorkType;
  genre: BookGenre;
}): string {
  const meta = WORK_TYPE_META[input.workType];
  return `Tu es directeur éditorial. Avant que la rédaction ne commence, tu établis la FICHE DE RÉFÉRENCE de cet ouvrage : le document que le rédacteur gardera sous les yeux pour chaque chapitre.

Ouvrage :
Forme : ${meta.label} — ${meta.hint}
Nature : ${input.genre === "fiction" ? "récit / fiction" : "non-fiction"}
Titre : ${input.title}
${input.subtitle ? `Sous-titre : ${input.subtitle}\n` : ""}Catégorie : ${input.category || "—"}
Lecteur visé : ${input.audience || "—"}
Ton souhaité : ${input.tone || "—"}
Sujet : ${input.synopsis || "—"}
${input.instructions ? `Consignes de l'auteur : ${input.instructions}\n` : ""}${input.outline ? `\nStructure prévue :\n${input.outline}\n` : ""}

Réponds EXACTEMENT dans ce format, une section par ligne, sans introduction ni commentaire :

THESE: [la ligne directrice de l'ouvrage en UNE phrase affirmative. Pas un résumé du sujet : la position que le livre défend, ou pour un récit, sa tension centrale.]
PROMESSE: [ce que le lecteur saura, saura faire ou aura vécu en refermant le livre. Une phrase concrète.]
LECTEUR: [qui il est, où il en est, ce qu'il a déjà essayé, ce qui le bloque. Deux phrases maximum.]
VOIX: [personne employée (tu/vous/il), registre, rapport au lecteur, rythme. Une phrase.]
GLOSSAIRE: [3 à 6 termes ou concepts propres à cet ouvrage, séparés par « | ». Chacun sous la forme « terme = définition courte ». Ces termes devront être employés de façon rigoureusement constante d'un chapitre à l'autre.]
EXEMPLES: [3 à 6 exemples, figures ou cas concrets que le livre pourra mobiliser, séparés par « | ». Chacun sera réservé à UN seul chapitre pour éviter les redites.]
HORS-SUJET: [3 à 5 choses que ce livre ne doit PAS faire : sujets hors périmètre, travers de style, facilités à éviter. Séparés par « | ».]`;
}

function pickLine(text: string, key: string): string {
  const re = new RegExp(`^\\s*${key}\\s*:?\\s*(.+)$`, "im");
  const m = text.match(re);
  return m ? m[1].trim().replace(/^\[|\]$/g, "").trim() : "";
}

function pickList(text: string, key: string): string[] {
  const raw = pickLine(text, key);
  if (!raw) return [];
  return raw
    .split("|")
    .map((x) => x.trim().replace(/^[-•*]\s*/, ""))
    .filter((x) => x.length > 1)
    .slice(0, 8);
}

/** Parse tolérant : une section absente donne une valeur vide, jamais d'erreur. */
export function parseBible(text: string): BookBible {
  if (!text || !text.trim()) return { ...EMPTY_BIBLE };
  return {
    thesis: pickLine(text, "THESE") || pickLine(text, "THÈSE"),
    promise: pickLine(text, "PROMESSE"),
    reader: pickLine(text, "LECTEUR"),
    voice: pickLine(text, "VOIX"),
    glossary: pickList(text, "GLOSSAIRE"),
    recurringExamples: pickList(text, "EXEMPLES"),
    outOfScope: pickList(text, "HORS-SUJET"),
  };
}

/**
 * Rend la bible sous la forme injectée dans le prompt de CHAQUE chapitre.
 * Renvoie une chaîne vide si la bible est trop pauvre pour aider — mieux vaut
 * ne rien injecter qu'un bloc de sections vides qui dilue le reste du prompt.
 */
export function renderBible(bible: BookBible | null | undefined): string {
  if (!isUsefulBible(bible)) return "";
  const b = bible as BookBible;
  const parts: string[] = ["--- FICHE DE RÉFÉRENCE DE L'OUVRAGE (à respecter dans chaque chapitre) ---"];
  if (b.thesis) parts.push(`Ligne directrice : ${b.thesis}`);
  if (b.promise) parts.push(`Promesse au lecteur : ${b.promise}`);
  if (b.reader) parts.push(`Lecteur visé : ${b.reader}`);
  if (b.voice) parts.push(`Voix et registre : ${b.voice}`);
  if (b.glossary.length) {
    parts.push(
      `Vocabulaire propre au livre (emploie ces termes EXACTEMENT, sans les redéfinir s'ils l'ont déjà été) :\n${b.glossary
        .map((g) => `  · ${g}`)
        .join("\n")}`
    );
  }
  if (b.recurringExamples.length) {
    parts.push(
      `Exemples disponibles pour l'ouvrage — n'en réutilise AUCUN qui ait déjà servi dans un chapitre précédent :\n${b.recurringExamples
        .map((e) => `  · ${e}`)
        .join("\n")}`
    );
  }
  if (b.outOfScope.length) {
    parts.push(`Ce que ce livre ne fait PAS :\n${b.outOfScope.map((o) => `  · ${o}`).join("\n")}`);
  }
  parts.push("--- FIN DE LA FICHE DE RÉFÉRENCE ---");
  return parts.join("\n");
}

/**
 * Périmètre du chapitre en cours, replacé dans la structure COMPLÈTE du livre.
 *
 * C'est le second remède aux redites : le rédacteur voit noir sur blanc ce qui
 * a déjà été traité, ce qui viendra après, et donc ce qu'il doit laisser aux
 * autres. Auparavant il ne recevait qu'un sommaire tronqué où cette frontière
 * n'apparaissait pas.
 */
export function renderChapterScope(
  headings: string[],
  currentIndex: number,
  briefs?: (string | undefined)[]
): string {
  if (!headings.length) return "";
  const lines = headings.map((h, i) => {
    const brief = briefs?.[i]?.trim();
    const marker = i < currentIndex ? "✓ déjà écrit" : i === currentIndex ? "◀ À ÉCRIRE MAINTENANT" : "· à venir";
    return `  ${i + 1}. ${h}${brief ? ` — ${brief}` : ""}   [${marker}]`;
  });
  const before = headings.slice(0, currentIndex);
  const after = headings.slice(currentIndex + 1);

  const rules: string[] = [];
  if (before.length) {
    rules.push(
      `- Les chapitres marqués « déjà écrit » sont ACQUIS : ne les résume pas, ne les recommence pas, ne redéfinis pas leurs notions. Tu peux t'y appuyer d'une phrase de rappel, pas davantage.`
    );
  }
  if (after.length) {
    rules.push(
      `- Les chapitres marqués « à venir » ne t'appartiennent PAS. N'empiète pas sur leur sujet, même brièvement : traite uniquement ce qui relève du chapitre en cours et laisse le reste à sa place.`
    );
  }

  return `--- PLAN COMPLET DU LIVRE ET PÉRIMÈTRE DE CE CHAPITRE ---
${lines.join("\n")}
${rules.join("\n")}
--- FIN DU PLAN ---`;
}
