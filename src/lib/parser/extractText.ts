import { parseManuscriptFile } from "./index";

/** Longueur max de texte envoyée à l'IA pour analyse (contrôle le coût en pièces). */
export const MAX_ANALYSIS_CHARS = 60_000;

export interface ExtractedDocument {
  text: string;
  truncated: boolean;
  chars: number;
}

/** Retire les balises HTML et normalise les espaces d'un fragment HTML. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extrait le texte brut d'un document importé, côté navigateur.
 * Formats supportés : .docx, .epub (via le parseur manuscrit existant) et
 * .txt / .md (lecture directe). Le PDF n'est pas encore pris en charge côté
 * client (nécessiterait pdf.js) : un message clair invite à convertir.
 */
export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  const name = (file.name || "").toLowerCase();

  let raw = "";

  if (name.endsWith(".docx") || name.endsWith(".epub")) {
    const chapters = await parseManuscriptFile(file, { splitByChapter: false });
    raw = chapters.map((c) => htmlToPlainText(c.content)).join("\n\n");
  } else if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) {
    raw = await file.text();
  } else if (name.endsWith(".pdf")) {
    throw new Error(
      "Les PDF ne sont pas encore pris en charge pour l'analyse. Convertissez-le en .docx ou .txt, puis réimportez-le."
    );
  } else {
    throw new Error(
      "Format non supporté. Formats acceptés : .docx, .epub, .txt, .md."
    );
  }

  raw = raw.replace(/\r\n/g, "\n").trim();

  if (!raw) {
    throw new Error("Impossible d'extraire du texte de ce document (fichier vide ou illisible).");
  }

  const truncated = raw.length > MAX_ANALYSIS_CHARS;
  const text = truncated ? raw.slice(0, MAX_ANALYSIS_CHARS) : raw;

  return { text, truncated, chars: text.length };
}

export const ANALYSIS_ACCEPT = ".docx,.epub,.txt,.md,.markdown";
