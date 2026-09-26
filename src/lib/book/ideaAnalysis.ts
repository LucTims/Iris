/**
 * Analyse de l'idée de l'auteur par Iris (assistant de création, étape 3).
 *
 * L'auteur écrit librement son idée principale (ou dépose un document qui la
 * contient) ; Iris en déduit la catégorie, le public, le ton et le style.
 * L'auteur n'a plus à deviner ces réglages : il les voit pré-remplis et peut
 * les corriger. Module PUR (sans dépendance serveur) : partagé par la route
 * `/api/analyze-idea` et par l'assistant côté client, et testé unitairement.
 */

export const BOOK_CATEGORIES = [
  "Roman / Fiction",
  "Business & Entrepreneuriat",
  "Développement Personnel",
  "Guide Pratique",
  "Biographie",
] as const;

export const BOOK_TONES = [
  "Sérieux et Didactique",
  "Inspirant et Motivationnel",
  "Humoristique et Décalé",
  "Épique et Descriptif",
  "Familier et Accessible",
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];
export type BookTone = (typeof BOOK_TONES)[number];

export interface IdeaAnalysis {
  category: BookCategory | "";
  audience: string;
  tone: BookTone | "";
  /** Style d'écriture recommandé, en une phrase (ex. « phrases courtes, exemples concrets »). */
  style: string;
  /** Concepts clés ou personnages repérés dans l'idée. */
  characters: string;
  /** Idée principale reformulée (rempli quand l'idée vient d'un document). */
  synopsis: string;
  /** Pourquoi Iris propose ces réglages — affiché à l'auteur. */
  reason: string;
}

export const EMPTY_IDEA_ANALYSIS: IdeaAnalysis = {
  category: "",
  audience: "",
  tone: "",
  style: "",
  characters: "",
  synopsis: "",
  reason: "",
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();

/** Ramène une valeur libre renvoyée par l'IA sur l'une des options connues. */
function pickOption<T extends string>(value: unknown, options: readonly T[]): T | "" {
  if (typeof value !== "string" || !value.trim()) return "";
  const v = norm(value);
  const exact = options.find((o) => norm(o) === v);
  if (exact) return exact;
  // Correspondance souple : premier mot significatif commun (« roman », « business »…).
  return options.find((o) => norm(o).split(" ").some((w) => w.length > 3 && v.includes(w))) || "";
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Lit la réponse de l'IA (JSON attendu, éventuellement entouré de texte ou
 * d'un bloc ```json) de façon tolérante. Ne lève jamais : une réponse
 * inexploitable donne une analyse vide et l'auteur choisit lui-même.
 */
export function parseIdeaAnalysis(text: string): IdeaAnalysis {
  if (!text) return { ...EMPTY_IDEA_ANALYSIS };
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { ...EMPTY_IDEA_ANALYSIS };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return { ...EMPTY_IDEA_ANALYSIS };
  }
  return {
    category: pickOption(raw.category, BOOK_CATEGORIES),
    audience: str(raw.audience, 160),
    tone: pickOption(raw.tone, BOOK_TONES),
    style: str(raw.style, 240),
    characters: str(raw.characters, 240),
    synopsis: str(raw.synopsis, 2500),
    reason: str(raw.reason, 320),
  };
}

/** Lit la liste de questions (une par ligne, numérotées ou non). */
export function parseIdeaQuestions(text: string): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 8 && l.endsWith("?"))
    .slice(0, 5);
}

export interface IdeaInput {
  title: string;
  subtitle?: string;
  idea?: string;
  documentText?: string;
  bookType?: string;
}

function describeInput(input: IdeaInput): string {
  const parts = [`Titre : ${input.title || "(sans titre)"}`];
  if (input.subtitle) parts.push(`Sous-titre : ${input.subtitle}`);
  if (input.bookType) parts.push(`Type d'ouvrage choisi : ${input.bookType}`);
  if (input.idea) parts.push(`Idée principale écrite par l'auteur :\n"""\n${input.idea}\n"""`);
  if (input.documentText) parts.push(`Document fourni par l'auteur (il contient son idée) :\n"""\n${input.documentText}\n"""`);
  return parts.join("\n\n");
}

export function buildIdeaAnalysisPrompt(input: IdeaInput): string {
  const fromDocument = !!input.documentText;
  return `Tu es Iris, directrice éditoriale. Un auteur prépare un livre. À partir de ce qu'il a fourni, choisis les réglages éditoriaux les plus adaptés.

${describeInput(input)}

Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de la forme :
{
  "category": une valeur EXACTE parmi ${JSON.stringify(BOOK_CATEGORIES)},
  "audience": "public cible précis, en quelques mots",
  "tone": une valeur EXACTE parmi ${JSON.stringify(BOOK_TONES)},
  "style": "style d'écriture recommandé, en une phrase",
  "characters": "concepts clés ou personnages principaux repérés (vide si aucun)",
  "synopsis": ${fromDocument ? '"l\'idée principale du livre reformulée en 4 à 8 phrases, fidèle au document"' : '""'},
  "reason": "une phrase qui explique à l'auteur pourquoi ces choix"
}

Règles : la catégorie dépend du SUJET réel (un guide pratique n'est pas un roman, même si le type d'ouvrage choisi est « roman »). Écris en français. N'invente rien qui contredise l'idée de l'auteur.`;
}

export function buildIdeaQuestionsPrompt(input: IdeaInput): string {
  return `Tu es Iris, directrice éditoriale bienveillante. Un auteur prépare un livre mais son idée est encore floue.

${describeInput(input)}

Pose-lui 3 à 5 questions COURTES et concrètes qui l'aideront à préciser son idée (sujet, message, lecteur visé, ce qu'il veut que le lecteur retienne ou ressente). Une question par ligne, chacune terminée par « ? ». Aucun autre texte.`;
}

/**
 * Vrai quand la catégorie choisie par l'auteur ne correspond pas à celle
 * qu'Iris déduit de son idée — l'assistant l'en avertit sans rien imposer.
 */
export function isCategoryMismatch(chosen: string, suggested: string): boolean {
  return !!chosen && !!suggested && norm(chosen) !== norm(suggested);
}
