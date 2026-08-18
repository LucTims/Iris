/**
 * Tier 1 Feature Test Suite: F2 - Supabase Database Persistence & Autosave
 * 
 * Verifies:
 * 1. Chapter HTML content persistence in Supabase `chapters` table.
 * 2. Debounced autosave (1.5s) cycle preventing redundant updates.
 * 3. Multi-chapter CRUD and order_index management.
 * 4. Project `updated_at` synchronization on chapter modification.
 * 5. Chapter state recovery across simulated reload / empty initial states.
 */

import { assert, assertEqual, assertIncludes } from '../harness/assertions';
import { MockSupabaseClient, simulateDebouncedAutosave, TestProject, TestChapter } from '../harness/testContext';

export async function runF2SupabasePersistenceTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 1: F2 - Supabase Database Persistence & Autosave';
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

  // --- Test 2.1: Chapter content persistence in Supabase ---
  await test('F2.1: Supabase chapter HTML storage and retrieval fidelity', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f2-1';
    const chapterId = 'chap-f2-1';

    const initialProject: TestProject = {
      id: projectId,
      title: 'Les Mystères du Nil',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const initialChapter: TestChapter = {
      id: chapterId,
      project_id: projectId,
      number: 1,
      title: 'Chapitre 1 : Les Rives Dorées',
      content: '<p>Au crépuscule, le fleuve coulait paisiblement.</p>',
      status: 'En cours',
      order_index: 0,
      word_count: 7,
      updated_at: new Date().toISOString(),
    };

    supabase.seedProject(initialProject, [initialChapter]);

    // Update chapter content
    const updatedHtml = '<h1>Chapitre 1 : Les Rives Dorées</h1><p>Au crépuscule, le fleuve coulait paisiblement sous les étoiles d\'Alexandrie.</p>';
    const { data: savedChap, error } = await (supabase
      .from('chapters')
      .update({ content: updatedHtml, word_count: 12 }) as any)
      .eq('id', chapterId)
      .eq('project_id', projectId)
      .select()
      .single();

    assert(!error, 'Database update must succeed without error');
    assertEqual(savedChap.content, updatedHtml, 'Saved chapter HTML matches updated payload');

    // Fetch back from database
    const { data: fetchedChap } = await (supabase.from('chapters').select().eq('id', chapterId) as any).single();
    assertEqual(fetchedChap.content, updatedHtml, 'Fetched chapter HTML reflects updated database record');
  });

  // --- Test 2.2: Debounced autosave (1.5s) ---
  await test('F2.2: Debounced autosave helper persisting chapter HTML to Supabase', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f2-2';
    const chapterId = 'chap-f2-2';

    supabase.seedProject({
      id: projectId,
      title: 'Chroniques du Désert',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, [{
      id: chapterId,
      project_id: projectId,
      number: 1,
      title: 'Chapitre 1',
      content: '<p>Début...</p>',
      status: 'Brouillon',
      order_index: 0,
      word_count: 1,
      updated_at: new Date().toISOString(),
    }]);

    const newContent = '<p>Le vent soufflait sur les dunes dorées du Sahara infini.</p>';
    const result = await simulateDebouncedAutosave(
      supabase,
      projectId,
      chapterId,
      newContent,
      'Chapitre 1 : Le Vent du Sahara',
      1500
    );

    assert(result.success, 'Autosave cycle must complete successfully');
    assertEqual(result.savedChapter?.content, newContent, 'Autosave updates chapter content');
    assertEqual(result.savedChapter?.title, 'Chapitre 1 : Le Vent du Sahara', 'Autosave updates chapter title');
    assertEqual(result.savedChapter?.word_count, 10, 'Autosave recalculates word count accurately');
  });

  // --- Test 2.3: Multi-chapter CRUD and order_index management ---
  await test('F2.3: Multi-chapter creation, reordering, and deletion in Supabase schema', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f2-3';

    supabase.seedProject({
      id: projectId,
      title: 'Trilogie Stellaire',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Create 3 chapters
    const { data: ch1 } = await supabase.from('chapters').insert({
      project_id: projectId,
      number: 1,
      title: 'Chapitre 1 : Vers l\'Inconnu',
      content: '<p>Départ de la Terre.</p>',
      order_index: 0,
    });
    const { data: ch2 } = await supabase.from('chapters').insert({
      project_id: projectId,
      number: 2,
      title: 'Chapitre 2 : La Nébuleuse',
      content: '<p>Traversée cosmique.</p>',
      order_index: 1,
    });
    const { data: ch3 } = await supabase.from('chapters').insert({
      project_id: projectId,
      number: 3,
      title: 'Chapitre 3 : Le Nouveau Monde',
      content: '<p>Atterrissage réussi.</p>',
      order_index: 2,
    });

    assertEqual(supabase.chapters.size, 3, 'All 3 chapters stored in database');

    // Reorder chapters (swap ch1 and ch2)
    await (supabase.from('chapters').update({ order_index: 1 }) as any).eq('id', ch1.id);
    await (supabase.from('chapters').update({ order_index: 0 }) as any).eq('id', ch2.id);

    const { data: reorderedCh1 } = await (supabase.from('chapters').select().eq('id', ch1.id) as any).single();
    const { data: reorderedCh2 } = await (supabase.from('chapters').select().eq('id', ch2.id) as any).single();
    assertEqual(reorderedCh1.order_index, 1, 'Chapter 1 new order_index is 1');
    assertEqual(reorderedCh2.order_index, 0, 'Chapter 2 new order_index is 0');

    // Delete chapter 3
    await supabase.from('chapters').delete().eq('id', ch3.id);
    assertEqual(supabase.chapters.size, 2, 'Chapter 3 successfully deleted from Supabase');
  });

  // --- Test 2.4: Project updated_at synchronization ---
  await test('F2.4: Updating chapter content refreshes parent project updated_at timestamp', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f2-4';
    const chapterId = 'chap-f2-4';
    const oldTimestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

    supabase.seedProject({
      id: projectId,
      title: 'Horodatage Test',
      created_at: oldTimestamp,
      updated_at: oldTimestamp,
    }, [{
      id: chapterId,
      project_id: projectId,
      number: 1,
      title: 'Chapitre 1',
      content: '<p>Ancien texte.</p>',
      status: 'En cours',
      order_index: 0,
      word_count: 2,
      updated_at: oldTimestamp,
    }]);

    await simulateDebouncedAutosave(supabase, projectId, chapterId, '<p>Nouveau texte rafraîchi.</p>', 'Chapitre 1');

    const { data: updatedProject } = await (supabase.from('projects').select().eq('id', projectId) as any).single();
    assert(updatedProject.updated_at > oldTimestamp, 'Project updated_at timestamp was refreshed');
  });

  // --- Test 2.5: Chapter recovery across reloads & empty initial states ---
  await test('F2.5: Empty chapter initialization and state recovery after full reload', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f2-5';
    const chapterId = 'chap-f2-5';

    // New project with empty chapter content ("")
    supabase.seedProject({
      id: projectId,
      title: 'Projet Tout Neuf',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, [{
      id: chapterId,
      project_id: projectId,
      number: 1,
      title: 'Chapitre 1',
      content: '', // Empty string
      status: 'Brouillon',
      order_index: 0,
      word_count: 0,
      updated_at: new Date().toISOString(),
    }]);

    const { data: loadedChap } = await (supabase.from('chapters').select().eq('id', chapterId) as any).single();
    assertEqual(loadedChap.content, '', 'Empty chapter content safely loaded without null pointer');

    // Simulate user typing their first paragraph
    const userFirstParagraph = '<p>Il était une fois dans un pays lointain.</p>';
    await simulateDebouncedAutosave(supabase, projectId, chapterId, userFirstParagraph, 'Chapitre 1');

    // Simulate page reload
    const { data: reloadedChap } = await (supabase.from('chapters').select().eq('id', chapterId) as any).single();
    assertEqual(reloadedChap.content, userFirstParagraph, 'Persisted content restored perfectly after page reload');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
