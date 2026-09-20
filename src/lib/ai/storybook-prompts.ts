/**
 * PROMPTS EXPERTS — ALBUM JEUNESSE ILLUSTRÉ (blueprint « storybook »).
 *
 * POURQUOI UN MODULE DÉDIÉ. Le prompt système de chapitre s'ouvre sur
 * « Tu es un auteur professionnel de best-sellers […] rédige un chapitre
 * COMPLET […] vise au moins 800 à 1500 mots ». Pour un conte illustré, chacune
 * de ces trois consignes est FAUSSE et travaille contre les règles de forme :
 * une page d'album fait 40 à 80 mots, et l'objectif n'est pas la complétude
 * mais le rythme de lecture à voix haute. Deux consignes contradictoires dans
 * le même prompt, c'est le modèle qui arbitre — et il tranche généralement en
 * faveur de la plus longue et la plus insistante, donc du roman.
 *
 * Ce module remplace donc le persona ET les règles de longueur, au lieu de les
 * empiler. Il concentre par ailleurs tout le savoir-faire « album jeunesse »
 * en un seul endroit, pour qu'il s'affine sans toucher au reste du moteur.
 */

/** Tranche d'âge visée — elle pilote le vocabulaire et la longueur des pages. */
export type StorybookAge = "3-5" | "6-8" | "9-12";

interface AgeProfile {
  label: string;
  wordsPerPage: string;
  sentence: string;
  vocabulary: string;
}

const AGE_PROFILES: Record<StorybookAge, AgeProfile> = {
  "3-5": {
    label: "3 à 5 ans (lu par un adulte)",
    wordsPerPage: "25 à 50 mots",
    sentence: "Une à deux phrases très courtes par page, de 6 à 10 mots chacune.",
    vocabulary:
      "Vocabulaire du quotidien uniquement. Présent de narration. Aucune subordonnée, aucun mot abstrait.",
  },
  "6-8": {
    label: "6 à 8 ans (premiers lecteurs)",
    wordsPerPage: "40 à 80 mots",
    sentence: "Deux à quatre phrases par page, de 8 à 14 mots chacune.",
    vocabulary:
      "Vocabulaire concret, avec deux ou trois mots plus rares par livre, toujours éclairés par le contexte. Passé composé ou présent, jamais de passé simple.",
  },
  "9-12": {
    label: "9 à 12 ans (lecteurs autonomes)",
    wordsPerPage: "80 à 140 mots",
    sentence: "Quatre à sept phrases par page, avec des rythmes variés.",
    vocabulary:
      "Vocabulaire riche assumé, images et comparaisons bienvenues. L'imparfait et le passé simple sont permis.",
  },
};

