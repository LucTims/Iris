import JSZip from 'jszip';
import mammoth from 'mammoth';
import { parseDocxFile } from '../docxParser';
import { parseEpubFile } from '../epubParser';
import { splitHtmlIntoChapters } from '../chapterSplitter';
import { parseManuscriptFile } from '../index';

if (typeof (globalThis as any).describe === 'undefined') {
  (globalThis as any).describe = (name: string, fn: () => void) => {
    console.log(`\n--- ${name} ---`);
    fn();
  };
  (globalThis as any).test = (name: string, fn: () => void | Promise<void>) => {
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>)
          .then(() => console.log(`  [✅ PASS] ${name}`))
          .catch((err: any) => {
            console.error(`  [❌ FAIL] ${name}:`, err.message || err);
            process.exitCode = 1;
          });
      }
      console.log(`  [✅ PASS] ${name}`);
    } catch (err: any) {
      console.error(`  [❌ FAIL] ${name}:`, err.message || err);
      process.exitCode = 1;
    }
  };
  (globalThis as any).expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain: (expected: any) => {
      if (!actual || !actual.includes(expected)) {
        throw new Error(`Expected content to contain ${JSON.stringify(expected)}`);
      }
    },
    rejects: {
      toThrow: async (expectedMsg: string) => {
        try {
          await actual;
          throw new Error(`Expected promise to reject with message containing "${expectedMsg}", but it resolved`);
        } catch (err: any) {
          if (!err.message || !err.message.includes(expectedMsg)) {
            throw new Error(`Expected error message to contain "${expectedMsg}", got "${err.message}"`);
          }
        }
      }
    }
  });
}

