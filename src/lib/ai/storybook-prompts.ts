/**
 * Prompts IA dédiés à la génération d'albums illustrés pour enfants (storybook).
 *
 * Innovation clé : l'utilisateur peut téléverser ses propres illustrations ou dessins.
 * Gemini Vision analyse chaque image, et ces descriptions visuelles sont ensuite injectées
 * dans la génération du plan et la rédaction page par page afin que le texte COMPLÈTE
 * parfaitement les dessins sans les paraphraser.
 */

/**
 * Options pour la génération du plan de l'album illustré.
 */
export interface StorybookPlanOptions {
  /** Titre de l'album illustré */
  title: string;
  /** Résumé général ou idée principale de l'histoire */
  synopsis?: string;
  /** Tranche d'âge ou public cible (ex: « 3-6 ans », « 6-8 ans ») */
  audience?: string;
  /** Description des personnages principaux */
  characters?: string;
  /** Nombre total de pages prévues pour l'album */
  pageCount: number;
  /**
   * Analyses visuelles des images téléversées par l'utilisateur (issues de Gemini Vision),
   * ordonnées de la première à la dernière image.
   */
  imageDescriptions?: string[];
}

/**
 * Options pour la rédaction du texte d'une page individuelle de l'album.
 */
export interface StorybookPageOptions {
  /** Titre de l'album */
  title: string;
  /** Numéro de la page en cours de rédaction (commence à 1) */
  pageNumber: number;
  /** Nombre total de pages de l'album */
  totalPages: number;
  /** Description ou trame prévue pour cette page dans le plan */
  pageOutline: string;
  /** Analyse de l'illustration associée à cette page (le cas échéant) */
  imageDescription?: string;
  /** Texte ou résumé des pages précédentes pour assurer la continuité */
  previousPages?: string;
  /** Description des personnages principaux */
  characters?: string;
}

/**
 * Contexte fourni à Gemini Vision pour analyser une illustration téléversée.
 */
export interface ImageAnalysisContext {
  /** Titre de l'album ou du projet */
  title: string;
  /** Public cible envisagé pour l'album */
  audience?: string;
  /** Index de l'image analysée (commence à 1) */
  imageIndex: number;
  /** Nombre total d'illustrations téléversées */
  totalImages: number;
}

/**
 * Persona système pour la génération de livres pour enfants (storybook).
 * Établit les règles d'or de la littérature jeunesse illustrée :
 * concision, complémentarité texte-image, simplicité du langage et musicalité.
 */
export const STORYBOOK_SYSTEM_PERSONA = `Tu es un auteur professionnel de livres pour enfants et d'albums jeunesse illustrés de renommée internationale.

Ton rôle est d'écrire des histoires tendres, drôles, captivantes et poétiques, parfaitement adaptées aux jeunes enfants et conçues pour être lues à voix haute par les parents ou les éducateurs.

RÈGLES D'OR DE RÉDACTION :
1. TEXTE COURT PAR PAGE : Rédige STRICTEMENT entre 30 et 150 mots par page. Jamais de longs pavés : l'enfant regarde l'illustration pendant que l'adulte lit.
2. LANGAGE SIMPLE ET VIVANT : Emploie un vocabulaire clair, accessible, chaleureux et imagé, parfaitement dosé pour la tranche d'âge ciblée.
3. INTERDICTION DES PHRASES COMPLEXES : N'utilise JAMAIS de mots savants, d'abstractions compliquées ou de phrases à rallonge. Privilégie des phrases courtes, rythmées et musicales.
4. COMPLÉMENTARITÉ TEXTE-IMAGE :
   - Le texte ne doit JAMAIS répéter bêtement ce que l'enfant voit déjà sur l'illustration (ne dis pas : « Voici un garçon brun qui porte un chapeau »).
   - L'image montre le visible ; le texte apporte l'invisible : les émotions secrètes, les bruits de l'environnement (« Flic, flac ! »), les pensées, les parfums et la tension dramatique.
5. COHÉRENCE ET CONSTANCE : Conserve rigoureusement les mêmes prénoms, les mêmes personnalités et les mêmes caractéristiques physiques pour chaque personnage d'une page à l'autre.
6. ARC NARRATIF COMPLET : Même sur un format court, construis une véritable progression : situation initiale attachante, petit défi ou péripétie accessible, et résolution bienveillante, douce ou joyeuse.
7. DIALOGUES NATURELS : Encadre TOUS les dialogues avec les guillemets français (« … »). Rends les échanges spontanés, expressifs et faciles à jouer à l'oral.
8. AUCUN MÉTA-DISCOURS : Ne produis aucun préambule (pas de « Voici l'histoire », ni « En tant qu'IA »). Écris directement et exclusivement le texte de l'histoire.`;

