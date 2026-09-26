/**
 * Style éditorial partagé par TOUS les modes de génération de livre
 * (generate-plan, generate-outline, generate-chapter, generate-book/book-job,
 * rewrite-chapter). Source unique de vérité pour :
 *   - la détection du genre (fiction vs non-fiction) à partir de la catégorie ;
 *   - les règles de mise en forme HTML autorisées selon le genre ;
 *   - la directive de CONTINUITÉ (empêche un chapitre de recommencer l'histoire) ;
 *   - l'activation ou non de la recherche web (jamais en fiction).
 *
 * Motivation : dans un roman, les encadrés « INFO », les statistiques sourcées
 * et les « [Source: …] » injectés par la recherche web trahissent
 * immédiatement une génération par IA et cassent l'immersion. Ces éléments
 * n'ont de sens que dans un ouvrage pratique / non-fiction. Ce module rend le
 * comportement cohérent quel que soit le mode utilisé pour écrire le livre.
 */

import type { WorkType } from "@/lib/book/work-type";
import { workTypeWritingRules } from "@/lib/book/work-type";
import { factualityRules, keyFigureRule } from "@/lib/ai/factuality";
import type { BookBible } from "@/lib/book/book-bible";
import { renderBible, renderChapterScope } from "@/lib/book/book-bible";
import { buildStorybookChapterPrompt } from "@/lib/ai/storybook-prompts";
import { craftCharter, emotionDirective } from "@/lib/ai/writing-craft";
import { defaultEnrichment, enrichmentRules, type EnrichmentLevel } from "@/lib/book/enrichment";
import { defaultTypographyId, getTypographyPreset } from "@/lib/book/typography";

export type BookGenre = "fiction" | "nonfiction";

/**
 * Catégories traitées comme de la FICTION ou de la narration continue (prose,
 * pas d'encadrés, pas de sources) — inclut la biographie / les mémoires, qui
 * se rédigent comme un récit.
 */
const FICTION_KEYWORDS = [
  "roman",
  "nouvelle",
  "fiction",
  "récit",
  "recit",
  "conte",
  "fantasy",
  "fantastique",
  "science-fiction",
  "science fiction",
  "sci-fi",
  "sf",
  "policier",
  "polar",
  "thriller",
  "suspense",
  "romance",
  "sentimental",
  "aventure",
  "jeunesse",
  "enfant",
  "young adult",
  "ya",
  "dystopie",
  "horreur",
  "drame",
  "poésie",
  "poesie",
  "nouvelle érotique",
  "biographie",
  "mémoire",
  "memoire",
  "mémoires",
  "autobiographie",
  "témoignage",
  "temoignage",
];

/**
 * Détecte le genre à partir de la catégorie (et, en repli, du ton). Par
 * défaut : non-fiction — c'est le mode le plus « riche » (encadrés, tableaux),
 * et un faux positif fiction sur un vrai guide priverait l'auteur de ces
 * éléments, alors que l'inverse (guide traité en fiction) est plus visible et
 * plus facilement signalé par l'utilisateur.
 */
export function detectGenre(category?: string | null, tone?: string | null): BookGenre {
  const haystack = `${category || ""} ${tone || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // retire les accents pour une comparaison robuste

  for (const kw of FICTION_KEYWORDS) {
    const normalized = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (haystack.includes(normalized)) return "fiction";
  }
  return "nonfiction";
}

/** La recherche web (grounding) n'a de sens qu'en non-fiction. */
export function shouldGroundWithWebSearch(genre: BookGenre, requested: boolean | undefined): boolean {
  if (genre === "fiction") return false;
  return requested !== false;
}

/**
 * Règles de mise en forme HTML communes à la STRUCTURE d'un chapitre
 * (saut de page + titre), identiques quel que soit le genre.
 */
export function chapterStructureRules(chapterHeading: string): string {
  return `- COMMENCE toujours ton texte par la balise <hr data-page-break>.
- Juste après, écris le titre du chapitre en <h1>, EXACTEMENT ceci et rien d'autre :
  <hr data-page-break><h1>${chapterHeading}</h1>
- Ce titre est déjà numéroté et définitif. Ne le renumérote pas, ne le reformule pas, ne le dédouble pas, et n'écris AUCUN second <h1> dans le chapitre (les sous-parties sont en <h2>).
- N'ajoute AUCUN préambule (pas de « Voici le chapitre : » ni de « Bien sûr… »).
- N'utilise JAMAIS de Markdown : ni #, ni ##, ni **gras**, ni tiret de liste, ni bloc \`\`\`. Uniquement du HTML valide.
- Si tu veux une lettrine, écris le paragraphe ENTIER dans la balise : <p class="drop-cap">Le monde dans lequel…</p>. Ne referme jamais la balise après la seule initiale.
- Un encadré (<div class="callout">, <div class="key-figure">, <div class="pull-quote">) est un BLOC autonome : place-le entre deux paragraphes, jamais au milieu d'une phrase.`;
}

