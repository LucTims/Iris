import JSZip from 'jszip';
import { splitHtmlIntoChapters, ParsedChapter } from '../chapterSplitter';
import { parseDocxFile } from '../docxParser';
import { parseEpubFile } from '../epubParser';
import { parseManuscriptFile } from '../index';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function runTest(category: string, name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    const res = fn();
    if (res && typeof (res as Promise<void>).then === 'function') {
      return (res as Promise<void>)
        .then(() => {
          const duration = performance.now() - start;
          results.push({ category, name, passed: true, durationMs: duration });
        })
        .catch((err) => {
          const duration = performance.now() - start;
          results.push({
            category,
            name,
            passed: false,
            durationMs: duration,
            error: err instanceof Error ? err.message : String(err)
          });
        });
    } else {
      const duration = performance.now() - start;
      results.push({ category, name, passed: true, durationMs: duration });
      return Promise.resolve();
    }
  } catch (err) {
    const duration = performance.now() - start;
    results.push({
      category,
      name,
      passed: false,
      durationMs: duration,
      error: err instanceof Error ? err.message : String(err)
    });
    return Promise.resolve();
  }
}

async function main() {
  console.log('====================================================');
  console.log('  PARSER & CHAPTER SPLITTER STRESS TEST SUITE      ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // 1. EMPTY STRINGS & EDGE-CASE INPUTS
  // ----------------------------------------------------
  await runTest('Empty & Edge Inputs', 'Empty string input', () => {
    const chapters = splitHtmlIntoChapters('', 'Default');
    if (chapters.length !== 1) throw new Error(`Expected 1 chapter, got ${chapters.length}`);
    if (chapters[0].title !== 'Default') throw new Error(`Expected title 'Default', got '${chapters[0].title}'`);
    if (chapters[0].content !== '') throw new Error(`Expected content '', got '${chapters[0].content}'`);
  });

  await runTest('Empty & Edge Inputs', 'Whitespace-only input', () => {
    const chapters = splitHtmlIntoChapters('   \n\t  ', 'Default');
    if (chapters.length !== 1) throw new Error(`Expected 1 chapter, got ${chapters.length}`);
    if (chapters[0].title !== 'Default') throw new Error(`Expected title 'Default', got '${chapters[0].title}'`);
    if (chapters[0].content !== '') throw new Error(`Expected content '', got '${chapters[0].content}'`);
  });

  await runTest('Empty & Edge Inputs', 'Empty tags input (<div></div>)', () => {
    const chapters = splitHtmlIntoChapters('<div></div>', 'Default');
    if (chapters.length !== 1) throw new Error(`Expected 1 chapter, got ${chapters.length}`);
    if (chapters[0].title !== 'Default') throw new Error(`Expected title 'Default'`);
  });

  await runTest('Empty & Edge Inputs', 'Self-closing / single standalone tags (<br/>, <hr/>)', () => {
    const chapters = splitHtmlIntoChapters('<br/><hr/>', 'Default');
    if (chapters.length !== 1) throw new Error(`Expected 1 chapter, got ${chapters.length}`);
  });

  // ----------------------------------------------------
  // 2. MALFORMED HTML
  // ----------------------------------------------------
  await runTest('Malformed HTML', 'Unclosed tags', () => {
    const malformed = '<h1>Titre non fermé<p>Paragraphe ouvert<div>Autre bloc';
    const chapters = splitHtmlIntoChapters(malformed, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  await runTest('Malformed HTML', 'Mismatched / weirdly nested inline tags', () => {
    const malformed = '<h1>Titre <b>Gras</h1> non fermé</b><p>Texte <i>italique<b>gras</i></b></p>';
    const chapters = splitHtmlIntoChapters(malformed, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  await runTest('Malformed HTML', 'Raw text without HTML tags', () => {
    const rawText = 'Ceci est un manuscrit en texte brut sans aucune balise HTML.';
    const chapters = splitHtmlIntoChapters(rawText, 'Manuscrit Brut');
    if (chapters.length !== 1) throw new Error(`Expected 1 chapter, got ${chapters.length}`);
    if (chapters[0].title !== 'Manuscrit Brut') throw new Error(`Expected title 'Manuscrit Brut'`);
    if (!chapters[0].content.includes('Ceci est un manuscrit')) {
      throw new Error(`Content lost: ${chapters[0].content}`);
    }
  });

  await runTest('Malformed HTML', 'XML comments, processing instructions & DOCTYPE', () => {
    const html = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><!-- Commentaire test --><h1>Titre Valide</h1><p>Contenu</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
    if (chapters[0].title !== 'Titre Valide') throw new Error(`Expected title 'Titre Valide', got '${chapters[0].title}'`);
  });

  await runTest('Malformed HTML', 'Script and Style tags injection', () => {
    const html = `<script>alert('xss')</script><style>body { color: red; }</style><h1>Titre Securise</h1><p>Texte</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  await runTest('Malformed HTML', 'Broken ampersands & unescaped HTML entities', () => {
    const html = `<h1 class="test">Titre & Sous-titre &nbsp &amp; &unknown;</h1><p>A & B < C > D</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  // ----------------------------------------------------
  // 3. DOCUMENTS WITHOUT H1 / H2 HEADINGS
  // ----------------------------------------------------
  await runTest('No H1/H2 Headings', 'Document with H3, H4, H5, H6 headings only', () => {
    const html = `<h3>Sous-titre 3</h3><p>Texte 1</p><h4>Sous-titre 4</h4><p>Texte 2</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback Title');
    if (chapters.length !== 1) throw new Error(`Expected 1 fallback chapter, got ${chapters.length}`);
    if (chapters[0].title !== 'Fallback Title') throw new Error(`Expected fallback title, got '${chapters[0].title}'`);
  });

  await runTest('No H1/H2 Headings', 'Document with paragraphs and lists only', () => {
    const html = `<p>Paragraphe 1</p><ul><li>Item A</li><li>Item B</li></ul><p>Paragraphe 2</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback Title');
    if (chapters.length !== 1) throw new Error(`Expected 1 fallback chapter, got ${chapters.length}`);
    if (chapters[0].title !== 'Fallback Title') throw new Error(`Expected fallback title`);
  });

  // ----------------------------------------------------
  // 4. NESTED H1 / H2 HEADINGS (inside blockquotes, div wrappers, lists)
  // ----------------------------------------------------
  await runTest('Nested H1/H2 Headings', 'H1 nested inside blockquote', () => {
    const html = `<blockquote><h1>Titre Dans Citation</h1><p>Texte citation</p></blockquote><p>Texte apres</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  await runTest('Nested H1/H2 Headings', 'H2 nested inside section/div wrapper', () => {
    const html = `<section><h2>Titre Dans Section</h2><p>Texte de la section</p></section><section><h2>Section 2</h2><p>Texte 2</p></section>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  await runTest('Nested H1/H2 Headings', 'H1 nested inside list item <li>', () => {
    const html = `<ul><li><h1>Titre Dans Liste</h1><p>Contenu liste</p></li></ul>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  await runTest('Nested H1/H2 Headings', 'Mixed root H1 and nested H1 inside blockquote', () => {
    const html = `<h1>Chapitre 1</h1><p>Texte 1</p><blockquote><h1>Citation H1 non chapitre</h1></blockquote><h2>Chapitre 2</h2><p>Texte 2</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length !== 2) {
      throw new Error(`Expected 2 chapters, but got ${chapters.length} (Data Loss Bug)`);
    }
  });

  // ----------------------------------------------------
  // 5. SPECIAL CHARACTERS & ACCENTS IN TITLES
  // ----------------------------------------------------
  await runTest('Special Chars & Accents', 'French accents, ligatures & punctuation', () => {
    const title = "Chapitre 1 : L'Éléphant & la Cœur-de-Lion à l'Œuvre — Théâtre & Poésie (100% Réussi!)";
    const html = `<h1>${title}</h1><p>Texte du chapitre avec accents et caractères spéciaux.</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
    if (chapters[0].title !== title) {
      throw new Error(`Title mismatch.\nExpected: "${title}"\nGot:      "${chapters[0].title}"`);
    }
  });

  await runTest('Special Chars & Accents', 'Unicode, Emojis & Multi-byte scripts', () => {
    const title = 'Chapitre 2 : 🎭 L\'Aventure 🚀 (Глава 1 / 日本語 / 🤖)';
    const html = `<h1>${title}</h1><p>Contenu international.</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
    if (chapters[0].title !== title) {
      throw new Error(`Title mismatch.\nExpected: "${title}"\nGot:      "${chapters[0].title}"`);
    }
  });

  await runTest('Special Chars & Accents', 'Heading with internal formatting tags (strong, em, span)', () => {
    const html = `<h1>Titre <strong>Gras</strong> et <em>Italique</em><span> Style</span></h1><p>Texte</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  await runTest('Special Chars & Accents', 'Heading with newlines and extra spaces inside tag', () => {
    const html = `<h1>\n  Titre avec  \n  retours à la ligne \t\n</h1><p>Texte</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  await runTest('Special Chars & Accents', 'Extremely long heading text (2,000 chars)', () => {
    const longText = 'TitreLong_'.repeat(200);
    const html = `<h1>${longText}</h1><p>Texte</p>`;
    const chapters = splitHtmlIntoChapters(html, 'Fallback');
    if (chapters.length === 0) throw new Error('Expected at least 1 chapter, got 0 (Data Loss Bug)');
  });

  // ----------------------------------------------------
  // 6. DOCX & EPUB PARSER CORRUPT / MALFORMED FILE TESTS
  // ----------------------------------------------------
  await runTest('File Parsers Edge Cases', 'EPUB parser - Corrupt ZIP file', async () => {
    const corruptBlob = new Blob(['Not a valid zip file content'], { type: 'application/epub+zip' });
    const file = new File([corruptBlob], 'corrupt.epub', { type: 'application/epub+zip' });
    try {
      await parseEpubFile(file);
      throw new Error('Expected parseEpubFile to throw on corrupt ZIP');
    } catch (err) {
      if ((err as Error).message.includes('Expected parseEpubFile')) throw err;
    }
  });

  await runTest('File Parsers Edge Cases', 'EPUB parser - Missing container.xml', async () => {
    const zip = new JSZip();
    zip.file('dummy.txt', 'hello');
    const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const file = new File([arrayBuffer], 'missing_container.epub', { type: 'application/epub+zip' });
    try {
      await parseEpubFile(file);
      throw new Error('Expected error for missing container.xml');
    } catch (err) {
      if (!(err as Error).message.includes('container.xml introuvable') && !(err as Error).message.includes('Can\'t read the data')) {
        throw new Error(`Unexpected error message: ${(err as Error).message}`);
      }
    }
  });

  await runTest('File Parsers Edge Cases', 'DOCX parser - Corrupt docx archive', async () => {
    const corruptBlob = new Blob(['Corrupt data'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const file = new File([corruptBlob], 'corrupt.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    try {
      await parseDocxFile(file);
      throw new Error('Expected parseDocxFile to throw on corrupt file');
    } catch (err) {
      if ((err as Error).message.includes('Expected parseDocxFile')) throw err;
    }
  });

  await runTest('File Parsers Edge Cases', 'Unified parser - Unsupported extension (.txt, .pdf)', async () => {
    const file = new File(['hello'], 'doc.txt', { type: 'text/plain' });
    try {
      await parseManuscriptFile(file);
      throw new Error('Expected parseManuscriptFile to throw on unsupported extension');
    } catch (err) {
      if (!(err as Error).message.includes('Format de fichier non supporté')) {
        throw new Error(`Unexpected error message: ${(err as Error).message}`);
      }
    }
  });

  // ----------------------------------------------------
  // 7. MASSIVE HTML PAYLOADS (STRESS & PERFORMANCE)
  // ----------------------------------------------------
  const performanceMetrics: { name: string; sizeKb: number; durationMs: number; memoryMb: number; chapterCount: number }[] = [];

  const testPayloads = [
    { name: '100 KB HTML (10 chapters, 500 paragraphs)', chaptersCount: 10, paragraphsPerChapter: 50 },
    { name: '1 MB HTML (50 chapters, 2,500 paragraphs)', chaptersCount: 50, paragraphsPerChapter: 50 },
    { name: '5 MB HTML (100 chapters, 10,000 paragraphs)', chaptersCount: 100, paragraphsPerChapter: 100 },
    { name: 'Massive 10 MB Base64 Image Payload (5 chapters, huge img src)', chaptersCount: 5, paragraphsPerChapter: 10, includeHugeImages: true }
  ];

  for (const payloadConfig of testPayloads) {
    await runTest('Massive Payloads', payloadConfig.name, () => {
      let htmlBuilder = '';
      const dummyBase64Image = 'data:image/png;base64,' + 'A'.repeat(500000); // ~500 KB base64 string

      for (let i = 1; i <= payloadConfig.chaptersCount; i++) {
        htmlBuilder += `<h1>Chapitre ${i} : Titre du chapitre monumental ${i}</h1>\n`;
        if (payloadConfig.includeHugeImages) {
          htmlBuilder += `<p><img src="${dummyBase64Image}" alt="Huge Image ${i}" /></p>\n`;
        }
        for (let j = 1; j <= payloadConfig.paragraphsPerChapter; j++) {
          htmlBuilder += `<p>Ceci est le paragraphe ${j} du chapitre ${i}. Contenu avec <strong>du texte en gras</strong>, <em>de l'italique</em>, et des <u>mots soulignés</u> pour simuler un manuscrit réaliste.</p>\n`;
        }
      }

      const payloadSizeKb = Math.round(Buffer.byteLength(htmlBuilder, 'utf8') / 1024);
      const memBefore = process.memoryUsage().heapUsed;
      const startTime = performance.now();

      const chapters = splitHtmlIntoChapters(htmlBuilder, 'Fallback');

      const endTime = performance.now();
      const memAfter = process.memoryUsage().heapUsed;
      const durationMs = endTime - startTime;
      const memDeltaMb = Math.round(((memAfter - memBefore) / (1024 * 1024)) * 100) / 100;

      performanceMetrics.push({
        name: payloadConfig.name,
        sizeKb: payloadSizeKb,
        durationMs: Math.round(durationMs * 100) / 100,
        memoryMb: memDeltaMb,
        chapterCount: chapters.length
      });

      if (chapters.length !== payloadConfig.chaptersCount) {
        throw new Error(`Expected ${payloadConfig.chaptersCount} chapters, got ${chapters.length} (Data Loss Bug)`);
      }
    });
  }

  // ----------------------------------------------------
  // REPORTING & SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('  STRESS TEST RESULTS SUMMARY                       ');
  console.log('====================================================\n');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalCount = results.length;

  const categories = Array.from(new Set(results.map(r => r.category)));

  for (const cat of categories) {
    console.log(`\n--- Category: ${cat} ---`);
    const catResults = results.filter(r => r.category === cat);
    for (const r of catResults) {
      const status = r.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  [${status}] ${r.name} (${r.durationMs.toFixed(2)} ms)`);
      if (!r.passed) {
        console.log(`         Error: ${r.error}`);
      }
    }
  }

  console.log('\n----------------------------------------------------');
  console.log('  PERFORMANCE METRICS FOR MASSIVE PAYLOADS         ');
  console.log('----------------------------------------------------');
  for (const m of performanceMetrics) {
    console.log(`- ${m.name}:`);
    console.log(`    Payload Size: ${m.sizeKb} KB`);
    console.log(`    Execution Time: ${m.durationMs} ms`);
    console.log(`    Memory Delta: ${m.memoryMb} MB`);
    console.log(`    Chapters Produced: ${m.chapterCount}`);
  }

  console.log('\n====================================================');
  console.log(`  TOTAL: ${totalCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    console.log('❌ STRESS TEST SUITE DETECTED FAILURES OR EDGE-CASE DEFECTS.');
    process.exitCode = 1;
  } else {
    console.log('✅ ALL STRESS TESTS PASSED SUCCESSFULLY.');
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('Unhandled exception in stress test suite:', err);
  process.exit(1);
});