/**
 * Construit le prompt de génération du PLAN page par page d'un album jeunesse.
 *
 * Si des descriptions d'images (`imageDescriptions`) sont fournies (analysées via Gemini Vision),
 * le plan est impérativement articulé AUTOUR de ces illustrations existantes.
 * En l'absence d'images, un plan jeunesse standard cohérent est proposé.
 *
 * @param opts Paramètres du plan (titre, synopsis, public, personnages, nombre de pages, images)
 * @returns Le prompt complet en français
 */
export function buildStorybookPlanPrompt(opts: {
  title: string;
  synopsis?: string;
  audience?: string;
  characters?: string;
  pageCount: number;
  imageDescriptions?: string[];
}): string {
  const {
    title,
    synopsis,
    audience = "Enfants (3-8 ans)",
    characters,
    pageCount,
    imageDescriptions,
  } = opts;

  const hasImages = Array.isArray(imageDescriptions) && imageDescriptions.length > 0;

  let imageSection = "";
  if (hasImages) {
    const formattedList = imageDescriptions
      .map((desc, idx) => `Page ${idx + 1} (Illustration existante) :\n${desc.trim()}`)
      .join("\n\n");

    imageSection = `--- ILLUSTRATIONS FOURNIES PAR L'AUTEUR (ANALYSE GEMINI VISION) ---
L'auteur a déjà téléversé ses propres illustrations / dessins. Voici l'analyse détaillée de chaque image :

${formattedList}

--- CONSIGNE MAJEURE : PLAN ARTICULÉ AUTOUR DES IMAGES ---
- Ton plan DOIT s'articuler impérativement autour de cette séquence d'illustrations.
- Chaque page de l'histoire doit correspondre exactement à l'illustration fournie pour cette même page.
- Relie ces illustrations de façon fluide et logique pour former une histoire captivante, drôle ou émouvante qui fait sens avec les éléments visuels observés.
- N'invente pas d'éléments majeurs qui contrediraient directement ce qui est visible dans les dessins.`;
  } else {
    imageSection = `--- GÉNÉRATION DE PLAN SANS ILLUSTRATION PRÉALABLE ---
L'auteur n'a pas encore téléversé d'illustrations. Conçois un découpage narratif idéal en ${pageCount} pages, avec pour chaque page une suggestion claire d'illustration visuelle que l'auteur ou un illustrateur pourra réaliser plus tard.`;
  }

  return `Tu dois concevoir le PLAN DÉTAILLÉ (découpage page par page) pour un album illustré pour enfants.

INFORMATIONS SUR LE LIVRE :
- Titre : ${title}
- Public cible : ${audience}
- Nombre total de pages : ${pageCount}
- Personnages principaux : ${characters?.trim() || "À définir ou à déduire des visuels / synopsis"}
- Synopsis ou thème : ${synopsis?.trim() || "À imaginer de façon captivante autour du titre"}

${imageSection}

STRUCTURE ATTENDUE POUR LE PLAN :
Pour CHAQUE page (de la Page 1 à la Page ${pageCount}), indique rigoureusement :
1. **Numéro de la page et Titre évocateur** (ex: « Page 1 : Le mystère sous le grand baobab »)
2. **Action narrative** : Ce qui se passe dans l'histoire sur cette page (1 à 2 phrases).
3. **Élément visuel clé** : ${
    hasImages
      ? "L'élément de l'illustration fournie sur lequel s'appuie le texte."
      : "L'idée d'illustration recommandée pour cette page."
  }
4. **Tonalité / Émotion** : L'émotion ou le sentiment recherché (émerveillement, rire, curiosité, réconfort...).

RÈGLES IMPORTANTES :
- Assure une progression narrative fluide du début à la fin (situation de départ, péripétie/aventure, dénouement positif).
- Reste concis et structuré dans ta réponse.
- Réponds UNIQUEMENT avec le plan page par page, sans préambule ni conclusion méta.`;
}

