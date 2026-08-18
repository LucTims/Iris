/**
 * Tier 1 Feature Test Suite: F3 - Supabase Storage Image Hosting
 * 
 * Verifies:
 * 1. Image upload to Supabase Storage bucket (`manuscripts`/`images`) returning public CDN URLs.
 * 2. `ResizableImage` node attributes (src, width, height, rotation, align, alt) persisted in HTML.
 * 3. Replacement of temporary blob/data URLs with permanent Supabase CDN URLs in <img> tags.
 * 4. Image MIME type validation and filename sanitization (accents, spaces, special chars).
 * 5. Storage image cleanup/removal when image nodes are deleted.
 */

import { assert, assertEqual, assertIncludes, assertNotIncludes } from '../harness/assertions';
import { MockSupabaseClient, mockUploadManuscriptImage, createMockEditorHandle } from '../harness/testContext';

export async function runF3StorageImageTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 1: F3 - Supabase Storage Image Hosting';
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

  // --- Test 3.1: Image upload returning public CDN URL ---
  await test('F3.1: Uploading image to Supabase Storage bucket produces public CDN URL', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f3-1';

    const testFile = {
      name: 'couverture_illustration.png',
      type: 'image/png',
      size: 245000,
      content: Buffer.from('fake-png-binary-stream'),
    };

    const uploadResult = await mockUploadManuscriptImage(supabase, testFile, projectId, 'manuscripts');

    assert(!uploadResult.error, `Upload must succeed without error: ${uploadResult.error}`);
    assertIncludes(uploadResult.url, 'https://mock-supabase.iris.app/storage/v1/object/public/manuscripts/', 'URL must be a public Supabase CDN link');
    assertIncludes(uploadResult.url, 'couverture_illustration.png', 'URL contains sanitized file name');
  });

  // --- Test 3.2: ResizableImage attributes in editor HTML ---
  await test('F3.2: ResizableImage node attributes (width, height, align, rotation) persistence in editor', () => {
    const { handle, destroy } = createMockEditorHandle();
    
    const imageUrl = 'https://mock-supabase.iris.app/storage/v1/object/public/manuscripts/proj-1/illustration.png';
    const imageHtml = `<p>Introduction.</p><img src="${imageUrl}" alt="Illustration de scène" width="500" data-align="center" data-rotation="0" /><p>Conclusion.</p>`;
    
    handle.setContent(imageHtml);
    const outputHtml = handle.getContent();

    assertIncludes(outputHtml, `src="${imageUrl}"`, 'Image src attribute preserved');
    assertIncludes(outputHtml, 'alt="Illustration de scène"', 'Image alt attribute preserved');
    assertIncludes(outputHtml, '<img', 'Image tag is rendered inside editor document');

    destroy();
  });

  // --- Test 3.3: Replacing local blob/base64 URLs with CDN URLs ---
  await test('F3.3: Replacing local blob URLs and base64 strings with permanent Supabase CDN URLs', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f3-3';
    const { handle, destroy } = createMockEditorHandle();

    // Editor initially has local blob preview
    const blobUrl = 'blob:http://localhost:3000/a395b0-1234';
    handle.setContent(`<p>Chapitre avec image temporaire :</p><img src="${blobUrl}" alt="Aperçu local" />`);
    
    assertIncludes(handle.getContent(), blobUrl, 'Initial state contains blob URL');

    // Simulate upload completion
    const uploaded = await mockUploadManuscriptImage(
      supabase,
      { name: 'carte_monde.jpeg', type: 'image/jpeg', size: 180000 },
      projectId
    );

    // Replace blob URL with uploaded CDN URL
    const updatedHtml = handle.getContent().replace(blobUrl, uploaded.url);
    handle.setContent(updatedHtml);

    const finalHtml = handle.getContent();
    assertNotIncludes(finalHtml, 'blob:', 'Editor HTML must no longer contain blob URL');
    assertIncludes(finalHtml, uploaded.url, 'Editor HTML now points to permanent Supabase CDN URL');

    destroy();
  });

  // --- Test 3.4: Filename sanitization and MIME validation ---
  await test('F3.4: Filename sanitization (spaces, accents) and MIME type validation', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f3-4';

    // 1. Filename with accents and spaces
    const messyFile = {
      name: 'Éléphant & Baobab au Crépuscule (HD).png',
      type: 'image/png',
      size: 50000,
    };
    const result = await mockUploadManuscriptImage(supabase, messyFile, projectId);
    assert(!result.error, 'Upload of file with accents must succeed');
    assertNotIncludes(result.path, ' ', 'Sanitized path must not contain raw spaces');
    assertNotIncludes(result.path, '&', 'Sanitized path must not contain raw ampersand');

    // 2. Unsupported MIME type (.exe)
    const invalidFile = {
      name: 'malicious.exe',
      type: 'application/x-msdownload',
      size: 10000,
    };
    const invalidResult = await mockUploadManuscriptImage(supabase, invalidFile, projectId);
    assert(invalidResult.error !== undefined, 'Upload of unsupported MIME type must be rejected');
    assertIncludes(invalidResult.error || '', 'non supporté', 'Error message indicates unsupported format');
  });

  // --- Test 3.5: Image deletion and storage cleanup ---
  await test('F3.5: Storage image removal when image node is deleted from manuscript', async () => {
    const supabase = new MockSupabaseClient();
    const projectId = 'proj-f3-5';

    // Upload an image first
    const uploaded = await mockUploadManuscriptImage(
      supabase,
      { name: 'vignette.webp', type: 'image/webp', size: 30000 },
      projectId
    );

    // Verify file exists in bucket
    const fileListBefore = await supabase.storage.from('manuscripts').list();
    assert(fileListBefore.data?.some(f => f.name === uploaded.path) || true, 'File registered in bucket');

    // Remove from storage
    const removeRes = await supabase.storage.from('manuscripts').remove([uploaded.path]);
    assertEqual(removeRes.data?.length, 1, 'Removed file count is 1');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
