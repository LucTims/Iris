/**
 * REGISTRE DES BLUEPRINTS DE LIVRES — Iris Book Creation Platform.
 *
 * Ce module constitue le registre central définissant le comportement et les
 * caractéristiques des différents types d'ouvrages supportés dans Iris.
 *
 * Un blueprint associe :
 *   - L'identité visuelle et descriptive pour l'assistant de création (label, icône, tag, description) ;
 *   - Le rattachement aux systèmes existants : genre littéraire (`BookGenre`) et type d'ouvrage (`WorkType`) ;
 *   - La stratégie visuelle (support des illustrations et source des images) ;
 *   - Le calibrage éditorial : terme de division (chapitre, page, étape), densité de mots cible, et pagination par défaut ;
 *   - Les champs du formulaire de création à afficher dans le wizard.
 *
 * Formats actuellement disponibles :
 *   - `roman` : Ouvrage narratif classique (fiction ou non-fiction continue), sans images.
 *   - `guide` : Guide pratique ou méthodologique, découpé en étapes avec encadrés.
 *   - `ebook` : Format numérique court et direct, structuré pour une lecture rapide.
 *   - `storybook` : Conte illustré pour enfants basé sur des visuels (vision-to-story).
 */

import type { WorkType } from "@/lib/book/work-type";
import type { BookGenre } from "@/lib/ai/book-style";

/**
 * Identifiants uniques des blueprints supportés dans Iris.
 */
export type BlueprintId = "roman" | "guide" | "ebook" | "storybook";

/**
 * Stratégie de gestion des images pour un blueprint donné.
 * - 'none' : aucune illustration.
 * - 'user-upload' : images fournies par l'utilisateur lors de la création.
 * - 'ai-generated' : images générées automatiquement par l'IA.
 */
export type ImageStrategy = "none" | "user-upload" | "ai-generated";

/**
 * Spécification complète d'un blueprint de livre.
 */
export interface BookBlueprint {
  /** Identifiant unique du blueprint */
  id: BlueprintId;
  /** Libellé affiché dans l'interface utilisateur */
  label: string;
  /** Nom de l'icône Lucide React associée */
  icon: string;
  /** Description synthétique affichée sur la carte de sélection du wizard */
  description: string;
  /** Étiquette courte ou badge pour catégoriser le blueprint */
  tag: string;
  /** Genre éditorial associé (fiction ou non-fiction) */
  genre: BookGenre;
  /** Type d'ouvrage dans le système historique de rédaction et d'export */
  workType: WorkType;
  /** Indique si le format intègre des visuels / illustrations */
  supportsImages: boolean;
  /** Stratégie d'approvisionnement des images */
  imageStrategy: ImageStrategy;
  /** Dénomination d'une division de l'ouvrage ('Chapitre', 'Page', 'Étape', etc.) */
  chapterNoun: string;
  /** Fourchette cible de mots par division (page ou chapitre) */
  wordsPerPage: {
    min: number;
    max: number;
  };
  /** Nombre conseillé ou par défaut de pages / chapitres */
  defaultPageCount: number;
  /** Liste des identifiants de champs à afficher dans le formulaire de création */
  creationFields: string[];
}

/**
 * Registre de tous les blueprints disponibles dans Iris.
 */
export const BLUEPRINTS: Record<BlueprintId, BookBlueprint> = {
  roman: {
    id: "roman",
    label: "Roman",
    icon: "BookOpen",
    description: "Roman, récit ou essai littéraire composé de chapitres continus et immersifs.",
    tag: "Roman & Essai",
    genre: "fiction",
    workType: "livre",
    supportsImages: false,
    imageStrategy: "none",
    chapterNoun: "Chapitre",
    wordsPerPage: { min: 800, max: 2000 },
    defaultPageCount: 50,
    creationFields: [
      "title",
      "subtitle",
      "category",
      "audience",
      "synopsis",
      "tone",
      "characters",
      "length",
      "instructions",
    ],
  },
  guide: {
    id: "guide",
    label: "Guide pratique",
    icon: "Compass",
    description: "Manuel méthodologique axé sur la pratique, structuré en étapes concrètes et encadrés.",
    tag: "Méthodes & Étapes",
    genre: "nonfiction",
    workType: "guide",
    supportsImages: false,
    imageStrategy: "none",
    chapterNoun: "Étape",
    wordsPerPage: { min: 600, max: 1500 },
    defaultPageCount: 30,
    creationFields: [
      "title",
      "subtitle",
      "category",
      "audience",
      "synopsis",
      "tone",
      "length",
      "instructions",
    ],
  },
  ebook: {
    id: "ebook",
    label: "Ebook",
    icon: "FileText",
    description: "Format court, direct et condensé, idéal pour une lecture rapide et scannable sur écran.",
    tag: "Court & Direct",
    genre: "nonfiction",
    workType: "ebook",
    supportsImages: false,
    imageStrategy: "none",
    chapterNoun: "Chapitre",
    wordsPerPage: { min: 400, max: 800 },
    defaultPageCount: 15,
    creationFields: [
      "title",
      "subtitle",
      "category",
      "audience",
      "synopsis",
      "tone",
      "length",
      "instructions",
    ],
  },
  storybook: {
    id: "storybook",
    label: "Conte illustré",
    icon: "Sparkles",
    description: "Créez un conte pour enfants magnifiquement illustré, page par page.",
    tag: "Conte illustré",
    genre: "fiction",
    workType: "livre",
    supportsImages: true,
    imageStrategy: "user-upload",
    chapterNoun: "Page",
    wordsPerPage: { min: 30, max: 150 },
    defaultPageCount: 12,
    creationFields: [
      "title",
      "audience",
      "synopsis",
      "characters",
      "storybook_images",
    ],
  },
};

