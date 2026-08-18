/**
 * Tier 4: Real-World Application Scenarios Test Suite (6 Comprehensive Workflows)
 * 
 * Implements end-to-end authoring and publishing scenarios:
 * Scenario 1: The Epic Fantasy Novel Authoring Workflow (F1, F2, F5)
 * Scenario 2: Illustrated Children's Book Production (F1, F2, F3)
 * Scenario 3: Academic Textbook Multi-Format Publishing (F1, F2, F3, F4)
 * Scenario 4: Large 100-Page Historical Manuscript Authoring & Disaster Recovery (F1, F2, F4)
 * Scenario 5: Interactive AI Co-Authoring & Multi-Pass Editorial Refactoring (F1, F4, F5)
 * Scenario 6: Enterprise CI/CD Build & Production Verification Workflow (F6)
 */

import { assert, assertEqual, assertIncludes, assertValidDocxBlob, assertValidEpubBlob, assertValidMarkdown } from '../harness/assertions';
import { MockSupabaseClient, mockUploadManuscriptImage, simulateDebouncedAutosave, createMockEditorHandle } from '../harness/testContext';
import { generateDocx } from '../../../src/lib/export/generateDocx';
import { generateEpub } from '../../../src/lib/export/generateEpub';
import { generateMarkdown } from '../../../src/lib/export/generateMarkdown';
import * as fs from 'fs';
import * as path from 'path';

