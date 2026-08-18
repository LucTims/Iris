/**
 * Tier 1 Feature Test Suite: F6 - Production Build & Tiptap Pro Token Configuration
 * 
 * Verifies:
 * 1. `.npmrc` registry configuration pointing to `@tiptap-pro:registry=https://registry.tiptap.dev/` with authToken.
 * 2. Environment variable and `.npmrc` authToken resolution across build environments.
 * 3. `package.json` dependencies integrity (Tiptap Pro extensions, Next.js, Supabase, docx, jszip).
 * 4. `tsconfig.json` path mappings and module resolution compiler options.
 * 5. Production build scripts availability and Next.js configuration compliance.
 */

import { assert, assertEqual, assertIncludes } from '../harness/assertions';
import * as fs from 'fs';
import * as path from 'path';

export async function runF6ProductionBuildTests(): Promise<{ suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] }> {
  const suiteName = 'Tier 1: F6 - Production Build & Tiptap Pro Token Configuration';
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

  // --- Test 6.1: .npmrc configuration ---
  await test('F6.1: .npmrc configuration defines @tiptap-pro registry and authToken', () => {
    const npmrcPath = path.join(projectRoot, '.npmrc');
    assert(fs.existsSync(npmrcPath), '.npmrc file must exist in project root');

    const npmrcContent = fs.readFileSync(npmrcPath, 'utf8');
    assertIncludes(npmrcContent, '@tiptap-pro:registry=https://registry.tiptap.dev/', '.npmrc specifies Tiptap Pro registry URL');
    assertIncludes(npmrcContent, '//registry.tiptap.dev/:_authToken=', '.npmrc specifies _authToken for private registry access');
  });

  // --- Test 6.2: Token resolution mechanism ---
  await test('F6.2: Tiptap Pro token environment variable resolution and fallback logic', () => {
    const envToken = process.env.TIPTAP_PRO_TOKEN;
    const npmrcContent = fs.readFileSync(path.join(projectRoot, '.npmrc'), 'utf8');
    const hasAuthToken = npmrcContent.includes('_authToken=') || (envToken !== undefined && envToken.length > 10);
    
    assert(hasAuthToken, 'Authentication token must be resolvable via .npmrc or TIPTAP_PRO_TOKEN environment variable');
  });

  // --- Test 6.3: package.json dependencies integrity ---
  await test('F6.3: package.json includes all required Tiptap Pro, Supabase, and Export packages', () => {
    const pkgPath = path.join(projectRoot, 'package.json');
    assert(fs.existsSync(pkgPath), 'package.json must exist');

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = pkg.dependencies || {};

    assert(deps['@tiptap-pro/extension-pages'] !== undefined, '@tiptap-pro/extension-pages must be in dependencies');
    assert(deps['@tiptap-pro/extension-pages-tablekit'] !== undefined, '@tiptap-pro/extension-pages-tablekit must be in dependencies');
    assert(deps['@tiptap/core'] !== undefined, '@tiptap/core must be in dependencies');
    assert(deps['@supabase/supabase-js'] !== undefined, '@supabase/supabase-js must be in dependencies');
    assert(deps['docx'] !== undefined, 'docx must be in dependencies for Word export');
    assert(deps['jszip'] !== undefined, 'jszip must be in dependencies for EPUB export');
    assert(deps['next'] !== undefined, 'next must be in dependencies');
  });

  // --- Test 6.4: tsconfig.json configuration ---
  await test('F6.4: tsconfig.json defines strict checks, path aliases, and bundler module resolution', () => {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    assert(fs.existsSync(tsconfigPath), 'tsconfig.json must exist');

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    const compilerOptions = tsconfig.compilerOptions || {};

    assertEqual(compilerOptions.strict, true, 'strict mode enabled');
    assertEqual(compilerOptions.moduleResolution, 'bundler', 'moduleResolution set to bundler');
    assert(compilerOptions.paths && compilerOptions.paths['@/*'], '@/* path alias must be defined');
  });

  // --- Test 6.5: Production build scripts and Next.js config ---
  await test('F6.5: Next.js build scripts and next.config.ts production compliance', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const scripts = pkg.scripts || {};

    assertEqual(scripts.build, 'next build', 'build script configured as next build');
    assertEqual(scripts.dev, 'next dev', 'dev script configured as next dev');
    assertEqual(scripts.start, 'next start', 'start script configured as next start');

    const nextConfigPath = path.join(projectRoot, 'next.config.ts');
    assert(fs.existsSync(nextConfigPath), 'next.config.ts exists');
  });

  return { suite: suiteName, passed, failed, tests: results };
}