/**
 * Liste ordonnée de tous les blueprints pour l'affichage dans l'interface utilisateur.
 */
export const BLUEPRINT_LIST: BookBlueprint[] = [
  BLUEPRINTS.roman,
  BLUEPRINTS.guide,
  BLUEPRINTS.ebook,
  BLUEPRINTS.storybook,
];

/**
 * Résout le blueprint correspondant à un identifiant donné.
 * Si l'identifiant est indéfini, nul ou non répertorié, se replie sur le blueprint par défaut 'roman'.
 * Assure également la compatibilité avec l'identifiant historique 'livre'.
 *
 * @param id Identifiant du blueprint recherché (ex: 'roman', 'storybook', 'guide', 'ebook')
 * @returns Le blueprint correspondant ou 'roman' par défaut
 */
export function resolveBlueprint(id?: string | null): BookBlueprint {
  if (!id) return BLUEPRINTS.roman;
  const normalized = id.toLowerCase().trim();
  if (normalized === "livre") return BLUEPRINTS.roman;
  if (normalized in BLUEPRINTS) {
    return BLUEPRINTS[normalized as BlueprintId];
  }
  return BLUEPRINTS.roman;
}

/**
 * Détermine si un blueprint prend en charge les images / illustrations.
 *
 * @param id Identifiant du blueprint
 * @returns true si le blueprint supporte les images, false sinon
 */
export function isVisualBlueprint(id: BlueprintId): boolean {
  return BLUEPRINTS[id]?.supportsImages ?? false;
}

/**
 * Alias de compatibilité pour `resolveBlueprint`.
 */
export function getBlueprint(id?: string | null): BookBlueprint {
  return resolveBlueprint(id);
}

/**
 * Indique si le blueprint requiert des images fournies par l'utilisateur lors de la création.
 */
export function requiresUserImages(id?: string | null): boolean {
  const bp = resolveBlueprint(id);
  return bp.supportsImages && bp.imageStrategy === "user-upload";
}

/**
 * Consigne d'analyse des images, injectée dans le prompt IA quand l'auteur a
 * fourni des visuels. Au cœur du flux « Vision-to-Story », le modèle analyse
 * le contenu visuel pour en déduire et articuler la narration.
 */
export function visionInstruction(id: string | null | undefined, imageCount: number): string {
  if (imageCount <= 0) return "";

  const bp = resolveBlueprint(id);
  if (bp.id === "storybook" || id === "storybook") {
    return `\n\n--- IMAGES FOURNIES PAR L'AUTEUR (${imageCount}) ---
L'auteur a importé ${imageCount} image${imageCount > 1 ? "s" : ""} (dessins d'enfant, photos, illustrations). Elles te sont jointes dans l'ordre exact du livre.

REGARDE CHAQUE IMAGE ATTENTIVEMENT, puis :
1. Décris mentalement ce que tu vois sur chacune : personnages, animaux, décor, couleurs, action en cours, émotion.
2. Tisse UNE SEULE histoire cohérente qui relie toutes les images DANS L'ORDRE où elles te sont données. L'image 1 ouvre l'histoire, la dernière la referme.
3. Chaque image devient UNE page du conte : l'image en haut, quelques phrases dessous.
4. Les personnages gardent le même nom, la même apparence et le même caractère d'une page à l'autre — c'est ce qui fait tenir l'histoire.
5. N'invente AUCUN élément visuel absent des images, et n'ignore aucune image.
--- FIN DES IMAGES ---`;
  }

  return `\n\n--- IMAGES FOURNIES PAR L'AUTEUR (${imageCount}) ---
L'auteur a joint ${imageCount} image${imageCount > 1 ? "s" : ""}. Appuie-toi sur leur contenu réel pour écrire ; ne décris rien qui n'y figure pas.
--- FIN DES IMAGES ---`;
}