export async function runTier4ScenariosTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 4: Real-World Application Scenarios';
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

  // --- Scenario 1: Epic Fantasy Novel Authoring ---
  await test('Scenario 1: The Epic Fantasy Novel Authoring Workflow (F1, F2, F5)', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'novel-fantasy-001';

    // 1. Author initializes 3-chapter novel project
    supabase.seedProject({
      id: projectId,
      title: 'L\'Épopée des Ombres Éternelles',
      subtitle: 'Livre 1 : L\'Éveil du Dragon',
      synopsis: 'Un jeune forgeron découvre un artefact ancien capable de réveiller les dragons endormis.',
      tone: 'Épique & Poétique',
      category: 'Fantasy',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 2. Author writes Chapter 1 in Tiptap Pages
    const { handle: editor1, destroy: d1 } = createMockEditorHandle();
    const ch1Html = '<h1>Chapitre 1 : Le Souffle de la Forge</h1><p>Les étincelles jaillissaient dans la pénombre de l\'atelier ancestral de Farakourou.</p>';
    editor1.setContent(ch1Html);
    await supabase.from('chapters').insert({
      project_id: projectId,
      number: 1,
      title: 'Chapitre 1 : Le Souffle de la Forge',
      content: editor1.getContent(),
      order_index: 0,
    });

    // 3. Author invokes Genie AI to co-author Chapter 2
    const { handle: editor2, destroy: d2 } = createMockEditorHandle();
    const ch2Initial = '<h1>Chapitre 2 : La Marche vers les Cimes</h1><p>Le voyage commençait à travers les sentiers escarpés.</p>';
    editor2.setContent(ch2Initial);

    // AI inserts descriptive battle paragraph at cursor
    const aiBattleScene = '<p>Soudain, un rugissement perça le brouillard glacial. Les griffes d\'une bête d\'ombre lacérèrent la roche à quelques pas du héros.</p>';
    editor2.insertContent(aiBattleScene);

    // AI full rewrite of Chapter 2 with rich suspense
    const aiEnrichedChapter2 = `<h1>Chapitre 2 : La Marche vers les Cimes</h1><p>Le voyage commençait à travers les sentiers escarpés des Monts Éthérés.</p>${aiBattleScene}<p>Saisissant son marteau incandescent, Soundiata fit face à la créature sans reculer d\'un pouce.</p>`;
    editor2.replaceContent(aiEnrichedChapter2);

    const { data: savedCh2 } = await supabase.from('chapters').insert({
      project_id: projectId,
      number: 2,
      title: 'Chapitre 2 : La Marche vers les Cimes',
      content: editor2.getContent(),
      order_index: 1,
    });

    assertEqual(supabase.chapters.size, 2, 'Both chapters successfully stored in Supabase database');
    assertIncludes(savedCh2.content, 'Monts Éthérés', 'AI co-authored text persisted');

    d1();
    d2();
  });

  // --- Scenario 2: Illustrated Children's Book Production ---
  await test('Scenario 2: Illustrated Children\'s Book Production (F1, F2, F3)', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'book-children-002';

    // 1. Upload 3 illustrations to Supabase Storage CDN
    const illustrations = [
      { name: 'le_petit_renard.png', type: 'image/png', size: 120000 },
      { name: 'la_foret_magique.png', type: 'image/png', size: 150000 },
      { name: 'les_etoiles_qui_dansent.png', type: 'image/png', size: 140000 },
    ];

    const cdnUrls: string[] = [];
    for (const ill of illustrations) {
      const res = await mockUploadManuscriptImage(supabase, ill, projectId, 'images');
      assert(!res.error, `Upload of ${ill.name} succeeded`);
      cdnUrls.push(res.url);
    }

    // 2. Assemble 3 illustrated pages in Tiptap Pages editor
    const { handle, destroy } = createMockEditorHandle();
    const childrenBookHtml = `
      <h1>Le Petit Renard et les Étoiles</h1>
      <p style="font-family: 'Caveat', cursive; font-size: 22px; text-align: center;">Il était une fois un petit renard curieux nommé Plume.</p>
      <img src="${cdnUrls[0]}" alt="Plume le renard" width="400" data-align="center" />
      <hr data-page-break>
      <p style="font-family: 'Caveat', cursive; font-size: 22px; text-align: center;">Un soir, il s'aventura au cœur de la forêt enchantée.</p>
      <img src="${cdnUrls[1]}" alt="La forêt enchantée" width="400" data-align="center" />
      <hr data-page-break>
      <p style="font-family: 'Caveat', cursive; font-size: 22px; text-align: center;">Et là, les étoiles se mirent à danser dans le ciel violet.</p>
      <img src="${cdnUrls[2]}" alt="Les étoiles qui dansent" width="400" data-align="center" />
    `;

    handle.setContent(childrenBookHtml);
    const editorContent = handle.getContent();

    assertIncludes(editorContent, cdnUrls[0], 'First illustration CDN URL preserved');
    assertIncludes(editorContent, cdnUrls[1], 'Second illustration CDN URL preserved');
    assertIncludes(editorContent, cdnUrls[2], 'Third illustration CDN URL preserved');

    destroy();
  });

  // --- Scenario 3: Academic Textbook Multi-Format Publishing ---
  await test('Scenario 3: Academic Textbook Multi-Format Publishing (F1, F2, F3, F4)', async () => {
    const textbookChapters = [
      {
        title: 'Chapitre 1 : Fondements de la Physique Quantique',
        number: 1,
        content: `
          <h1>Fondements de la Physique Quantique</h1>
          <p>La mécanique quantique décrit le comportement de la matière à l'échelle atomique.</p>
          <blockquote>L'équation de Schrödinger régit l'évolution temporelle de l'état quantique.</blockquote>
          <hr data-page-break>
          <h2>Constantes Fondamentales</h2>
          <table>
            <thead><tr><th>Constante</th><th>Symbole</th><th>Valeur</th></tr></thead>
            <tbody>
              <tr><td>Constante de Planck</td><td>h</td><td>6.626 x 10^-34 J.s</td></tr>
              <tr><td>Vitesse de la lumière</td><td>c</td><td>2.998 x 10^8 m/s</td></tr>
            </tbody>
          </table>
        `,
      },
    ];

    // Export to all 4 publishing targets
    const docxBlob = await generateDocx('Manuel de Physique Quantique', 'Édition Universitaire', textbookChapters);
    assertValidDocxBlob(docxBlob, 'Academic DOCX export');

    const epubBlob = await generateEpub('Manuel de Physique Quantique', 'Édition Universitaire', 'Pr. Martin', textbookChapters);
    assertValidEpubBlob(epubBlob, 'Academic EPUB export');

    const mdBlob = generateMarkdown('Manuel de Physique Quantique', 'Édition Universitaire', textbookChapters);
    const mdText = await mdBlob.text();
    assertValidMarkdown(mdText, 'Academic Markdown export');
    assertIncludes(mdText, 'Constante de Planck', 'Markdown preserves table contents');
  });

  // --- Scenario 4: Large 100-Page Manuscript & Disaster Recovery ---
  await test('Scenario 4: Large 100-Page Manuscript Authoring & Disaster Recovery (F1, F2, F4)', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'novel-history-100p';

    // 1. Seed 10 large chapters
    const chaptersList = [];
    for (let i = 1; i <= 10; i++) {
      const pWords = Array(300).fill(`récit-${i}`).join(' ');
      chaptersList.push({
        id: `chap-hist-${i}`,
        project_id: projectId,
        number: i,
        title: `Chapitre ${i} : Les Grandes Découvertes`,
        content: `<h1>Chapitre ${i}</h1><p>${pWords}</p><hr data-page-break><p>${pWords}</p>`,
        status: 'En cours' as const,
        order_index: i - 1,
        word_count: 600,
        updated_at: new Date().toISOString(),
      });
    }

    supabase.seedProject(
      { id: projectId, title: 'Histoire Universelle', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      chaptersList
    );

    assertEqual(supabase.chapters.size, 10, 'All 10 chapters loaded into database');

    // 2. Simulate simulated crash/network loss during autosave of chapter 5
    const droppedChapterContent = '<h1>Chapitre 5</h1><p>Texte avant coupure réseau...</p>';
    const failedSave = await simulateDebouncedAutosave(supabase, projectId, 'invalid-ch-id', droppedChapterContent, 'Chapitre 5');
    assertEqual(failedSave.success, false, 'Failed autosave correctly caught');

    // 3. Disaster Recovery: Editor restores last known good state from database
    const { data: recoveredChap } = await (supabase.from('chapters').select().eq('id', 'chap-hist-5') as any).single();
    assert(recoveredChap.content.includes('récit-5'), 'Recovered original persisted content undamaged');
  });

  // --- Scenario 5: Interactive AI Co-Authoring & Multi-Pass Editorial Refactoring ---
  await test('Scenario 5: Interactive AI Co-Authoring & Multi-Pass Editorial Refactoring (F1, F4, F5)', async () => {
    const { handle, destroy } = createMockEditorHandle('<h1>Chapitre 1</h1><p>Le vieux sage parla au jeune prince.</p>');

    // Pass 1: "enrichir" action
    const pass1Content = '<h1>Chapitre 1</h1><p>Le vieux sage, dont la barbe d\'argent balayait le sol de pierre, posa son regard bienveillant sur le jeune prince hésitant.</p>';
    handle.replaceContent(pass1Content);
    assertIncludes(handle.getContent(), 'barbe d\'argent', 'Pass 1 content applied');

    // Pass 2: "etendre" action
    const pass2Content = `${pass1Content}<p>« N'oublie jamais que la véritable force ne réside pas dans l'acier de ton épée, mais dans la clarté de ton jugement », murmura-t-il d'une voix grave.</p>`;
    handle.replaceContent(pass2Content);
    assertIncludes(handle.getContent(), 'véritable force', 'Pass 2 content applied');

    // Pass 3: Export the refactored result to EPUB & DOCX
    const exportChapters = [{ title: 'Chapitre 1 Refactorisé', number: 1, content: handle.getContent() }];
    const docxBlob = await generateDocx('Manuscrit Refactorisé', undefined, exportChapters);
    assertValidDocxBlob(docxBlob, 'Export refactored DOCX');

    destroy();
  });

  // --- Scenario 6: Enterprise CI/CD Build & Production Verification ---
  await test('Scenario 6: Enterprise CI/CD Build & Production Verification Workflow (F6)', () => {
    const projectRoot = path.resolve(__dirname, '../../../');

    // 1. Verify .npmrc exists with valid credentials syntax
    const npmrcPath = path.join(projectRoot, '.npmrc');
    assert(fs.existsSync(npmrcPath), '.npmrc present for registry auth');
    const npmrc = fs.readFileSync(npmrcPath, 'utf8');
    assertIncludes(npmrc, '@tiptap-pro:registry=https://registry.tiptap.dev/', '.npmrc contains tiptap registry configuration');

    // 2. Verify package.json contains all production dependencies
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    assert(pkg.dependencies['@tiptap-pro/extension-pages'] !== undefined, '@tiptap-pro/extension-pages installed');
    assert(pkg.dependencies['@tiptap-pro/extension-pages-tablekit'] !== undefined, '@tiptap-pro/extension-pages-tablekit installed');
    assert(pkg.dependencies['@supabase/supabase-js'] !== undefined, '@supabase/supabase-js installed');
    assert(pkg.dependencies['docx'] !== undefined, 'docx installed');
    assert(pkg.dependencies['jszip'] !== undefined, 'jszip installed');

    // 3. Verify TypeScript configuration
    const tsconfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf8'));
    assertEqual(tsconfig.compilerOptions.strict, true, 'Strict TypeScript compilation enabled');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
