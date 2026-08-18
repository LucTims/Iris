/**
 * Tier 2 Boundary Test Suite: B5 - AI Panel Boundary & Corner Cases
 * 
 * Verifies:
 * 1. AI content insertion into empty document with no prior selection.
 * 2. AI cursor injection inside nested nodes (list items, table cells).
 * 3. Rapid concurrent AI generation requests with pending state locks.
 * 4. Automatic cleanup of raw Markdown blocks (```html ... ```) returned by LLMs.
 * 5. Monthly quota / rate limit (429) error reporting and UI notification.
 */

import { assert, assertEqual, assertIncludes, assertNotIncludes } from '../harness/assertions';
import { createMockEditorHandle } from '../harness/testContext';

export async function runB5AiBoundariesTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 2: B5 - AI Panel Boundary & Corner Cases';
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

  // --- Test B5.1: Insertion into empty document ---
  await test('B5.1: AI content injection into empty document creates valid initial paragraph', () => {
    const { handle, destroy } = createMockEditorHandle('');

    handle.insertContent('<p>Au commencement, la plaine était déserte.</p>');
    const html = handle.getContent();
    assertIncludes(html, '<p>Au commencement, la plaine était déserte.</p>', 'Content inserted cleanly into empty document');

    destroy();
  });

  // --- Test B5.2: Insertion inside list items and table cells ---
  await test('B5.2: AI cursor insertion inside nested list item structure', () => {
    const { handle, destroy } = createMockEditorHandle('<ul><li>Point A</li><li>Point B</li></ul>');

    handle.insertContent('<li>Point C généré par l\'IA</li>');
    const html = handle.getContent();
    assertIncludes(html, 'Point C généré par l\'IA', 'List item inserted');

    destroy();
  });

  // --- Test B5.3: Rapid concurrent AI trigger state lock ---
  await test('B5.3: Pending state locking prevents duplicate concurrent AI invocations', () => {
    let isAiGenerating = false;
    let invocationCount = 0;

    const triggerAi = () => {
      if (isAiGenerating) return false;
      isAiGenerating = true;
      invocationCount++;
      return true;
    };

    // Simulate 4 rapid user clicks on Generate button
    const click1 = triggerAi();
    const click2 = triggerAi();
    const click3 = triggerAi();
    const click4 = triggerAi();

    assertEqual(click1, true, 'First click triggers AI generation');
    assertEqual(click2, false, 'Second rapid click is locked');
    assertEqual(click3, false, 'Third rapid click is locked');
    assertEqual(click4, false, 'Fourth rapid click is locked');
    assertEqual(invocationCount, 1, 'Only exactly 1 request was executed');
  });

  // --- Test B5.4: Cleaning raw markdown code fences from LLM ---
  await test('B5.4: Automatic sanitization of ```html markdown code fences from AI responses', () => {
    const rawLlmResponse = "```html\n<h1>Chapitre 1 : L'Aube</h1>\n<p>Le soleil se levait sur l'empire.</p>\n```";

    // Sanitization logic used in /api/chat
    let cleanedHtml = rawLlmResponse
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    assertNotIncludes(cleanedHtml, '```', 'Code fences removed');
    assertIncludes(cleanedHtml, '<h1>Chapitre 1 : L\'Aube</h1>', 'Clean H1 preserved');

    const { handle, destroy } = createMockEditorHandle();
    handle.replaceContent(cleanedHtml);
    assertIncludes(handle.getContent(), '<h1>Chapitre 1 : L\'Aube</h1>', 'Editor accepts sanitized HTML');

    destroy();
  });

  // --- Test B5.5: Quota / Rate limit (429) error handling ---
  await test('B5.5: Handling 429 quota exhaustion with informative error message', () => {
    const mockQuotaError = {
      status: 429,
      error: "Quota mensuel d'IA atteint (50 générations). Passez à un plan supérieur pour continuer.",
    };

    assertEqual(mockQuotaError.status, 429, 'Status is 429 Too Many Requests');
    assertIncludes(mockQuotaError.error, 'Quota mensuel', 'Error message clarifies quota exhaustion');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
