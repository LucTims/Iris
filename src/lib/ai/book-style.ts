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
 * Règles de mise en forme selon le genre. En fiction : PROSE PURE — aucun
 * encadré, aucune statistique, aucune source, aucun tableau. En non-fiction :
 * la panoplie complète (encadrés, chiffres clés, tableaux).
 */
export function bodyFormattingRules(genre: BookGenre, workType: WorkType = "livre"): string {
  // La FORME (livre / guide / ebook) prime sur la palette de balises : c'est
  // elle qui décide si l'appareil éditorial (encadrés, tableaux, checklists) a
  // sa place. Sans ça, un livre de développement personnel héritait de toute la
  // panoplie du guide pratique et se lisait comme une formation.
  const formRules = workTypeWritingRules(genre === "fiction" ? "livre" : workType, genre);

  if (genre === "fiction") {
    return `Style de RÉCIT (fiction / narration) — le texte doit se lire comme un vrai roman publié :
- Rédige en prose immersive avec des balises <p>. Titres de section <h2> uniquement si le chapitre en a réellement besoin (rare en fiction).
- Pour un dialogue, utilise des paragraphes <p> avec tirets cadratins (« — ») ou guillemets français (« … »).
- Pour une citation ou une phrase marquante à détacher, tu PEUX utiliser <div class="pull-quote">…</div> (maximum 1 par chapitre, avec parcimonie).
- Pour une transition entre deux scènes, tu PEUX utiliser <div class="section-divider section-divider-stars"></div>.
- Pour l'ouverture du chapitre, tu PEUX utiliser une lettrine sur le premier paragraphe : <p class="drop-cap">…</p> (1 seule fois, au tout début).
- INTERDIT ABSOLU en fiction : les encadrés <div class="callout">, les <div class="key-figure">, les listes à puces d'analyse, les tableaux de données, et TOUTE citation de source du type « [Source: …] ». On ne commente jamais sa propre histoire et on ne cite jamais de statistiques dans un roman.
- Montre, ne raconte pas : privilégie l'action, les sensations, les dialogues et les détails concrets plutôt que le résumé.

${formRules}`;
  }
  return `Style d'OUVRAGE PRATIQUE (non-fiction) :
- Structure claire avec paragraphes <p>, sous-titres <h2>/<h3>, et listes <ul>/<ol> quand c'est pertinent.
- Données comparatives / critères chiffrés : présente-les dans un tableau HTML (<table>, <thead>, <tbody>, <tr>, <th>, <td>).
- Points clés : encadrés <div class="callout callout-info">…</div> (info), callout-warning (mise en garde), callout-tip (conseil), callout-example (exemple). 1 à 3 par chapitre maximum, seulement quand ça apporte de la valeur.
- Chiffre marquant : <div class="key-figure">85% des entreprises…</div> (1-2 max). Citation forte : <div class="pull-quote">…</div> (1-2 max).
- Transition : <div class="section-divider section-divider-stars"></div> (ou ornament, line, dots), avec parcimonie.
- Lettrine possible en ouverture : <p class="drop-cap">…</p> (1 max).

${formRules}`;
}

/**
 * Directive de CONTINUITÉ — le point le plus important pour un rendu
 * professionnel. Empêche le symptôme observé où le chapitre 3 recommençait
 * l'histoire au tout début (retour à l'orphelinat déjà quitté au chapitre 2).
 */
