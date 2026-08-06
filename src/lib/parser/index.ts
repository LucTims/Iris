import { parseDocxFile, DocxParseResult } from './docxParser';
import { parseEpubFile, EpubParseResult } from './epubParser';
import { splitHtmlIntoChapters, ParsedChapter } from './chapterSplitter';

export type { ParsedChapter, DocxParseResult, EpubParseResult };
export { parseDocxFile, parseEpubFile, splitHtmlIntoChapters };

export interface ParseManuscriptOptions {
  splitByChapter: boolean;
}

/**
 * Unified entry point to extract manuscript contents from .docx or .epub files.
 * Returns an array of ParsedChapter objects with HTML compatible with TipTap.
 *
 * @param file - Fichier .docx ou .epub à parser
 * @param options - Parameters including splitByChapter boolean flag
 */
export async function parseManuscriptFile(
  file: File | Blob,
  options: ParseManuscriptOptions = { splitByChapter: true }
): Promise<ParsedChapter[]> {
  const fileName = (file as File).name ? (file as File).name.toLowerCase() : '';

  if (fileName.endsWith('.docx')) {
    const result = await parseDocxFile(file);
    if (options.splitByChapter) {
      return splitHtmlIntoChapters(result.html, result.title || 'Chapitre 1');
    }
    return [{ title: result.title || 'Manuscrit complet', content: result.html }];
  }

  if (fileName.endsWith('.epub')) {
    const result = await parseEpubFile(file);
    if (options.splitByChapter) {
      const splitChapters = splitHtmlIntoChapters(result.html, result.title || 'Chapitre 1');
      if (splitChapters.length > 1) {
        return splitChapters;
      }
      if (result.chaptersFromSpine && result.chaptersFromSpine.length > 0) {
        return result.chaptersFromSpine.map((ch, idx) => ({
          title: ch.title || `Chapitre ${idx + 1}`,
          content: ch.html
        }));
      }
      return splitChapters;
    }
    return [{ title: result.title || 'Manuscrit complet', content: result.html }];
  }

  throw new Error('Format de fichier non supporté. Seuls les fichiers .docx et .epub sont acceptés.');
}
