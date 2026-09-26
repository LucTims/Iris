/**
 * CHARTE D'ÉCRITURE — ce qui sépare un texte d'auteur d'un texte « d'IA ».
 *
 * CONSTAT sur des livres réels générés par Iris : le texte était correct mais
 * interchangeable. On y retrouvait, d'un livre à l'autre, les mêmes ouvertures
 * (« Imaginez un instant un monde où… »), les mêmes métaphores usées (« un
 * phare qui illumine votre chemin vers la réussite »), les mêmes conclusions
 * moralisatrices, et aucune émotion : des idées énoncées, jamais vécues.
 *
 * Deux causes :
 *   1. le prompt demandait un « auteur de best-sellers » sans dire ce qu'est
 *      une bonne page. Le modèle retombe alors sur sa moyenne statistique,
 *      c'est-à-dire sur le générique ;
 *   2. rien ne vérifiait le résultat : un chapitre truffé de formules toutes
 *      faites était enregistré tel quel.
 *
 * Ce module fournit la CHARTE injectée dans chaque prompt de rédaction, la
 * direction ÉMOTIONNELLE selon le ton choisi, et un DÉTECTEUR déterministe de
 * clichés utilisé par l'audit du chapitre pour déclencher une reprise.
 *
 * Règle de maintenance : aucun chiffre d'exemple dans les textes destinés au
 * modèle (voir factuality.ts — un exemple chiffré est recopié).
 */

import type { BookGenre } from "@/lib/ai/book-style";
import type { WorkType } from "@/lib/book/work-type";

/**
 * Formules usées, typiques d'un texte produit par IA en français. Chaque
 * entrée : un motif (insensible à la casse et aux accents) et le libellé
 * montré au modèle quand il doit réécrire.
 */
