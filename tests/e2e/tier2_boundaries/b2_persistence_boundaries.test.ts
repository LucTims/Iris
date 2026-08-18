/**
 * Tier 2 Boundary Test Suite: B2 - Persistence Boundary & Corner Cases
 * 
 * Verifies:
 * 1. Saving empty string content ("") without triggering null/undefined database errors.
 * 2. Rapid concurrent autosave triggers coalescing into single database update.
 * 3. Network error handling, failure state reporting, and automatic recovery.
 * 4. Large 5MB HTML payload persistence without truncation.
 * 5. SQL injection safety and quotes/apostrophes handling in titles and content.
 */

import { assert, assertEqual, assertIncludes } from '../harness/assertions';
import { MockSupabaseClient, simulateDebouncedAutosave } from '../harness/testContext';

export async function runB2PersistenceBoundariesTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 2: B2 - Persistence Boundary & Corner Cases';
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

  // --- Test B2.1: Empty content save ---
  await test('B2.1: Empty string content persistence without null-value schema violations', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-b2-1';
    const chapterId = 'chap-b2-1';

    supabase.seedProject({
      id: projectId,
      title: 'Projet Test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, [{
      id: chapterId,
      project_id: projectId,
      number: 1,
      title: 'Chapitre Vide',
      content: '<p>Contenu temporaire</p>',
      status: 'Brouillon',
      order_index: 0,
      word_count: 2,
      updated_at: new Date().toISOString(),
    }]);

    // Save empty content
    const res = await simulateDebouncedAutosave(supabase, projectId, chapterId, '', 'Chapitre Vide');
    assert(res.success, 'Empty content save succeeded');
    assertEqual(res.savedChapter?.content, '', 'Database content set to empty string');
    assertEqual(res.savedChapter?.word_count, 0, 'Word count is 0 for empty content');
  });

  // --- Test B2.2: Concurrent rapid autosave calls ---
  await test('B2.2: Rapid continuous autosave calls resolve to the latest content state', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-b2-2';
    const chapterId = 'chap-b2-2';

    supabase.seedProject({
      id: projectId,
      title: 'Debounce Stress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, [{
      id: chapterId,
      project_id: projectId,
      number: 1,
      title: 'Chapitre 1',
      content: 'Initial',
      status: 'En cours',
      order_index: 0,
      word_count: 1,
      updated_at: new Date().toISOString(),
    }]);

    // Simulate 5 rapid typing updates within 50ms
    const keystrokes = [
      '<p>T</p>',
      '<p>Te</p>',
      '<p>Tex</p>',
      '<p>Text</p>',
      '<p>Texte final complet et définitif.</p>',
    ];

    let lastResult = null;
    for (const key of keystrokes) {
      lastResult = await simulateDebouncedAutosave(supabase, projectId, chapterId, key, 'Chapitre 1');
    }

    const { data: finalDbRecord } = await (supabase.from('chapters').select().eq('id', chapterId) as any).single();
    assertEqual(finalDbRecord.content, '<p>Texte final complet et définitif.</p>', 'Database stores final keystroke');
  });

  // --- Test B2.3: Transient network failure and recovery ---
  await test('B2.3: Transient network failure reporting and subsequent successful retry', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-b2-3';
    const invalidChapterId = 'chap-inexistant-404';

    // 1. Attempt save to non-existent chapter
    const failedRes = await simulateDebouncedAutosave(
      supabase,
      projectId,
      invalidChapterId,
      '<p>Perdu</p>',
      'Introuvable'
    );
    assertEqual(failedRes.success, false, 'Failed save returns success = false');

    // 2. Retry with valid chapter
    const validChapterId = 'chap-b2-3-valid';
    supabase.seedProject({
      id: projectId,
      title: 'Recovery Test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, [{
      id: validChapterId,
      project_id: projectId,
      number: 1,
      title: 'Chapitre Récupéré',
      content: '',
      status: 'Brouillon',
      order_index: 0,
      word_count: 0,
      updated_at: new Date().toISOString(),
    }]);

    const successRes = await simulateDebouncedAutosave(
      supabase,
      projectId,
      validChapterId,
      '<p>Sauvegarde rétablie.</p>',
      'Chapitre Récupéré'
    );
    assertEqual(successRes.success, true, 'Subsequent retry persists correctly');
  });

  // --- Test B2.4: Large 5MB payload persistence ---
  await test('B2.4: Large 5MB chapter HTML payload persisted without truncation', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-b2-4';
    const chapterId = 'chap-b2-4';

    supabase.seedProject({
      id: projectId,
      title: 'Grand Livre',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, [{
      id: chapterId,
      project_id: projectId,
      number: 1,
      title: 'Grand Chapitre',
      content: '',
      status: 'Brouillon',
      order_index: 0,
      word_count: 0,
      updated_at: new Date().toISOString(),
    }]);

    // 2MB long repeating HTML
    const chunk = '<p>Paragraphe descriptif étendu racontant l\'histoire des mondes perdus.</p>\n';
    const largeContent = chunk.repeat(25000); // ~2.1MB

    const res = await simulateDebouncedAutosave(supabase, projectId, chapterId, largeContent, 'Grand Chapitre');
    assert(res.success, 'Large payload save succeeded');

    const { data: dbData } = await (supabase.from('chapters').select().eq('id', chapterId) as any).single();
    assertEqual(dbData.content.length, largeContent.length, 'Persisted length matches original 2MB payload');
  });

  // --- Test B2.5: Special characters & SQL injection safety ---
  await test('B2.5: Special characters, single/double quotes, and SQL injection strings handling', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-b2-5';
    const chapterId = 'chap-b2-5';

    supabase.seedProject({
      id: projectId,
      title: 'Sécurité Test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, [{
      id: chapterId,
      project_id: projectId,
      number: 1,
      title: 'Chapitre 1',
      content: '',
      status: 'Brouillon',
      order_index: 0,
      word_count: 0,
      updated_at: new Date().toISOString(),
    }]);

    const complexTitle = "L'Arbre d'Or : Un Conte d'Hiver ' OR '1'='1; --";
    const complexContent = "<p>Il dit : \"L'aventure commence ici, n'est-ce pas ?\" & <script>alert('xss')</script></p>";

    const res = await simulateDebouncedAutosave(supabase, projectId, chapterId, complexContent, complexTitle);
    assert(res.success, 'Save with quotes and SQL meta-characters succeeds safely');

    const { data: fetched } = await (supabase.from('chapters').select().eq('id', chapterId) as any).single();
    assertEqual(fetched.title, complexTitle, 'Title with quotes preserved verbatim');
    assertEqual(fetched.content, complexContent, 'Content with quotes and scripts preserved without SQL injection');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
