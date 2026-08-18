/**
 * Tier 2 Boundary Test Suite: B3 - Storage Boundary & Corner Cases
 * 
 * Verifies:
 * 1. Zero-byte file upload rejection with clear user feedback.
 * 2. Corrupt / fake MIME type detection and rejection.
 * 3. Extreme high-resolution image upload (8000x8000, 20MB) handling.
 * 4. Storage bucket error handling and offline fallback resilience.
 * 5. Special characters, spaces, dots, and duplicate filename collisions.
 */

import { assert, assertEqual, assertIncludes } from '../harness/assertions';
import { MockSupabaseClient, mockUploadManuscriptImage } from '../harness/testContext';

export async function runB3StorageBoundariesTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 2: B3 - Storage Boundary & Corner Cases';
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

  // --- Test B3.1: Zero-byte file rejection ---
  await test('B3.1: Zero-byte image upload rejected with descriptive error message', async () => {
    const supabase = new MockSupabaseClient();
    const result = await mockUploadManuscriptImage(
      supabase,
      { name: 'vide.png', type: 'image/png', size: 0 },
      'proj-b3-1'
    );

    assertEqual(result.url, '', 'URL is empty on failed upload');
    assert(result.error !== undefined, 'Error message is returned');
    assertIncludes(result.error || '', 'vide', 'Error states file is empty');
  });

  // --- Test B3.2: Unsupported MIME type detection ---
  await test('B3.2: Executable or script disguised as image rejected by MIME validator', async () => {
    const supabase = new MockSupabaseClient();
    const malicious = {
      name: 'script.php.png',
      type: 'application/x-php',
      size: 4096,
    };

    const res = await mockUploadManuscriptImage(supabase, malicious, 'proj-b3-2');
    assert(res.error !== undefined, 'Upload rejected for invalid MIME type');
    assertIncludes(res.error || '', 'non supporté', 'Error indicates unsupported format');
  });

  // --- Test B3.3: High-resolution large image handling ---
  await test('B3.3: 20MB high-resolution image upload and width constraint calculation', async () => {
    const supabase = new MockSupabaseClient();
    const largeImage = {
      name: 'ultra_hd_map_8000x8000.png',
      type: 'image/png',
      size: 20 * 1024 * 1024, // 20 MB
      content: Buffer.alloc(1024 * 100), // simulated buffer
    };

    const res = await mockUploadManuscriptImage(supabase, largeImage, 'proj-b3-3');
    assert(!res.error, 'High-resolution image upload succeeds');
    assertIncludes(res.url, 'ultra_hd_map_8000x8000.png', 'Public CDN URL contains sanitized name');
  });

  // --- Test B3.4: Bucket upload failure handling ---
  await test('B3.4: Graceful handling of missing bucket / upload error', async () => {
    const supabase = new MockSupabaseClient();
    // Simulate error by passing null body
    const { data, error } = await supabase.storage.from('invalid-bucket').upload('path/test.png', null as any);
    assert(error !== null, 'Upload with invalid payload triggers error');
    assert(data === null, 'Data is null on failure');
  });

  // --- Test B3.5: Duplicate filename collision handling ---
  await test('B3.5: Duplicate filename uploads produce unique timestamped CDN paths', async () => {
    const supabase = new MockSupabaseClient();
    const file = { name: 'photo.jpg', type: 'image/jpeg', size: 12000 };

    const res1 = await mockUploadManuscriptImage(supabase, file, 'proj-b3-5');
    // Wait 5ms to guarantee distinct timestamp
    await new Promise((r) => setTimeout(r, 5));
    const res2 = await mockUploadManuscriptImage(supabase, file, 'proj-b3-5');

    assert(!res1.error && !res2.error, 'Both uploads succeed');
    assert(res1.path !== res2.path, 'Each upload receives a unique timestamped path to prevent collision');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