describe('Manuscript Parser Unit Tests', () => {
  describe('chapterSplitter - splitHtmlIntoChapters', () => {
    test('splits HTML into chapters at H1 and H2 boundaries', () => {
      const sampleHtml = `
        <h1>Premier Chapitre</h1>
        <p>Texte du premier chapitre avec <strong>du gras</strong> et <em>de l'italique</em>.</p>
        <h2>Deuxième Chapitre</h2>
        <p>Texte du deuxième chapitre avec <u>du souligné</u> et <del>du barré</del>.</p>
        <ul><li>Item 1</li><li>Item 2</li></ul>
      `;

      const chapters = splitHtmlIntoChapters(sampleHtml, 'Titre par défaut');

      expect(chapters.length).toBe(2);
      expect(chapters[0].title).toBe('Premier Chapitre');
      expect(chapters[0].content).toContain('Premier Chapitre');
      expect(chapters[0].content).toContain('<strong>du gras</strong>');
      expect(chapters[0].content).toContain('<em>de l\'italique</em>');

      expect(chapters[1].title).toBe('Deuxième Chapitre');
      expect(chapters[1].content).toContain('Deuxième Chapitre');
      expect(chapters[1].content).toContain('<u>du souligné</u>');
      expect(chapters[1].content).toContain('<del>du barré</del>');
      expect(chapters[1].content).toContain('<ul>');
    });

    test('returns single chapter fallback when no H1/H2 tags present', () => {
      const sampleHtml = `<p>Un paragraphe simple sans titre.</p><p>Un autre paragraphe.</p>`;
      const chapters = splitHtmlIntoChapters(sampleHtml, 'Mon Manuscrit');

      expect(chapters.length).toBe(1);
      expect(chapters[0].title).toBe('Mon Manuscrit');
      expect(chapters[0].content).toBe(sampleHtml);
    });

    test('handles empty input gracefully', () => {
      const chapters = splitHtmlIntoChapters('', 'Vide');
      expect(chapters.length).toBe(1);
      expect(chapters[0].title).toBe('Vide');
      expect(chapters[0].content).toBe('');
    });

    test('preserves semantic HTML tags (headings, paragraphs, inline styles, blockquotes, images)', () => {
      const sampleHtml = `
        <h1>Chapitre Unique</h1>
        <p>Paragraphe standard avec <a href="https://example.com">lien</a></p>
        <blockquote>Citation importante</blockquote>
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test"/>
      `;
      const chapters = splitHtmlIntoChapters(sampleHtml, 'Test');
      expect(chapters.length).toBe(1);
      expect(chapters[0].content).toContain('<blockquote>Citation importante</blockquote>');
      expect(chapters[0].content).toContain('<a href="https://example.com">lien</a>');
      expect(chapters[0].content).toContain('<img');
    });
  });

  describe('epubParser - parseEpubFile', () => {
    test('parses EPUB archive, extracts OPF manifest/spine in order, and resolves images', async () => {
      const zip = new JSZip();

      // META-INF/container.xml
      zip.file(
        'META-INF/container.xml',
        `<?xml version="1.0"?>
        <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
          <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
          </rootfiles>
        </container>`
      );

      // OEBPS/content.opf
      zip.file(
        'OEBPS/content.opf',
        `<?xml version="1.0" encoding="utf-8"?>
        <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
          <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
            <dc:title>Roman fantastique</dc:title>
          </metadata>
          <manifest>
            <item id="c1" href="chap1.xhtml" media-type="application/xhtml+xml"/>
            <item id="c2" href="chap2.xhtml" media-type="application/xhtml+xml"/>
            <item id="img1" href="images/illustration.png" media-type="image/png"/>
          </manifest>
          <spine>
            <itemref idref="c1"/>
            <itemref idref="c2"/>
          </spine>
        </package>`
      );

      // OEBPS/chap1.xhtml
      zip.file(
        'OEBPS/chap1.xhtml',
        `<!DOCTYPE html>
        <html>
        <head><title>Introduction</title></head>
        <body>
          <h1>Chapitre 1 : L'éveil</h1>
          <p>Le jour se lève.</p>
          <img src="images/illustration.png" alt="illustration"/>
        </body>
        </html>`
      );

      // OEBPS/chap2.xhtml
      zip.file(
        'OEBPS/chap2.xhtml',
        `<!DOCTYPE html>
        <html>
        <head><title>La suite</title></head>
        <body>
          <h2>Chapitre 2 : La forêt</h2>
          <p>Ils entrèrent dans la forêt sombre.</p>
        </body>
        </html>`
      );

      // Image binary
      const dummyImageBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      zip.file('OEBPS/images/illustration.png', dummyImageBuffer);

      const epubBlob = await zip.generateAsync({ type: 'blob' });
      const epubFile = new File([epubBlob], 'roman.epub', { type: 'application/epub+zip' });

      const result = await parseEpubFile(epubFile);

      expect(result.title).toBe('Roman fantastique');
      expect(result.chaptersFromSpine.length).toBe(2);
      expect(result.chaptersFromSpine[0].title).toBe("Chapitre 1 : L'éveil");
      expect(result.chaptersFromSpine[1].title).toBe('Chapitre 2 : La forêt');
      expect(result.html).toContain('data:image/png;base64,iVBORw0KGgo=');
    });
  });

  describe('docxParser - parseDocxFile', () => {
    test('parses docx arrayBuffer to HTML with mammoth', async () => {
      // Create a minimal valid docx file using JSZip
      const zip = new JSZip();
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="xml" ContentType="application/xml"/>
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
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
        'word/document.xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p>
              <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
              <w:r><w:t>Mon Titre Docx</w:t></w:r>
            </w:p>
            <w:p>
              <w:r><w:t>Mon paragraphe de test.</w:t></w:r>
            </w:p>
          </w:body>
        </w:document>`
      );

      const docxBlob = await zip.generateAsync({ type: 'blob' });
      const docxFile = new File([docxBlob], 'mon_document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const result = await parseDocxFile(docxFile);

      expect(result.title).toBe('mon_document');
      expect(result.html).toContain('<h1>Mon Titre Docx</h1>');
      expect(result.html).toContain('<p>Mon paragraphe de test.</p>');
    });
  });

  describe('parseManuscriptFile - Unified entry point', () => {
    test('routes .docx files and splits into chapters when requested', async () => {
      const zip = new JSZip();
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="xml" ContentType="application/xml"/>
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
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
        'word/document.xml',
        `<?xml version="1.0" encoding="UTF-8"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p>
              <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
              <w:r><w:t>Chapitre I</w:t></w:r>
            </w:p>
            <w:p><w:r><w:t>Contenu 1</w:t></w:r></w:p>
            <w:p>
              <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
              <w:r><w:t>Chapitre II</w:t></w:r>
            </w:p>
            <w:p><w:r><w:t>Contenu 2</w:t></w:r></w:p>
          </w:body>
        </w:document>`
      );

      const docxBlob = await zip.generateAsync({ type: 'blob' });
      const docxFile = new File([docxBlob], 'livre.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const chapters = await parseManuscriptFile(docxFile, { splitByChapter: true });

      expect(chapters.length).toBe(2);
      expect(chapters[0].title).toBe('Chapitre I');
      expect(chapters[1].title).toBe('Chapitre II');
    });

    test('throws error for unsupported file formats', async () => {
      const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      await expect(parseManuscriptFile(pdfFile, { splitByChapter: true })).rejects.toThrow(
        'Format de fichier non supporté'
      );
    });
  });
});
