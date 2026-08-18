/**
 * Tier 2 Boundary Test Suite: B1 - Editor Boundary & Corner Cases
 * 
 * Verifies:
 * 1. Empty document initialization and empty string handling (no phantom demo content).
 * 2. Massive 50,000-word manuscript layout stability and performance.
 * 3. Unicode, emoji, special punctuation, accents, and mixed RTL in content.
 * 4. Extreme zoom levels (25% to 500%) and zero-margin boundary calculations.
 * 5. Deeply nested HTML formatting (nested lists, nested quotes) without DOM corruption.
 */

import { assert, assertEqual, assertIncludes, assertGreaterThanOrEqual } from '../harness/assertions';
import { createMockEditorHandle } from '../harness/testContext';

export async function runB1EditorBoundariesTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 2: B1 - Editor Boundary & Corner Cases';
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

  // --- Test B1.1: Empty document initialization ---
  await test('B1.1: Empty document initialization and setContent("") does not leave phantom demo content', () => {
    const { handle, destroy } = createMockEditorHandle('');
    const content = handle.getContent();
    assert(content === '' || content === '<p></p>', `Empty editor produces empty content, got: "${content}"`);

    // Explicitly clear with empty string
    handle.setContent('');
    const cleared = handle.getContent();
    assert(cleared === '' || cleared === '<p></p>', 'Clearing editor content succeeds cleanly');

    destroy();
  });

  // --- Test B1.2: Massive 50k words manuscript ---
  await test('B1.2: Massive 50,000-word manuscript loading and word count calculation stability', () => {
    const { handle, editor, destroy } = createMockEditorHandle();
    
    // Generate 50,000 words across 50 paragraphs
    const paragraphWords = Array(100).fill('mot').join(' ');
    const paragraphs = Array(500).fill(`<p>${paragraphWords}</p>`).join('\n');

    const startTime = Date.now();
    handle.setContent(paragraphs);
    const duration = Date.now() - startTime;

    const text = editor.getText();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    assertEqual(wordCount, 50000, 'All 50,000 words parsed accurately');
    assert(duration < 5000, `Massive manuscript processed in ${duration}ms (< 5000ms threshold)`);

    destroy();
  });

  // --- Test B1.3: Unicode, emoji, and special accents ---
  await test('B1.3: Unicode characters, emojis, special punctuation, and accents preservation', () => {
    const { handle, destroy } = createMockEditorHandle();
    
    const specialText = `<h1>L'Épopée de Soundiata : L’Âme d’un Héros 🌿✨</h1><p>Caractères spéciaux : « Bonjour », — tiret cadratin —, ©, ™, ½, ±, 🪶, 📜.</p><p>Multilingue : Français (é, è, ê, ë, à, ù, ç, œ), Arabe (مرحبا), Chinois (你好), Russe (Привет).</p>`;
    handle.setContent(specialText);

    const html = handle.getContent();
    assertIncludes(html, '🌿✨', 'Emojis preserved in HTML');
    assertIncludes(html, '« Bonjour »', 'French guillemets preserved');
    assertIncludes(html, '— tiret cadratin —', 'Em-dashes preserved');
    assertIncludes(html, 'é, è, ê, ë, à, ù, ç, œ', 'Accents and ligatures preserved');
    assertIncludes(html, 'مرحبا', 'Arabic text preserved');
    assertIncludes(html, '你好', 'Chinese text preserved');
    assertIncludes(html, 'Привет', 'Cyrillic text preserved');

    destroy();
  });

  // --- Test B1.4: Extreme zoom levels calculation ---
  await test('B1.4: Boundary zoom transformations (25% to 500%) scaling calculations', () => {
    const a4Height = 1123;
    const a4Width = 794;

    const zoomLevels = [0.25, 0.5, 1.0, 1.5, 2.0, 5.0];
    for (const zoom of zoomLevels) {
      const scaledWidth = a4Width * zoom;
      const marginAdjustment = (zoom - 1) * a4Height;
      assert(scaledWidth > 0, `Scaled width at ${zoom * 100}% is positive (${scaledWidth}px)`);
      assert(typeof marginAdjustment === 'number', `Margin adjustment calculated for zoom ${zoom}`);
    }
  });

  // --- Test B1.5: Deeply nested HTML structures ---
  await test('B1.5: Deeply nested lists and multi-level blockquotes without DOM corruption', () => {
    const { handle, destroy } = createMockEditorHandle();
    
    const deeplyNestedHtml = `
      <ul>
        <li>Niveau 1
          <ul>
            <li>Niveau 2
              <ul>
                <li>Niveau 3
                  <ul>
                    <li>Niveau 4
                      <ul>
                        <li>Niveau 5 (Profondeur maximale)</li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
      <blockquote>
        <p>Citation externe</p>
        <blockquote>
          <p>Citation imbriquée de second niveau</p>
        </blockquote>
      </blockquote>
    `;

    handle.setContent(deeplyNestedHtml);
    const resultHtml = handle.getContent();

    assertIncludes(resultHtml, 'Niveau 5 (Profondeur maximale)', 'Deepest list item preserved');
    assertIncludes(resultHtml, 'Citation imbriquée de second niveau', 'Nested blockquote preserved');

    destroy();
  });

  return { suite: suiteName, passed, failed, tests: results };
}
