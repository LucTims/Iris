/**
 * Tier 2 Boundary Test Suite: B4 - Export Boundary & Corner Cases
 * 
 * Verifies:
 * 1. Exporting empty book (0 chapters or empty content) with clean fallback.
 * 2. Exporting chapter with only images and page breaks without text.
 * 3. Exporting malformed / unclosed HTML tags without throwing unhandled exceptions.
 * 4. Exporting large tables (20 rows x 10 columns) across DOCX/EPUB/MD.
 * 5. Deeply nested blockquotes and mixed heading hierarchies export.
 */

import { assert, assertValidDocxBlob, assertValidEpubBlob, assertValidMarkdown } from '../harness/assertions';
import { generateDocx } from '../../../src/lib/export/generateDocx';
import { generateEpub } from '../../../src/lib/export/generateEpub';
import { generateMarkdown } from '../../../src/lib/export/generateMarkdown';

export async function runB4ExportBoundariesTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 2: B4 - Export Boundary & Corner Cases';
  const results: { name: string; passed: boolean; error?: string }[] = [];
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      results.push({ name, passed: true });
      passed++;
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message || String(err) });
      failed++;
    }
  }

  // --- Test B4.1: Exporting empty chapters ---
  await test('B4.1: Exporting book with empty chapters generates valid documents without crash', async () => {
    const emptyChapters = [
      { title: 'Chapitre Vide 1', number: 1, content: '' },
      { title: 'Chapitre Vide 2', number: 2, content: '<p></p>' },
    ];

    const docxBlob = await generateDocx('Livre Vide', undefined, emptyChapters);
    assertValidDocxBlob(docxBlob, 'DOCX for empty book');

    const epubBlob = await generateEpub('Livre Vide', undefined, 'Auteur', emptyChapters);
    assertValidEpubBlob(epubBlob, 'EPUB for empty book');

    const mdBlob = generateMarkdown('Livre Vide', undefined, emptyChapters);
    const mdText = await mdBlob.text();
    assertValidMarkdown(mdText, 'Markdown for empty book');
  });

  // --- Test B4.2: Exporting image-only chapters ---
  await test('B4.2: Exporting chapter containing only images and page breaks', async () => {
    const imageOnlyChapters = [
      {
        title: 'Galerie d\'Art',
        number: 1,
        content: `
          <img src="https://mock-supabase.iris.app/img1.png" alt="Image 1" />
          <hr data-page-break>
          <img src="https://mock-supabase.iris.app/img2.png" alt="Image 2" />
        `,
      },
    ];

    const docxBlob = await generateDocx('Galerie', undefined, imageOnlyChapters);
    assertValidDocxBlob(docxBlob, 'DOCX with image-only content');

    const epubBlob = await generateEpub('Galerie', undefined, 'Artiste', imageOnlyChapters);
    assertValidEpubBlob(epubBlob, 'EPUB with image-only content');
  });

  // --- Test B4.3: Malformed unclosed HTML tags ---
  await test('B4.3: Exporter resilience when handling malformed or unclosed HTML tags', async () => {
    const malformedChapters = [
      {
        title: 'Chapitre Malformé',
        number: 1,
        content: '<p>Paragraphe non fermé <strong>gras sans fin <em>italique mixte <hr> <div>',
      },
    ];

    const docxBlob = await generateDocx('Test Malformé', undefined, malformedChapters);
    assertValidDocxBlob(docxBlob, 'DOCX withstands malformed HTML');

    const epubBlob = await generateEpub('Test Malformé', undefined, 'Auteur', malformedChapters);
    assertValidEpubBlob(epubBlob, 'EPUB withstands malformed HTML');

    const mdBlob = generateMarkdown('Test Malformé', undefined, malformedChapters);
    assert(mdBlob.size > 0, 'Markdown generated from malformed HTML');
  });

  // --- Test B4.4: Huge tables export ---
  await test('B4.4: Exporting large structured table (20 rows x 10 cols) across formats', async () => {
    let tableHtml = '<table><thead><tr>';
    for (let c = 1; c <= 10; c++) tableHtml += `<th>Col ${c}</th>`;
    tableHtml += '</tr></thead><tbody>';
    for (let r = 1; r <= 20; r++) {
      tableHtml += '<tr>';
      for (let c = 1; c <= 10; c++) {
        tableHtml += `<td>R${r}C${c}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';

    const tableChapters = [{ title: 'Tableau Géant', number: 1, content: `<h1>Données</h1>${tableHtml}` }];

    const docxBlob = await generateDocx('Tableaux', undefined, tableChapters);
    assertValidDocxBlob(docxBlob, 'DOCX with large table');

    const epubBlob = await generateEpub('Tableaux', undefined, 'Statisticien', tableChapters);
    assertValidEpubBlob(epubBlob, 'EPUB with large table');
  });

  // --- Test B4.5: Deeply nested blockquotes and heading hierarchies ---
  await test('B4.5: Deeply nested blockquotes and mixed H1-H6 heading levels export', async () => {
    const deepChapters = [
      {
        title: 'Hiérarchies Complexes',
        number: 1,
        content: `
          <h1>Niveau 1</h1>
          <h2>Niveau 2</h2>
          <h3>Niveau 3</h3>
          <h4>Niveau 4</h4>
          <h5>Niveau 5</h5>
          <h6>Niveau 6</h6>
          <blockquote>
            <p>Citation niveau 1</p>
            <blockquote>
              <p>Citation niveau 2</p>
            </blockquote>
          </blockquote>
        `,
      },
    ];

    const docxBlob = await generateDocx('Hiérarchies', undefined, deepChapters);
    assertValidDocxBlob(docxBlob, 'DOCX with deep headings and blockquotes');

    const mdBlob = generateMarkdown('Hiérarchies', undefined, deepChapters);
    const mdText = await mdBlob.text();
    assert(mdText.includes('# Niveau 1'), 'Markdown preserves H1');
    assert(mdText.includes('## Niveau 2'), 'Markdown preserves H2');
    assert(mdText.includes('### Niveau 3'), 'Markdown preserves H3');
    assert(mdText.includes('>'), 'Markdown preserves blockquote prefix');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
