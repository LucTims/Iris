import JSZip from 'jszip';
import { parseDocxFile } from '../docxParser';
import { parseEpubFile } from '../epubParser';
import { splitHtmlIntoChapters } from '../chapterSplitter';
import { parseManuscriptFile } from '../index';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';

/**
 * Factory function to create a TipTap Editor instance matching RichManuscriptEditor.tsx configuration
 */
function createTestEditor(initialContent: string = '') {
  return new Editor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: true }),
    ],
    content: initialContent,
  });
}

describe('TipTap Compatibility & Tag Preservation Verification Suite', () => {

  describe('1. HTML Tag Preservation in splitHtmlIntoChapters & TipTap ProseMirror Schema', () => {
    test('preserves H1-H6 headings, paragraphs, bold, italic, underline, strike, blockquotes, lists, and base64 images', () => {
      const inputHtml = `
        <h1>Titre Principal H1</h1>
        <p>Un paragraphe avec du <strong>texte en gras</strong>, de l'<em>italique</em>, du <u>souligné</u> et du <del>texte barré</del>.</p>
        <h2>Deuxième Niveau H2</h2>
        <h3>Troisième Niveau H3</h3>
        <h4>Quatrième Niveau H4</h4>
        <h5>Cinquième Niveau H5</h5>
        <h6>Sixième Niveau H6</h6>
        <blockquote>Une citation poétique inspirante.</blockquote>
        <ul>
          <li>Élément à puces 1</li>
          <li>Élément à puces 2</li>
        </ul>
        <ol>
          <li>Élément numéroté 1</li>
          <li>Élément numéroté 2</li>
        </ol>
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="image test" />
      `;

      // 1. Check splitHtmlIntoChapters preservation
      const chapters = splitHtmlIntoChapters(inputHtml, 'Test Default');
      expect(chapters.length).toBe(2); // Split at H1 and H2

      const ch1 = chapters[0]; // H1 chapter
      const ch2 = chapters[1]; // H2 chapter

      expect(ch1.title).toBe('Titre Principal H1');
      expect(ch1.content).toContain('<h1>Titre Principal H1</h1>');
      expect(ch1.content).toContain('<strong>texte en gras</strong>');
      expect(ch1.content).toContain('<em>de l\'italique</em>');
      expect(ch1.content).toContain('<u>souligné</u>');
      expect(ch1.content).toContain('<del>texte barré</del>');

      expect(ch2.title).toBe('Deuxième Niveau H2');
      expect(ch2.content).toContain('<h2>Deuxième Niveau H2</h2>');
      expect(ch2.content).toContain('<h3>Troisième Niveau H3</h3>');
      expect(ch2.content).toContain('<h4>Quatrième Niveau H4</h4>');
      expect(ch2.content).toContain('<h5>Cinquième Niveau H5</h5>');
      expect(ch2.content).toContain('<h6>Sixième Niveau H6</h6>');
      expect(ch2.content).toContain('<blockquote>Une citation poétique inspirante.</blockquote>');
      expect(ch2.content).toContain('<ul>');
      expect(ch2.content).toContain('<ol>');
      expect(ch2.content).toContain('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="');

      // 2. Feed chapter content into TipTap Editor instance
      const editor1 = createTestEditor(ch1.content);
      const editor2 = createTestEditor(ch2.content);

      const htmlOut1 = editor1.getHTML();
      const htmlOut2 = editor2.getHTML();

      // Verify TipTap preserved all nodes and marks
      expect(htmlOut1).toContain('<h1>Titre Principal H1</h1>');
      expect(htmlOut1).toContain('<strong>texte en gras</strong>');
      expect(htmlOut1).toContain('<em>de l\'italique</em>');
      expect(htmlOut1).toContain('<u>souligné</u>');
      expect(htmlOut1).toContain('s>texte barré</s>'); // TipTap normalizes <del> to <s> or <del>

      expect(htmlOut2).toContain('<h2>Deuxième Niveau H2</h2>');
      expect(htmlOut2).toContain('<h3>Troisième Niveau H3</h3>');
      expect(htmlOut2).toContain('<h4>Quatrième Niveau H4</h4>');
      expect(htmlOut2).toContain('<h5>Cinquième Niveau H5</h5>');
      expect(htmlOut2).toContain('<h6>Sixième Niveau H6</h6>');
      expect(htmlOut2).toContain('<blockquote>');
      expect(htmlOut2).toContain('<ul>');
      expect(htmlOut2).toContain('<ol>');
      expect(htmlOut2).toContain('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="');

      editor1.destroy();
      editor2.destroy();
    });
  });

  describe('2. DOCX Parser HTML & TipTap Compatibility', () => {
    test('parses docx document with headings, bold, italic, underline, lists, and embedded images into TipTap editor', async () => {
      const zip = new JSZip();
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="xml" ContentType="application/xml"/>
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="png" ContentType="image/png"/>
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`
      );
      zip.file(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>`
      );
      zip.file(
        'word/_rels/document.xml.rels',
        `<?xml version="1.0" encoding="UTF-8"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
        </Relationships>`
      );
      zip.file(
        'word/document.xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <w:body>
            <w:p>
              <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
              <w:r><w:t>Titre du DOCX</w:t></w:r>
            </w:p>
            <w:p>
              <w:r><w:rPr><w:b/></w:rPr><w:t>Gras</w:t></w:r>
              <w:r><w:t> et </w:t></w:r>
              <w:r><w:rPr><w:i/></w:rPr><w:t>Italique</w:t></w:r>
              <w:r><w:t> et </w:t></w:r>
              <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>Souligné</w:t></w:r>
            </w:p>
            <w:p>
              <w:r>
                <w:drawing>
                  <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
                    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                          <pic:blipFill><a:blip r:embed="rId2"/></pic:blipFill>
                        </pic:pic>
                      </a:graphicData>
                    </a:graphic>
                  </wp:inline>
                </w:drawing>
              </w:r>
            </w:p>
          </w:body>
        </w:document>`
      );
      zip.file('word/media/image1.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

      const docxBlob = await zip.generateAsync({ type: 'blob' });
      const docxFile = new File([docxBlob], 'manuscrit_test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const parsedChapters = await parseManuscriptFile(docxFile, { splitByChapter: true });
      expect(parsedChapters.length).toBe(1);
      expect(parsedChapters[0].title).toBe('Titre du DOCX');

      const editor = createTestEditor(parsedChapters[0].content);
      const htmlOut = editor.getHTML();

      expect(htmlOut).toContain('<h1>Titre du DOCX</h1>');
      expect(htmlOut).toContain('<strong>Gras</strong>');
      expect(htmlOut).toContain('<em>Italique</em>');
      expect(htmlOut).toContain('<u>Souligné</u>');
      expect(htmlOut).toContain('<img src="data:image/png;base64,iVBORw0KGgo=');

      editor.destroy();
    });
  });

  describe('3. EPUB Parser HTML & TipTap Compatibility', () => {
    test('parses epub document with formatting and resolves base64 images into TipTap editor', async () => {
      const zip = new JSZip();
      zip.file(
        'META-INF/container.xml',
        `<?xml version="1.0"?>
        <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
          <rootfiles>
            <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
          </rootfiles>
        </container>`
      );
      zip.file(
        'content.opf',
        `<?xml version="1.0" encoding="utf-8"?>
        <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
          <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
            <dc:title>Roman EPUB Test</dc:title>
          </metadata>
          <manifest>
            <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
            <item id="img1" href="img.png" media-type="image/png"/>
          </manifest>
          <spine>
            <itemref idref="ch1"/>
          </spine>
        </package>`
      );
      zip.file(
        'ch1.xhtml',
        `<!DOCTYPE html>
        <html>
        <head><title>Chapitre Alpha</title></head>
        <body>
          <h1>Chapitre Alpha</h1>
          <p>Voici du <strong>gras</strong>, <em>italique</em>, <u>souligné</u>, et <del>barré</del>.</p>
          <blockquote>Une belle citation.</blockquote>
          <img src="img.png" alt="illustration"/>
        </body>
        </html>`
      );
      zip.file('img.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

      const epubBlob = await zip.generateAsync({ type: 'blob' });
      const epubFile = new File([epubBlob], 'book.epub', { type: 'application/epub+zip' });

      const chapters = await parseManuscriptFile(epubFile, { splitByChapter: true });
      expect(chapters.length).toBe(1);
      expect(chapters[0].title).toBe('Chapitre Alpha');

      const editor = createTestEditor(chapters[0].content);
      const htmlOut = editor.getHTML();

      expect(htmlOut).toContain('<h1>Chapitre Alpha</h1>');
      expect(htmlOut).toContain('<strong>gras</strong>');
      expect(htmlOut).toContain('<em>italique</em>');
      expect(htmlOut).toContain('<u>souligné</u>');
      expect(htmlOut).toContain('s>barré</s>');
      expect(htmlOut).toContain('<blockquote>');
      expect(htmlOut).toContain('<img src="data:image/png;base64,iVBORw0KGgo=');

      editor.destroy();
    });
  });

  describe('4. Redaction Page State Management Verification', () => {

    interface Chapter {
      id: number | string;
      number: number;
      title: string;
      content: string;
      status: 'Brouillon' | 'En cours' | 'Terminé';
    }

    // Replicating handleConfirmImport logic from src/app/redaction/page.tsx
    function simulateConfirmImport(
      splitByChapter: boolean,
      parsedChapters: { title: string; content: string }[],
      currentChapters: Chapter[],
      activeChapterIndex: number
    ): { chapters: Chapter[]; activeChapterIndex: number; saveStatus: string } {
      if (!parsedChapters || parsedChapters.length === 0) {
        return { chapters: currentChapters, activeChapterIndex, saveStatus: 'saved' };
      }

      if (!splitByChapter) {
        // Option 2: Single block into current active chapter
        const combinedHtml = parsedChapters[0].content;
        const updated = [...currentChapters];
        updated[activeChapterIndex] = {
          ...updated[activeChapterIndex],
          content: combinedHtml,
          status: 'En cours',
        };
        return { chapters: updated, activeChapterIndex, saveStatus: 'saving' };
      } else {
        // Option 1: Split into chapters
        const newChapters: Chapter[] = parsedChapters.map((pc, idx) => ({
          id: Date.now() + idx,
          number: idx + 1,
          title: pc.title || `Chapitre ${idx + 1}`,
          content: pc.content || '',
          status: 'Brouillon',
        }));

        return { chapters: newChapters, activeChapterIndex: 0, saveStatus: 'saving' };
      }
    }

    test('Single-block mode updates active chapter content while preserving other chapters and active index', () => {
      const initialChapters: Chapter[] = [
        { id: 1, number: 1, title: 'Chapitre 1', content: 'Contenu 1', status: 'En cours' },
        { id: 2, number: 2, title: 'Chapitre 2', content: 'Contenu 2', status: 'Brouillon' },
        { id: 3, number: 3, title: 'Chapitre 3', content: 'Contenu 3', status: 'Brouillon' },
      ];
      const activeIdx = 1; // User is currently editing Chapter 2

      const parsedSingle = [
        { title: 'Manuscrit complet', content: '<p>Nouveau grand texte importé en bloc unique.</p>' }
      ];

      const res = simulateConfirmImport(false, parsedSingle, initialChapters, activeIdx);

      expect(res.chapters.length).toBe(3);
      expect(res.activeChapterIndex).toBe(1); // Active index unchanged
      expect(res.chapters[1].content).toBe('<p>Nouveau grand texte importé en bloc unique.</p>');
      expect(res.chapters[1].status).toBe('En cours');
      expect(res.chapters[1].title).toBe('Chapitre 2'); // Retains existing title

      // Chapter 1 and Chapter 3 unchanged
      expect(res.chapters[0].content).toBe('Contenu 1');
      expect(res.chapters[2].content).toBe('Contenu 3');
      expect(res.saveStatus).toBe('saving');
    });

    test('Chapter-split mode replaces entire chapters state and resets activeChapterIndex to 0', () => {
      const initialChapters: Chapter[] = [
        { id: 1, number: 1, title: 'Ancien Chap 1', content: 'Ancien 1', status: 'En cours' },
        { id: 2, number: 2, title: 'Ancien Chap 2', content: 'Ancien 2', status: 'Brouillon' },
      ];
      const activeIdx = 1;

      const parsedMulti = [
        { title: 'Partie 1 : Genèse', content: '<h1>Partie 1</h1><p>Texte 1</p>' },
        { title: 'Partie 2 : L’Exil', content: '<h2>Partie 2</h2><p>Texte 2</p>' },
        { title: 'Partie 3 : Le Retour', content: '<h2>Partie 3</h2><p>Texte 3</p>' },
      ];

      const res = simulateConfirmImport(true, parsedMulti, initialChapters, activeIdx);

      expect(res.chapters.length).toBe(3);
      expect(res.activeChapterIndex).toBe(0); // Resets to index 0
      expect(res.chapters[0].title).toBe('Partie 1 : Genèse');
      expect(res.chapters[1].title).toBe('Partie 2 : L’Exil');
      expect(res.chapters[2].title).toBe('Partie 3 : Le Retour');
      expect(res.chapters[0].status).toBe('Brouillon');
      expect(res.saveStatus).toBe('saving');
    });

    test('Handles switching between modes multiple times cleanly', () => {
      let state: { chapters: Chapter[]; activeChapterIndex: number; saveStatus: string } = {
        chapters: [
          { id: 1, number: 1, title: 'Chap 1', content: 'c1', status: 'Brouillon' }
        ],
        activeChapterIndex: 0,
        saveStatus: 'saved',
      };

      // 1. Split import (3 chapters)
      const split1 = [
        { title: 'Section 1', content: 'html1' },
        { title: 'Section 2', content: 'html2' },
        { title: 'Section 3', content: 'html3' },
      ];
      const res1 = simulateConfirmImport(true, split1, state.chapters, state.activeChapterIndex);
      state = res1;

      expect(state.chapters.length).toBe(3);
      expect(state.activeChapterIndex).toBe(0);

      // User navigates to chapter index 2 (Section 3)
      state.activeChapterIndex = 2;

      // 2. Single block import into active chapter (index 2)
      const single1 = [
        { title: 'Bloc unique', content: 'html_single_block' }
      ];
      const res2 = simulateConfirmImport(false, single1, state.chapters, state.activeChapterIndex);
      state = res2;

      expect(state.chapters.length).toBe(3);
      expect(state.activeChapterIndex).toBe(2);
      expect(state.chapters[2].content).toBe('html_single_block');
      expect(state.chapters[0].content).toBe('html1');

      // 3. Split import again (2 chapters)
      const split2 = [
        { title: 'Nouveau Ch 1', content: 'new1' },
        { title: 'Nouveau Ch 2', content: 'new2' },
      ];
      const res3 = simulateConfirmImport(true, split2, state.chapters, state.activeChapterIndex);
      state = res3;

      expect(state.chapters.length).toBe(2);
      expect(state.activeChapterIndex).toBe(0); // Valid index within new 2-element array
      expect(state.chapters[0].title).toBe('Nouveau Ch 1');
    });

  });
});