export const CLICHE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /imaginez(?:-vous)? un (?:instant|monde|moment)/i, label: "« Imaginez un instant… »" },
  { re: /dans (?:un|ce) monde (?:en constante [ée]volution|en perp[ée]tuel mouvement|o[uù] tout va (?:tr[eè]s )?vite|moderne)/i, label: "« Dans un monde en constante évolution »" },
  { re: /(?:de nos jours|à l'[èe]re (?:du num[ée]rique|moderne))/i, label: "« De nos jours / À l'ère du numérique »" },
  { re: /il est (?:important|essentiel|crucial|primordial) de (?:noter|souligner|comprendre|rappeler)/i, label: "« Il est important de noter que… »" },
  { re: /n'est pas (?:seulement|simplement|uniquement) une? [^.]{1,60}?,? c'est/i, label: "« Ce n'est pas seulement X, c'est Y »" },
  { re: /(?:un|comme un|tel un) phare/i, label: "la métaphore du phare" },
  { re: /(?:une|comme une|telle une) boussole/i, label: "la métaphore de la boussole" },
  { re: /(?:tapisserie|mosa[iï]que) (?:de|d')/i, label: "« une tapisserie / mosaïque de… »" },
  { re: /(?:le|ce|un) (?:v[ée]ritable )?voyage (?:vers|int[ée]rieur|de transformation)/i, label: "« le voyage vers… »" },
  { re: /(?:la|une|les) cl[ée]s? (?:du|de la|de votre) (?:succ[eè]s|r[ée]ussite|bonheur)/i, label: "« la clé du succès »" },
  { re: /(?:plongeons|embarquons|explorons ensemble|d[ée]couvrons ensemble)/i, label: "« Plongeons / Explorons ensemble »" },
  { re: /au c[oœ]ur (?:de|du|des) /i, label: "« au cœur de »" },
  { re: /que vous soyez [^.]{1,80}? ou /i, label: "« Que vous soyez X ou Y »" },
  { re: /(?:en conclusion|en d[ée]finitive|en somme|pour conclure|en r[ée]sum[ée])\s*,/i, label: "une conclusion scolaire (« En conclusion, … »)" },
  { re: /(?:libérer|d[ée]bloquer|r[ée]v[ée]ler) (?:tout )?(?:votre|son|leur) (?:plein )?potentiel/i, label: "« libérer votre plein potentiel »" },
  { re: /(?:changer|transformer) (?:la|votre) donne/i, label: "« changer la donne »" },
  { re: /(?:sortir|sortez) de (?:votre|sa|leur) zone de confort/i, label: "« sortir de sa zone de confort »" },
  { re: /(?:un|une) v[ée]ritable (?:levier|atout|tremplin|mine d'or|r[ée]volution)/i, label: "« un véritable levier / atout »" },
  { re: /(?:le|un) monde (?:des possibles|de possibilit[ée]s)/i, label: "« un monde de possibilités »" },
  { re: /(?:n'oubliez jamais|rappelez-vous toujours) que/i, label: "une morale adressée au lecteur (« N'oubliez jamais que… »)" },
  { re: /(?:chaque|chacun de vos) (?:pas|petit pas) (?:compte|vous rapproche)/i, label: "« chaque petit pas compte »" },
  { re: /(?:le ciel est la limite|rien n'est impossible)/i, label: "« rien n'est impossible »" },
  { re: /(?:sans plus attendre|il est temps de passer à l'action)/i, label: "« Sans plus attendre »" },
];

export interface ClicheHit {
  label: string;
  excerpt: string;
}

/** Relève les formules usées présentes dans un texte (HTML accepté). */
export function findCliches(html: string): ClicheHit[] {
  const text = (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const hits: ClicheHit[] = [];
  for (const { re, label } of CLICHE_PATTERNS) {
    const global = new RegExp(re.source, "gi");
    for (const m of text.matchAll(global)) {
      const start = Math.max(0, (m.index ?? 0) - 40);
      hits.push({ label, excerpt: text.slice(start, (m.index ?? 0) + m[0].length + 40).trim() });
    }
  }
  return hits;
}

/** Au-delà de ce nombre de formules usées, le chapitre est repris. */
export const CLICHE_REPAIR_THRESHOLD = 3;

/**
 * Direction émotionnelle selon le ton choisi. Le ton n'est plus un simple
 * adjectif : il dit au modèle QUOI faire ressentir et COMMENT.
 */
export function emotionDirective(tone: string | undefined, genre: BookGenre): string {
  const t = (tone || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let direction: string;
  if (/inspir|motiv/.test(t)) {
    direction =
      "Fais ressentir l'élan, pas l'injonction. L'inspiration naît d'un parcours raconté (un doute, un échec, un déclic, un premier pas) et jamais d'exhortations. Pas de « vous pouvez le faire » : montre quelqu'un qui l'a fait, avec ses peurs.";
  } else if (/humour|decale/.test(t)) {
    direction =
      "L'humour vient de l'observation juste et du décalage, pas des blagues plaquées. Autodérision, situations cocasses vécues, chutes inattendues en fin de paragraphe. Garde un fond sincère sous le sourire.";
  } else if (/epique|descriptif/.test(t)) {
    direction =
      "Donne de l'ampleur par les images et le rythme : phrases longues qui déploient un paysage ou un enjeu, puis phrases brèves qui frappent. Convoque les sens (lumière, bruit, odeur, matière).";
  } else if (/familier|accessible/.test(t)) {
    direction =
      "Parle comme une personne qui connaît bien le sujet et s'assoit à côté du lecteur : chaleur, simplicité, exemples tirés de la vie quotidienne, aucune condescendance. Des phrases qu'on pourrait dire à voix haute.";
  } else if (/serieux|didactique|pedagog/.test(t)) {
    direction =
      "La rigueur n'exclut pas l'humain : chaque notion expliquée s'ancre dans une situation où elle a compté pour quelqu'un. Clarté d'abord, mais avec une voix — un avis, une nuance, une conviction assumée.";
  } else {
    direction =
      "Fais ressentir quelque chose à chaque section : une tension, une surprise, une reconnaissance (« c'est exactement moi »). Un texte qui n'émeut pas n'est pas relu.";
  }
  const fictionNote =
    genre === "fiction"
      ? " En récit, l'émotion passe par les gestes, les silences, les dialogues et le sous-texte — jamais par le nom de l'émotion (« il était triste »)."
      : "";
  return `DIRECTION ÉMOTIONNELLE (ton : ${tone || "non précisé"}) : ${direction}${fictionNote}`;
}

/**
 * La charte d'écriture injectée dans chaque prompt de rédaction.
 * Le texte parle au modèle comme un éditeur exigeant parle à un auteur.
 */
export function craftCharter(genre: BookGenre, workType: WorkType = "livre"): string {
  const banned = CLICHE_PATTERNS.map((c) => c.label).join(", ");
  const common = `CHARTE D'ÉCRITURE — ce que ton éditeur exige de chaque page :
1. SPÉCIFIQUE, JAMAIS GÉNÉRIQUE. Chaque paragraphe doit contenir au moins un élément que seul CE livre pouvait écrire : un prénom, un lieu, un objet, un moment précis, une scène, un détail observé. Si une phrase pourrait figurer telle quelle dans n'importe quel autre livre du rayon, réécris-la ou supprime-la.
2. ANCRÉ DANS LE MONDE DU LECTEUR. Les exemples, les noms, les lieux, les métiers et les situations viennent de l'univers du lecteur visé et du sujet du livre — pas de figures mondialement ressassées ni de décors passe-partout.
3. RYTHME VIVANT. Alterne phrases courtes et phrases amples. Varie les débuts de phrase et de paragraphe. Pas de séries de trois adjectifs ni d'énumérations en trois temps systématiques.
4. VERBES PRÉCIS, ADJECTIFS RARES. Préfère le verbe exact à l'adverbe, le concret à l'abstrait. Chaque adjectif doit mériter sa place.
5. OUVERTURE QUI SAISIT. Ouvre le chapitre sur une scène, un fait surprenant, une tension ou une phrase qui engage — jamais sur une définition, une question rhétorique en rafale ou une généralité.
6. FIN QUI RESTE. Termine sur une image, une bascule ou une ouverture vers la suite — jamais sur un résumé de ce qui vient d'être dit ni sur une morale adressée au lecteur.
7. UNE VOIX, PAS UN PROSPECTUS. Assume des opinions, des nuances, des réserves. Aucune formule de remplissage, aucune transition creuse (« Par ailleurs, il convient de… »).
8. MÉTAPHORES NEUVES OU AUCUNE. Une image doit être tirée du monde du livre ; sinon, écris sans image.
9. FORMULES INTERDITES (elles signent un texte écrit par une machine) : ${banned}.`;

  if (genre === "fiction") {
    return `${common}
10. MONTRE, NE RACONTE PAS. Des scènes, pas des résumés. Les personnages ont un corps, une voix, des contradictions ; ils parlent chacun à leur manière.
11. SOUS-TEXTE. Ce qui compte n'est pas toujours dit. Laisse au lecteur le plaisir de comprendre.`;
  }
  if (workType === "guide" || workType === "ebook") {
    return `${common}
10. UTILE À CHAQUE LIGNE. Chaque conseil est assez concret pour être appliqué dès demain : qui, quoi, comment, avec quel exemple réel du quotidien du lecteur.
11. HUMAIN AUSSI. Même un guide raconte : une situation vécue par une personne du public visé ouvre ou illustre chaque méthode.`;
  }
  return `${common}
10. RACONTE POUR CONVAINCRE. Les idées s'incarnent dans des situations vécues, des personnes, des scènes — un livre se lit parce qu'on y rencontre des gens.
11. UNE PROGRESSION. Chaque chapitre fait bouger le lecteur d'un point à un autre : il en sort en pensant ou en ressentant quelque chose de nouveau.`;
}

/** Consigne de reprise quand trop de formules usées ont été détectées. */
export function clicheRepairInstruction(hits: ClicheHit[]): string {
  const listed = hits
    .slice(0, 8)
    .map((h) => `  · ${h.label} — « …${h.excerpt}… »`)
    .join("\n");
  return `Le texte contient des formules toutes faites qui le rendent générique. Réécris CHAQUE phrase concernée avec une formulation concrète, propre à ce livre (détail précis, exemple vécu, image tirée de son univers) — sans en ajouter d'autres :\n${listed}`;
}
