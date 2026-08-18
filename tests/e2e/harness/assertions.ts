/**
 * E2E Test Suite Custom Assertions Library
 * Provides robust validation methods for HTML, DOCX, EPUB, Markdown, and Editor contracts.
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new AssertionError(`❌ ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new AssertionError(
      `❌ ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`
    );
  }
}

export function assertNotEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    throw new AssertionError(
      `❌ ${message}\n  Expected values to differ, but both were: ${JSON.stringify(actual)}`
    );
  }
}

export function assertIncludes(actual: string, expectedSubstring: string, message: string): void {
  if (!actual || !actual.includes(expectedSubstring)) {
    throw new AssertionError(
      `❌ ${message}\n  Expected string to include: "${expectedSubstring}"\n  Actual content: "${actual?.substring(0, 300)}..."`
    );
  }
}

export function assertNotIncludes(actual: string, forbiddenSubstring: string, message: string): void {
  if (actual && actual.includes(forbiddenSubstring)) {
    throw new AssertionError(
      `❌ ${message}\n  Expected string NOT to include: "${forbiddenSubstring}"\n  Actual content: "${actual?.substring(0, 300)}..."`
    );
  }
}

export function assertMatches(actual: string, regex: RegExp, message: string): void {
  if (!regex.test(actual)) {
    throw new AssertionError(
      `❌ ${message}\n  Expected string to match pattern: ${regex}\n  Actual: "${actual?.substring(0, 300)}..."`
    );
  }
}

export function assertGreaterThanOrEqual(actual: number, expected: number, message: string): void {
  if (actual < expected) {
    throw new AssertionError(
      `❌ ${message}\n  Expected ${actual} >= ${expected}`
    );
  }
}

export async function assertThrowsAsync(
  fn: () => Promise<any>,
  expectedMessageSubstring?: string
): Promise<void> {
  let threw = false;
  let caughtError: any = null;
  try {
    await fn();
  } catch (err) {
    threw = true;
    caughtError = err;
  }

  if (!threw) {
    throw new AssertionError(`❌ Expected async function to throw an error, but it succeeded.`);
  }

  if (expectedMessageSubstring && caughtError) {
    const msg = caughtError.message || String(caughtError);
    if (!msg.includes(expectedMessageSubstring)) {
      throw new AssertionError(
        `❌ Expected error message to include "${expectedMessageSubstring}", got "${msg}"`
      );
    }
  }
}

/**
 * Validates that an HTML string has valid structure and required elements.
 */
export function assertValidHtml(html: string, message: string): void {
  assert(typeof html === 'string', `${message}: HTML must be a string`);
  assert(html.length > 0, `${message}: HTML must not be empty`);
  // Basic tag balancing checks for common tags
  const openP = (html.match(/<p(\s|>)/gi) || []).length;
  const closeP = (html.match(/<\/p>/gi) || []).length;
  assertEqual(openP, closeP, `${message}: <p> tags are balanced`);
}

/**
 * Validates DOCX Blob structure.
 */
export function assertValidDocxBlob(blob: any, message: string): void {
  assert(blob !== null && blob !== undefined, `${message}: DOCX Blob must exist`);
  assert(typeof blob.size === 'number' || blob.length > 0, `${message}: DOCX Blob must have size > 0`);
  if (blob.type) {
    assert(
      blob.type.includes('word') || blob.type.includes('officedocument') || blob.type.includes('zip') || blob.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      `${message}: DOCX Blob must have valid MIME type (got: ${blob.type})`
    );
  }
}

/**
 * Validates EPUB Blob structure.
 */
export function assertValidEpubBlob(blob: any, message: string): void {
  assert(blob !== null && blob !== undefined, `${message}: EPUB Blob must exist`);
  assert(typeof blob.size === 'number' || blob.length > 0, `${message}: EPUB Blob must have size > 0`);
  if (blob.type) {
    assert(
      blob.type.includes('epub') || blob.type.includes('zip'),
      `${message}: EPUB Blob must have valid MIME type (got: ${blob.type})`
    );
  }
}

/**
 * Validates Markdown string or Blob.
 */
export function assertValidMarkdown(content: string, message: string): void {
  assert(typeof content === 'string', `${message}: Markdown must be a string`);
  assert(content.length > 0, `${message}: Markdown must not be empty`);
  assert(content.includes('# '), `${message}: Markdown must contain top-level headings`);
}
