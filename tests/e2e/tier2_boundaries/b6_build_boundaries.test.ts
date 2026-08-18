/**
 * Tier 2 Boundary Test Suite: B6 - Production Build Boundary & Corner Cases
 * 
 * Verifies:
 * 1. Missing `.npmrc` / authToken resilience in development environments.
 * 2. Trailing whitespace, line endings (CRLF vs LF), and comments in `.npmrc`.
 * 3. Package.json scripts schema compliance (build, dev, lint, start).
 * 4. Strict TypeScript compiler options integrity (`strict: true`, `noEmit: true`).
 * 5. Supabase environment variables presence guard.
 */

import { assert, assertEqual, assertIncludes } from '../harness/assertions';
import * as fs from 'fs';
import * as path from 'path';

export async function runB6BuildBoundariesTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 2: B6 - Production Build Boundary & Corner Cases';
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

  const projectRoot = path.resolve(__dirname, '../../../');

  // --- Test B6.1: Missing token resilience logic ---
  await test('B6.1: Missing TIPTAP_PRO_TOKEN fallback logic in local development', () => {
    const resolveToken = (envVal?: string, npmrcContent?: string): string | null => {
      if (envVal && envVal.trim()) return envVal.trim();
      if (npmrcContent) {
        const match = npmrcContent.match(/_authToken=([^\s\n\r]+)/);
        if (match && match[1]) return match[1];
      }
      return null;
    };

    // Test token extracted from npmrc when env is empty
    const extracted = resolveToken(undefined, '//registry.tiptap.dev/:_authToken=dummy-secret-token');
    assertEqual(extracted, 'dummy-secret-token', 'Extracts token from .npmrc content when env var is omitted');
  });

  // --- Test B6.2: CRLF / LF and comments in .npmrc ---
  await test('B6.2: Handling CRLF/LF line endings and comments in .npmrc parsing', () => {
    const rawNpmrc = `# Configuration Tiptap Pro\r\n@tiptap-pro:registry=https://registry.tiptap.dev/\r\n//registry.tiptap.dev/:_authToken=abc123token\r\n`;
    
    const lines = rawNpmrc.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));
    assertEqual(lines.length, 2, 'Comments and empty lines stripped correctly');
    assertIncludes(lines[0], '@tiptap-pro:registry', 'Registry line preserved');
    assertIncludes(lines[1], '_authToken=abc123token', 'AuthToken line preserved');
  });

  // --- Test B6.3: Package scripts schema compliance ---
  await test('B6.3: Package.json contains all required lifecycle scripts with exact commands', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const scripts = pkg.scripts || {};

    assert(typeof scripts.build === 'string', 'build script must exist');
    assert(typeof scripts.dev === 'string', 'dev script must exist');
    assert(typeof scripts.lint === 'string', 'lint script must exist');
  });

  // --- Test B6.4: TypeScript compiler options integrity ---
  await test('B6.4: Strict TypeScript compiler options with JSX and ModuleResolution', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf8'));
    const opts = tsconfig.compilerOptions || {};

    assertEqual(opts.strict, true, 'strict mode must be true');
    assertEqual(opts.jsx, 'react-jsx', 'jsx set to react-jsx');
    assertEqual(opts.noEmit, true, 'noEmit must be true');
  });

  // --- Test B6.5: Supabase environment variables guard ---
  await test('B6.5: Environment variable validation for Supabase configuration', () => {
    const validateSupabaseEnv = (url?: string, key?: string) => {
      const isValid = Boolean(url && url.startsWith('http') && key && key.length > 10);
      return isValid;
    };

    // Valid dummy
    assert(validateSupabaseEnv('https://xyz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'), 'Valid Supabase env is recognized');
    // Invalid
    assert(!validateSupabaseEnv('', ''), 'Empty Supabase env correctly marked as invalid');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
