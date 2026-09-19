/**
 * BOOK BLUEPRINTS — modèles de livre présentés dans l'assistant de création.
 *
 * Un blueprint décrit, pour un type d'ouvrage donné : comment l'assistant de
 * création se comporte (formulaire classique ou import d'images), quels blocs
 * l'éditeur autorise, et d'où viennent les illustrations.
 *
 * ARCHITECTURE — ce module est volontairement une COUCHE MINCE au-dessus de
 * `@/lib/book/work-type`, qui reste la source unique des consignes de
 * rédaction et de la mise en page. Le plan d'implémentation prévoyait un
 * registre autonome dupliquant ces règles ; ç'aurait été un second système de
 * prompts à maintenir en parallèle, avec la dérive garantie entre les deux.
 * Ici, `blueprintId` et `WorkType` sont une seule et même valeur : ajouter un
 * blueprint revient à ajouter un type d'ouvrage, et tout le pipeline existant
 * (plan, chapitre, export PDF/DOCX/EPUB) en hérite sans modification.
 *
 * Seul le blueprint « storybook » est nouveau pour l'instant : les formats
 * recette et documentaire viendront s'ajouter ici quand ils seront ouverts.
 */

import { WORK_TYPE_META, type WorkType } from "@/lib/book/work-type";

export type BlueprintId = WorkType;

/** D'où viennent les illustrations d'un ouvrage bâti sur ce blueprint. */
export type ImageStrategy = "none" | "user-upload" | "ai-generated";

export interface BookBlueprint {
  id: BlueprintId;
  label: string;
  /** Une ligne affichée sous le libellé, dans la carte de l'assistant. */
  description: string;
  /** Nom d'icône lucide-react utilisé par la carte. */
  icon: string;
  /**
   * Étape 2 de l'assistant : formulaire classique (synopsis, ton, personnages)
   * ou zone d'import d'images.
   */
  creationFlow: "form" | "image-first";
  imageStrategy: ImageStrategy;
  /** Blocs autorisés dans l'éditeur pour ce type d'ouvrage. */
  allowedBlocks: string[];
  /** Nombre d'images conseillé quand le flux est piloté par l'image. */
  recommendedAssets?: { min: number; max: number };
}

const EDITORIAL_BLOCKS = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "blockquote",
  "table",
  "callout",
  "keyFigure",
  "pullQuote",
  "dropCap",
  "sectionDivider",
  "image",
];

export const BLUEPRINTS: Record<BlueprintId, BookBlueprint> = {
  livre: {
    id: "livre",
    label: WORK_TYPE_META.livre.label,
    description: WORK_TYPE_META.livre.hint,
    icon: "BookOpen",
    creationFlow: "form",
    imageStrategy: "none",
    allowedBlocks: EDITORIAL_BLOCKS,
  },
  guide: {
    id: "guide",
    label: WORK_TYPE_META.guide.label,
    description: WORK_TYPE_META.guide.hint,
    icon: "Compass",
    creationFlow: "form",
    imageStrategy: "none",
    allowedBlocks: EDITORIAL_BLOCKS,
  },
  ebook: {
    id: "ebook",
    label: WORK_TYPE_META.ebook.label,
    description: WORK_TYPE_META.ebook.hint,
    icon: "FileText",
    creationFlow: "form",
    imageStrategy: "none",
    allowedBlocks: EDITORIAL_BLOCKS,
  },
  storybook: {
    id: "storybook",
    label: WORK_TYPE_META.storybook.label,
    description: WORK_TYPE_META.storybook.hint,
    icon: "Sparkles",
    creationFlow: "image-first",
    imageStrategy: "user-upload",
    // Un conte illustré n'a ni tableau, ni encadré, ni chiffre-clé : la page
    // est une image et quelques phrases.
    allowedBlocks: ["paragraph", "heading", "image", "storyPage", "sectionDivider"],
    recommendedAssets: { min: 2, max: 24 },
  },
};

export const BLUEPRINT_LIST: BookBlueprint[] = [
  BLUEPRINTS.livre,
  BLUEPRINTS.guide,
  BLUEPRINTS.ebook,
  BLUEPRINTS.storybook,
];

/** Blueprint correspondant à un identifiant, avec repli sur « livre ». */
export function getBlueprint(id: string | null | undefined): BookBlueprint {
  if (id && id in BLUEPRINTS) return BLUEPRINTS[id as BlueprintId];
  return BLUEPRINTS.livre;
}

/** Vrai si l'assistant doit demander des images avant de générer le livre. */
export function requiresUserImages(id: string | null | undefined): boolean {
  return getBlueprint(id).creationFlow === "image-first";
}

/**
 * Consigne d'analyse des images, injectée dans le prompt quand l'auteur a
 * importé des visuels. C'est le cœur du flux « Vision-to-Story » : le modèle
 * REGARDE les images et en tire l'histoire, au lieu d'illustrer un texte.
 */
export function visionInstruction(id: string | null | undefined, imageCount: number): string {
  if (imageCount <= 0) return "";

  if (getBlueprint(id).id === "storybook") {
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