/**
 * Construit le prompt de rédaction d'UNE PAGE individuelle de l'album illustré.
 *
 * Intègre les contraintes de concision extrême (2 à 5 phrases, 30-150 mots),
 * la complémentarité avec l'illustration (ne pas redécrire le visible),
 * et les règles strictes de continuité narrative.
 *
 * @param opts Paramètres de la page (titre, numéro, total, trame, image, antécédents, personnages)
 * @returns Le prompt complet en français
 */
export function buildStorybookPagePrompt(opts: {
  title: string;
  pageNumber: number;
  totalPages: number;
  pageOutline: string;
  imageDescription?: string;
  previousPages?: string;
  characters?: string;
}): string {
  const {
    title,
    pageNumber,
    totalPages,
    pageOutline,
    imageDescription,
    previousPages,
    characters,
  } = opts;

  // Directive de continuité selon la position de la page
  let continuityDirective = "";
  if (pageNumber === 1) {
    continuityDirective = `PREMIÈRE PAGE DU LIVRE :
- Installe l'atmosphère et présente le protagoniste de manière vivante et chaleureuse.
- Accroche immédiatement l'attention de l'enfant dès la première ligne.
- Ne fais aucun résumé préalable : entre directement dans le vif du récit.`;
  } else {
    const isLastPage = pageNumber === totalPages;
    continuityDirective = `CONTINUITÉ STRICTE (Page ${pageNumber} sur ${totalPages}) :
- Tu poursuis une histoire déjà entamée. Les pages précédentes sont fournies ci-dessous.
- RÈGLE ABSOLUE : Ne recommence JAMAIS l'histoire au début ! Ne réintroduis pas les personnages comme s'ils étaient nouveaux.
- Reprends l'action EXACTEMENT là où s'est arrêtée la page précédente.
- Conserve les mêmes prénoms, les mêmes traits d'humeur et la même dynamique.${
      isLastPage
        ? `\n- DERNIÈRE PAGE DE L'ALBUM : Apporte une fin satisfaisante, réconfortante ou joyeuse qui clôture l'aventure sur une note douce et mémorable.`
        : ""
    }`;
  }

  // Directive liée à l'illustration de la page
  let imageComplementDirective = "";
  if (imageDescription && imageDescription.trim()) {
    imageComplementDirective = `ILLUSTRATION DE CETTE PAGE (Analyse visuelle) :
« ${imageDescription.trim()} »

CONSIGNE CRUCIALE DE COMPLÉMENTARITÉ :
- Le texte DOIT COMPLÉTER l'illustration et NON la paraphraser.
- INTERDIT ABSOLU : Ne dis JAMAIS « Sur cette image… », « On voit… », « Regardez le dessin… ».
- L'enfant a l'image sous les yeux : il voit déjà les couleurs, les poses et les objets.
- Ton texte doit donner vie à ce qui ne se voit pas : les sons (« Cric, crac, boum ! »), les pensées intérieures du personnage, ses doutes, ses rires, les dialogues ou la phrase d'action qui fait avancer la scène.`;
  } else {
    imageComplementDirective = `CONSIGNE VISUELLE :
- Aucun dessin n'est encore fourni pour cette page. Rédige un texte évocateur et très visuel qui donnera envie à l'enfant d'imaginer la scène.`;
  }

  const charactersBlock = characters?.trim()
    ? `\nPERSONNAGES DE L'HISTOIRE :\n${characters.trim()}\n`
    : "";

  const previousBlock =
    previousPages && previousPages.trim() && pageNumber > 1
      ? `\nRÉSUMÉ OU TEXTE DES PAGES PRÉCÉDENTES :\n${previousPages.trim()}\n`
      : "";

  return `Rédige le texte de la PAGE ${pageNumber} sur un total de ${totalPages} pages pour l'album illustré jeunesse : « ${title} ».

TRAME PRÉVUE POUR CETTE PAGE :
${pageOutline.trim()}
${charactersBlock}${previousBlock}
${imageComplementDirective}

${continuityDirective}

CONTRAINTES FORMELLES STRICTES :
1. LONGUEUR : Entre 2 et 5 phrases au total (30 à 150 mots maximum). Court, percutant et adapté au souffle d'une lecture partagée.
2. DIALOGUES : Si un personnage parle, utilise impérativement des guillemets français (« … »).
3. STYLE : Des phrases courtes et musicales. Jamais de vocabulaire abstrait ou obscur.
4. FORMAT DE SORTIE : Écris UNIQUEMENT le texte destiné à la page du livre. N'ajoute aucun titre, aucun numéro de page, aucune remarque méta (« Voici le texte : »).`;
}

