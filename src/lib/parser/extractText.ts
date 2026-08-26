import { parseManuscriptFile } from "./index";

/** Longueur max de texte envoyée à l'IA pour analyse (contrôle le coût en pièces). */
export const MAX_ANALYSIS_CHARS = 60_000;

export interface ExtractedDocument {
  text: string;
  truncated: boolean;
  chars: number;
}

/**
 * Extrait le texte d'un PDF côté navigateur via pdf.js (pdfjs-dist).
 * Chargé dynamiquement pour ne pas alourdir le bundle principal : la lib n'est
 * téléchargée que lorsqu'un PDF est réellement importé.
 */
async function extractPdfText(file: File): Promise<string> {
  let pdfjs: any;
  try {
    pdfjs = await import("pdfjs-dist");
  } catch {
    throw new Error(
      "Le support PDF n'est pas installé. Exécutez : npm install pdfjs-dist"
    );
  }

  // Worker : émis comme asset par le bundler (webpack/Turbopack). En cas d'échec,
  // pdf.js bascule sur un « fake worker » (thread principal) — plus lent mais OK.
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  } catch {
    /* fake worker fallback */
  }

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const maxPages = Math.min(pdf.numPages, 300);
  let out = "";
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it: any) => (typeof it?.str === "string" ? it.str : ""));
    out += strings.join(" ") + "\n\n";
    // On s'arrête tôt si on a déjà largement de quoi analyser (limite le coût).
    if (out.length > MAX_ANALYSIS_CHARS * 1.5) break;
  }
  return out;
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
    raw = await extractPdfText(file);
  } else {
    throw new Error(
      "Format non supporté. Formats acceptés : .pdf, .docx, .epub, .txt, .md."
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

export const ANALYSIS_ACCEPT = ".pdf,.docx,.epub,.txt,.md,.markdown";