export function continuityDirective(
  genre: BookGenre,
  chapterNumber: number | string,
  hasPrevious: boolean
): string {
  if (!hasPrevious) {
    return genre === "fiction"
      ? `Ceci est le PREMIER chapitre : installe le décor, les personnages et l'accroche, mais laisse des fils narratifs ouverts pour la suite.`
      : `Ceci est le PREMIER chapitre : pose le cadre et la promesse de l'ouvrage.`;
  }
  const common = `Ceci est le chapitre ${chapterNumber} d'un livre CONTINU. Le lecteur a DÉJÀ lu les chapitres précédents (voir leur résumé ci-dessus).`;
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
  previousSummary?: string;
  searchContext?: string;
  wordsTarget?: number;
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
    previousSummary,
    searchContext,
    wordsTarget,
  } = opts;

  // Titre définitif : celui calculé en amont, sinon composition de repli.
  const heading = chapterHeading || `Chapitre ${chapterNumber} : ${chapterTitle}`;

  const hasPrevious = !!(previousSummary && previousSummary.trim());
  const bibleLabel = genre === "fiction" ? "Bible des personnages / univers" : "Concepts et éléments clés";

  return `Tu es un auteur professionnel de best-sellers. Ta mission est de rédiger un chapitre COMPLET, du niveau d'un livre réellement publié.
Le texte que tu génères sera inséré directement dans le manuscrit de l'auteur.

Livre :
Titre : ${title}
Synopsis global : ${synopsis || "Non défini"}
Ton / Style : ${tone || "Professionnel et engageant"}

${characters ? `${bibleLabel} (à respecter scrupuleusement, sans changer les noms ni les faits établis) :\n${characters}\n` : ""}${bookOutline ? `Plan / sommaire du livre (reste dans le périmètre de CE chapitre, sans empiéter sur les autres) :\n${bookOutline}\n` : ""}${hasPrevious ? `Résumé des chapitres précédents (pour la cohérence) :\n${previousSummary}\n` : ""}${chapterBrief ? `Ce chapitre doit couvrir précisément : ${chapterBrief}\n` : ""}${instructions ? `CONSIGNES SPÉCIFIQUES DE L'AUTEUR (priorité maximale) :\n${instructions}\n` : ""}
Chapitre à rédiger :
${heading}

${continuityDirective(genre, chapterNumber, hasPrevious)}
${searchContext || ""}

Longueur : ${wordsTarget ? `vise environ ${wordsTarget} mots (±20 %).` : "vise au moins 800 à 1500 mots."}

Structure du chapitre :
${chapterStructureRules(heading)}

${bodyFormattingRules(genre, workType)}`;
}

/**
 * Palette typographique par STYLE de livre — pour un rendu riche et adapté à
 * chaque genre (le catalogue Iris ne se limite pas aux romans). Renvoie des
 * clés pdfmake (voir fontRegistry) : `body` = corps, `display` = titres.
 *
 * Toutes les familles citées sont embarquées en TTF, donc réellement rendues à
 * l'export. On repère le style via des mots-clés de catégorie (et le ton en
 * repli), avec un défaut littéraire pour la fiction et sobre pour la non-fiction.
 */
export function bookFontPairing(
  category?: string | null,
  tone?: string | null
): { body: string; display: string } {
  const hay = `${category || ""} ${tone || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const has = (...kws: string[]) => kws.some((k) => hay.includes(k));

  // Jeunesse / enfants : chaleureux et rond.
  if (has("jeunesse", "enfant", "young adult", "conte")) {
    return { body: "Nunito", display: "Poppins" };
  }
  // Romance / sentimental : élégant.
  if (has("romance", "sentimental")) {
    return { body: "Lora", display: "CormorantGaramond" };
  }
  // Thriller / policier / horreur : serif dense + titres modernes serrés.
  if (has("thriller", "policier", "polar", "suspense", "horreur")) {
    return { body: "PTSerif", display: "Montserrat" };
  }
  // Poésie : garamond classique.
  if (has("poesie", "poeme")) {
    return { body: "EBGaramond", display: "EBGaramond" };
  }
  // Business / finance / management : sobre et professionnel.
  if (has("business", "finance", "management", "entreprise", "marketing", "economie")) {
    return { body: "Merriweather", display: "Montserrat" };
  }
  // Développement personnel / self-help : accueillant.
  if (has("developpement personnel", "bien-etre", "bien etre", "self", "motivation", "coaching")) {
    return { body: "SourceSerif4", display: "Poppins" };
  }
  // Académique / essai / histoire / science / technique : rigoureux.
  if (has("academique", "essai", "histoire", "science", "technique", "manuel", "education", "scolaire", "guide")) {
    return { body: "PTSerif", display: "PTSerif" };
  }
  // Fiction générale (roman, aventure, fantasy, SF, drame…) : littéraire.
  if (detectGenre(category, tone) === "fiction") {
    return { body: "Lora", display: "PlayfairDisplay" };
  }
  // Non-fiction par défaut.
  return { body: "Merriweather", display: "Montserrat" };
}