/**
 * Construit le prompt envoyé à Gemini Vision pour analyser une image ou un dessin
 * téléversé par l'utilisateur.
 *
 * L'analyse visuelle obtenue est enregistrée pour être ensuite réutilisée
 * dans la génération du plan narratif et la rédaction de chaque page.
 *
 * @param context Métadonnées de l'image (titre de l'album, public cible, position de l'image)
 * @returns Le prompt en français destiné au modèle de vision
 */
export function buildImageAnalysisPrompt(context: {
  title: string;
  audience?: string;
  imageIndex: number;
  totalImages: number;
}): string {
  const {
    title,
    audience = "Jeunes enfants (3-8 ans)",
    imageIndex,
    totalImages,
  } = context;

  return `Tu es un spécialiste de l'analyse d'illustrations pour la littérature jeunesse.

Cette image est l'illustration n°${imageIndex} sur un total de ${totalImages} pour un album pour enfants intitulé « ${title} » (Public cible : ${audience}).

Analyse attentivement cette image et décris avec précision ses composantes pour qu'un auteur puisse écrire l'histoire qui l'accompagne :

1. **Sujets principaux et personnages** : Quels personnages, animaux ou êtres vivants apparaissent ? Décris leur apparence, leurs vêtements, leur posture, l'expression de leur visage et l'émotion visible (joie, surprise, peur, malice...).
2. **Action et dynamique** : Que sont-ils en train de faire ? Quel geste, mouvement ou événement précis se déroule sur l'image ?
3. **Décor et environnement** : Où la scène se situe-t-elle (chambre, forêt, savane, école, cuisine, extérieur, intérieur...) ? Quels sont les éléments notables du décor ou de l'arrière-plan ?
4. **Couleurs et ambiance visuelle** : Quelles sont les couleurs dominantes ? Quelle est la luminosité et l'atmosphère générale (douce, chaleureuse, nocturne, mystérieuse, festive...) ?
5. **Détails narratifs remarquables** : Y a-t-il des objets insolites, des petits animaux cachés, des détails curieux qui pourraient inspirer un dialogue ou une péripétie dans l'histoire ?

DIRECTIVES DE RÉPONSE :
- Rédige une analyse synthétique, claire et évocatrice en français (150 à 250 mots environ).
- Sois objectif et précis sur ce qui est réellement visible dans le dessin.
- Cette analyse sera directement transmise à l'IA chargée d'écrire le texte de l'album.`;
}