/**
 * Règles de mise en forme selon le genre et le niveau de mise en forme choisi
 * (voir enrichment.ts). En fiction : PROSE — aucun encadré, aucune
 * statistique, aucune source. En non-fiction : structure claire, et seulement
 * les éléments mis en valeur que le niveau autorise.
 */
export function bodyFormattingRules(
  genre: BookGenre,
  workType: WorkType = "livre",
  searchContext?: string | null,
  enrichment?: EnrichmentLevel
): string {
  // La FORME (livre / guide / ebook) décide de la structure ; le NIVEAU de
  // mise en forme décide des encadrés. Sans cette séparation, un livre de
  // développement personnel héritait des encadrés du guide pratique.
  const formRules = workTypeWritingRules(genre === "fiction" ? "livre" : workType, genre);
  const level = enrichment ?? defaultEnrichment(genre, workType);

  if (genre === "fiction") {
    return `Style de RÉCIT (fiction / narration) — le texte doit se lire comme un vrai roman publié :
- Rédige en prose immersive avec des balises <p>. Titres de section <h2> uniquement si le chapitre en a réellement besoin (rare en fiction).
- Pour un dialogue, utilise des paragraphes <p> avec tirets cadratins (« — ») ou guillemets français (« … »).
- Pour l'ouverture du chapitre, tu PEUX utiliser une lettrine sur le premier paragraphe : <p class="drop-cap">…</p> (1 seule fois, au tout début).
- INTERDIT ABSOLU en fiction : les encadrés <div class="callout">, les <div class="key-figure">, les listes à puces d'analyse, les tableaux de données, et TOUTE citation de source du type « [Source: …] ». On ne commente jamais sa propre histoire et on ne cite jamais de statistiques dans un roman.

${enrichmentRules(level === "riche" ? "sobre" : level, genre)}

${formRules}`;
  }
  const tables =
    level === "riche"
      ? `- Comparaison de critères NON chiffrés (avantages/inconvénients, cas d'usage) : un tableau HTML (<table>, <thead>, <tbody>, <tr>, <th>, <td>) est possible. Ne fabrique jamais un tableau de données chiffrées.`
      : `- Pas de tableau : explique en prose.`;
  return `Style d'OUVRAGE NON ROMANESQUE :
- Paragraphes <p> construits, sous-titres <h2>/<h3> formulés comme des idées (pas comme des rubriques de manuel), listes <ul>/<ol> seulement quand la forme de l'ouvrage le justifie.
${tables}
${level === "aucune" ? "" : keyFigureRule(searchContext)}
- Lettrine possible en ouverture : <p class="drop-cap">…</p> (1 max).

${enrichmentRules(level, genre)}

${formRules}

${factualityRules(searchContext)}`;
}

/**
 * Directive de CONTINUITÉ — le point le plus important pour un rendu
 * professionnel. Empêche le symptôme observé où le chapitre 3 recommençait
 * l'histoire au tout début (retour à l'orphelinat déjà quitté au chapitre 2).
 */
export function continuityDirective(
  genre: BookGenre,
  chapterHeading: string | number,
  hasPrevious: boolean
): string {
  if (!hasPrevious) {
    return genre === "fiction"
      ? `Ceci est le PREMIER chapitre : installe le décor, les personnages et l'accroche, mais laisse des fils narratifs ouverts pour la suite.`
      : `Ceci est le PREMIER chapitre : pose le cadre et la promesse de l'ouvrage.`;
  }
  const headingLabel =
    typeof chapterHeading === "number" || /^\d+$/.test(String(chapterHeading))
      ? `Chapitre ${chapterHeading}`
      : chapterHeading;
  const common = `Tu écris « ${headingLabel} », au sein d'un livre CONTINU. Le lecteur a DÉJÀ lu tout ce qui précède (voir le plan et les résumés ci-dessus).`;
  if (genre === "fiction") {
    return `${common}
RÈGLE ABSOLUE DE CONTINUITÉ :
- Ne recommence JAMAIS l'histoire au début. Ne ré-introduis PAS le décor initial, la situation de départ ni les personnages comme s'ils étaient nouveaux.
- Reprends l'action EXACTEMENT là où le chapitre précédent s'est arrêté (même lieu, même moment ou juste après, mêmes acquis).
- Respecte scrupuleusement les faits déjà établis : ce qui est arrivé est arrivé (un personnage qui a fui un lieu n'y est plus ; un objet trouvé reste acquis).
- Garde le même temps de narration et le même point de vue que les chapitres précédents.
- Fais progresser l'intrigue vers la suite : ce chapitre doit apporter du nouveau, pas répéter ce qui précède.`;
  }
  return `${common}
- Ne répète pas ce qui a déjà été expliqué dans les chapitres précédents ; appuie-toi dessus et fais avancer le propos.
- Assure une transition logique avec le chapitre précédent et garde une terminologie cohérente.`;
}