/** Déduit la tranche d'âge depuis le public saisi par l'auteur. */
export function resolveStorybookAge(audience?: string | null): StorybookAge {
  const hay = (audience || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  // On cherche d'abord un âge explicite : « 4 ans », « 7-9 ans », « dès 3 ans ».
  const numbers = hay.match(/\d+/g);
  if (numbers) {
    const youngest = Math.min(...numbers.map(Number).filter((n) => n > 0 && n < 18));
    if (Number.isFinite(youngest)) {
      if (youngest <= 5) return "3-5";
      if (youngest <= 8) return "6-8";
      return "9-12";
    }
  }

  if (/maternelle|tout-petit|tout petit|bebe|creche/.test(hay)) return "3-5";
  if (/college|preado|pre-ado|10 ans|11 ans|12 ans/.test(hay)) return "9-12";
  return "6-8";
}

/**
 * Persona de rédaction. Remplace « auteur de best-sellers » : écrire un album
 * est un métier distinct, où l'économie de mots prime sur l'ampleur.
 */
export function storybookPersona(age: StorybookAge): string {
  const profile = AGE_PROFILES[age];
  return `Tu es un auteur-illustrateur d'albums jeunesse reconnu, publié chez des éditeurs exigeants. Tu écris pour des enfants de ${profile.label}.

Ton métier n'est PAS d'écrire beaucoup, c'est d'écrire JUSTE. Dans un album, l'image raconte et le texte accompagne : tout ce que l'illustration montre déjà n'a pas à être décrit. Un album réussi se relit vingt fois sans lasser l'adulte qui le lit à voix haute.`;
}

/** Règles de forme d'une page d'album, adaptées à la tranche d'âge. */
export function storybookPageRules(age: StorybookAge): string {
  const profile = AGE_PROFILES[age];
  return `RÈGLES DE LA PAGE D'ALBUM (contraintes absolues, elles priment sur toute consigne de longueur donnée ailleurs) :
- ${profile.wordsPerPage} PAR PAGE. Jamais davantage. Un texte trop long ne tient pas sous l'illustration et casse la mise en page.
- ${profile.sentence}
- ${profile.vocabulary}
- Une page = une image + un moment de l'histoire. Ne jamais accumuler deux scènes sur la même page.
- Ne DÉCRIS PAS l'image : elle est sous les yeux de l'enfant. Raconte ce qu'elle ne montre pas — ce qu'on ressent, ce qu'on entend, ce qui va arriver.
- Termine la plupart des pages sur une petite tension qui donne envie de tourner : une question, un bruit, une apparition.
- Les refrains et les formules qui reviennent (« Et alors… », « Mais soudain… ») font le charme de l'album : utilises-en un, et reprends-le.
- Lis mentalement chaque page À VOIX HAUTE : si une phrase trébuche, réécris-la.

STRUCTURE HTML EXIGÉE, une page par bloc, sans rien autour :
<div class="story-page"><img src="URL_EXACTE" alt="courte description"/><p>Le texte de la page.</p></div>

INTERDIT dans un album : encadré, tableau, liste à puces, sous-titre <h2>, note de bas de page, chiffre-clé, citation détachée.`;
}

/**
 * Bloc décrivant les images de l'auteur à partir des analyses mises en cache
 * au moment de l'import (colonne `project_assets.ai_analysis`).
 *
 * Travailler sur ces descriptions plutôt que de renvoyer les images à chaque
 * génération évite de re-téléverser plusieurs mégaoctets à chaque essai, rend
 * le plan reproductible, et permet d'utiliser un modèle non multimodal pour la
 * rédaction si l'auteur en choisit un.
 */
export function renderAssetAnalyses(
  assets: Array<{ file_url: string; ai_analysis?: string | null }>
): string {
  if (assets.length === 0) return "";

  const lines = assets
    .map((asset, index) => {
      const description = (asset.ai_analysis || "").trim() || "(analyse indisponible — appuie-toi sur le contexte)";
      return `IMAGE ${index + 1}
URL : ${asset.file_url}
Ce que l'on y voit : ${description}`;
    })
    .join("\n\n");

  return `\n\n--- LES ${assets.length} IMAGES DE L'AUTEUR, DANS L'ORDRE DU LIVRE ---
${lines}
--- FIN DES IMAGES ---`;
}

/**
 * Prompt de PLAN : découper l'histoire en chapitres à partir des images.
 * L'ordre des images est la chronologie du conte — on ne le réarrange pas.
 */
export function buildStorybookPlanPrompt(opts: {
  title: string;
  synopsis?: string;
  audience?: string;
  tone?: string;
  instructions?: string;
  assets: Array<{ file_url: string; ai_analysis?: string | null }>;
}): string {
  const age = resolveStorybookAge(opts.audience);
  const profile = AGE_PROFILES[age];
  const imageCount = opts.assets.length;

  return `${storybookPersona(age)}

Tu prépares le SOMMAIRE d'un album illustré, pas son texte.

Album :
Titre : ${opts.title}
Intention de l'auteur : ${opts.synopsis || "à déduire des images"}
Lecteurs : ${profile.label}
Ton souhaité : ${opts.tone || "chaleureux et malicieux"}
${opts.instructions ? `Consignes de l'auteur (priorité maximale) : ${opts.instructions}\n` : ""}${renderAssetAnalyses(opts.assets)}

TA MISSION :
1. Regarde l'enchaînement des ${imageCount} images. Elles sont dans l'ordre du livre : l'image 1 ouvre l'histoire, la dernière la referme.
2. Déduis-en UNE histoire cohérente, avec un protagoniste nommé, un désir, un obstacle et une résolution. Même un album de huit pages raconte un arc complet.
3. Découpe cette histoire en ${imageCount <= 6 ? "3" : imageCount <= 12 ? "4" : "5"} chapitres au maximum. Chaque chapitre regroupe plusieurs images consécutives — JAMAIS une image dans deux chapitres, JAMAIS d'image oubliée.
4. Donne à chaque chapitre un titre court et évocateur, formulé comme un moment vécu (« Le départ au petit matin »), jamais comme une rubrique (« Partie 1 : introduction »).

FORMAT DE RÉPONSE — uniquement du HTML, en commençant directement par la balise <h1> :
<h1>Sommaire</h1>
<ul>
<li><strong>Le titre du chapitre</strong> — En une ou deux phrases, ce que vit le personnage dans ce chapitre, et quelles images (numéros) il couvre.</li>
</ul>

N'écris AUCUN texte d'album ici, aucun paragraphe de contenu. Ne numérote pas toi-même les chapitres. Pas de Markdown, pas de salutation, pas de commentaire final.`;
}

/**
 * Bloc à injecter dans le prompt SYSTÈME de rédaction d'un chapitre d'album.
 * Il porte le persona, les règles de page et les images du chapitre.
 */
export function buildStorybookChapterPrompt(opts: {
  audience?: string;
  assets: Array<{ file_url: string; ai_analysis?: string | null }>;
}): string {
  const age = resolveStorybookAge(opts.audience);
  const pageCount = opts.assets.length;

  return `${storybookPersona(age)}

${storybookPageRules(age)}
${renderAssetAnalyses(opts.assets)}

POUR CE CHAPITRE : écris EXACTEMENT ${pageCount} bloc${pageCount > 1 ? "s" : ""} <div class="story-page">, un par image, dans l'ordre donné. Reprends les URL telles quelles, sans les modifier ni en inventer.
Le personnage garde le même nom, la même apparence et le même caractère d'un chapitre à l'autre : c'est ce qui fait tenir l'album.`;
}

/** Vrai si ce blueprint doit passer par les prompts d'album. */
export function isStorybookBlueprint(blueprintId?: string | null): boolean {
  return blueprintId === "storybook";
}