/**
 * Construit le system prompt d'écriture d'UN chapitre, partagé par
 * generate-chapter (chapitre seul) et book-job (livre complet), pour garantir
 * un comportement identique quel que soit le mode. `previousSummary` est un
 * texte déjà formaté (résumés des chapitres précédents) ou vide.
 */
export function buildChapterSystemPrompt(opts: {
  genre: BookGenre;
  title: string;
  synopsis?: string;
  tone?: string;
  characters?: string;
  bookOutline?: string;
  chapterBrief?: string;
  instructions?: string;
  chapterNumber: number | string;
  chapterTitle: string;
  /**
   * Titre canonique DÉFINITIF du chapitre, calculé par
   * `assignChapterLabels` (ex. « Chapitre 1 : Forger une Résilience »).
   * Quand il est fourni, c'est lui — et lui seul — qui sert de <h1>. Sans lui,
   * on retombe sur l'ancienne composition numéro + titre.
   */
  chapterHeading?: string;
  workType?: WorkType;
  /** Fiche de référence de l'ouvrage, injectée en entier (voir book-bible). */
  bible?: BookBible | null;
  /** Titres de TOUS les chapitres, dans l'ordre, pour délimiter le périmètre. */
  allHeadings?: string[];
  /** Aperçus correspondants, alignés sur `allHeadings`. */
  allBriefs?: (string | undefined)[];
  /** Index 0-based du chapitre en cours dans `allHeadings`. */
  chapterIndex?: number;
  previousSummary?: string;
  searchContext?: string;
  wordsTarget?: number;
  /**
   * Visuels de CE chapitre, avec leur description mise en cache à l'import
   * (blueprint Storybook). Leur présence bascule le prompt sur le persona
   * « album jeunesse » : voir la note dans le corps de la fonction.
   */
  storybookAssets?: Array<{ file_url: string; ai_analysis?: string | null }>;
  /** Public visé — pilote la tranche d'âge de l'album. */
  audience?: string;
  /** Niveau de mise en forme choisi par l'auteur (défaut : selon le type d'ouvrage). */
  enrichment?: EnrichmentLevel;
  /**
   * Analyse du style d'écriture de l'AUTEUR (textes qu'il a fournis) : la
   * plume à reproduire. Priorité sur toute autre consigne de style.
   */
  authorStyle?: string;
  /** Notes tirées d'un document de référence (connaissances, idées). */
  referenceNotes?: string;
}): string {
  const {
    genre,
    title,
    synopsis,
    tone,
    characters,
    bookOutline,
    chapterBrief,
    instructions,
    chapterNumber,
    chapterTitle,
    chapterHeading,
    workType = "livre",
    bible,
    allHeadings,
    allBriefs,
    chapterIndex,
    previousSummary,
    searchContext,
    wordsTarget,
    storybookAssets,
    audience,
    enrichment,
    authorStyle,
    referenceNotes,
  } = opts;

  // Titre définitif : celui calculé en amont, sinon composition de repli.
  const heading = chapterHeading || `Chapitre ${chapterNumber} : ${chapterTitle}`;

  // ALBUM ILLUSTRÉ — on REMPLACE le prompt, on ne l'enrichit pas.
  //
  // Le prompt générique ci-dessous s'ouvre sur « auteur professionnel de
  // best-sellers », demande un chapitre « COMPLET » et fixe une longueur de
  // 800 à 1500 mots. Pour un album, ces trois consignes sont fausses et
  // contredisent frontalement la règle des 40 à 80 mots par page. Empilées,
  // c'est le modèle qui arbitre — et il suit la consigne la plus longue et la
  // plus insistante, donc celle du roman. D'où un retour en arrière.
  if (workType === "storybook" && storybookAssets && storybookAssets.length > 0) {
    return `${buildStorybookChapterPrompt({ audience, assets: storybookAssets })}

Album : ${title}
Intention de l'auteur : ${synopsis || "à déduire des images"}
${characters ? `Personnages établis (mêmes noms, mêmes apparences) :\n${characters}\n` : ""}${previousSummary && previousSummary.trim() ? `Ce qui s'est passé dans les chapitres précédents :\n${previousSummary}\n` : ""}${chapterBrief ? `Ce chapitre couvre : ${chapterBrief}\n` : ""}${instructions ? `CONSIGNES DE L'AUTEUR (priorité maximale) :\n${instructions}\n` : ""}
Chapitre à écrire :
${heading}

Commence par <h1>${heading}</h1>, puis enchaîne directement les blocs <div class="story-page">. Rien d'autre : pas de salutation, pas de Markdown, pas de commentaire final.`;
  }

  // Mémoire permanente de l'ouvrage + périmètre exact de ce chapitre dans le
  // plan COMPLET. C'est ce qui remplace l'ancien sommaire tronqué à 2 000
  // caractères, seule vue d'ensemble dont disposait le rédacteur.
  const bibleBlock = renderBible(bible);
  const scopeBlock =
    allHeadings && allHeadings.length && typeof chapterIndex === "number"
      ? renderChapterScope(allHeadings, chapterIndex, allBriefs)
      : "";

  const hasPrevious = !!(previousSummary && previousSummary.trim());
  const bibleLabel = genre === "fiction" ? "Bible des personnages / univers" : "Concepts et éléments clés";

  const authorStyleBlock = authorStyle?.trim()
    ? `--- LA PLUME DE L'AUTEUR (priorité absolue sur toute autre consigne de style) ---
L'auteur t'a confié des textes qu'il a écrits. Écris COMME LUI : même longueur de phrases, même registre, même rapport au lecteur, mêmes tournures, même humour ou même gravité. Le lecteur ne doit pas sentir de changement de main.
${authorStyle.trim().slice(0, 3500)}
--- FIN DE LA PLUME DE L'AUTEUR ---\n\n`
    : "";
  const referenceBlock = referenceNotes?.trim()
    ? `Matière fournie par l'auteur (document de référence) — puise-y idées, faits et exemples pertinents pour CE chapitre, sans recopier :\n${referenceNotes.trim().slice(0, 3000)}\n\n`
    : "";

  return `Tu es un écrivain de métier : ${genre === "fiction" ? "romancier" : "auteur"} publié, reconnu pour une plume qui a de la personnalité. Tu rédiges un chapitre COMPLET de ce livre, au niveau d'un ouvrage réellement édité — et tu écris pour être lu jusqu'au bout, pas pour remplir des pages.
Le texte que tu génères sera inséré directement dans le manuscrit de l'auteur.

Livre :
Titre : ${title}
Synopsis global : ${synopsis || "Non défini"}
Ton : ${tone || "à déduire du sujet et du lecteur"}
${audience ? `Lecteur visé : ${audience}\n` : ""}
${authorStyleBlock}${bibleBlock ? `${bibleBlock}\n\n` : ""}${referenceBlock}${scopeBlock ? `${scopeBlock}\n\n` : ""}${characters ? `${bibleLabel} (à respecter scrupuleusement, sans changer les noms ni les faits établis) :\n${characters}\n` : ""}${!scopeBlock && bookOutline ? `Plan / sommaire du livre (reste dans le périmètre de CE chapitre, sans empiéter sur les autres) :\n${bookOutline}\n` : ""}${hasPrevious ? `Résumé des chapitres précédents (pour la cohérence) :\n${previousSummary}\n` : ""}${chapterBrief ? `Ce chapitre doit couvrir précisément : ${chapterBrief}\n` : ""}${instructions ? `CONSIGNES SPÉCIFIQUES DE L'AUTEUR (priorité maximale) :\n${instructions}\n` : ""}
Chapitre à rédiger :
${heading}

${continuityDirective(genre, heading, hasPrevious)}
${searchContext || ""}

Longueur : ${wordsTarget ? `vise environ ${wordsTarget} mots (±20 %).` : "vise au moins 800 à 1500 mots."} La longueur ne justifie jamais le remplissage : développe par des scènes, des exemples et des nuances, pas par des répétitions.

${craftCharter(genre, workType)}

${emotionDirective(tone, genre)}

Structure du chapitre :
${chapterStructureRules(heading)}

${bodyFormattingRules(genre, workType, searchContext, enrichment)}`;
}

/**
 * Palette typographique du livre : le couple choisi par l'auteur (preset de
 * typography.ts) s'il existe, sinon le couple conseillé pour sa catégorie.
 * Renvoie des clés pdfmake (voir fontRegistry) : `body` = corps, `display` =
 * titres. Toutes sont embarquées en TTF, donc réellement rendues à l'export.
 */
export function bookFontPairing(
  category?: string | null,
  tone?: string | null,
  typography?: string | null
): { body: string; display: string } {
  const chosen = getTypographyPreset(typography);
  const preset =
    chosen || getTypographyPreset(defaultTypographyId(category, tone, detectGenre(category, tone) === "fiction"));
  return preset ? { body: preset.body, display: preset.display } : { body: "Merriweather", display: "Montserrat" };
}
