/**
 * Iris Tiptap Pages E2E Test Suite Runner
 * 
 * Orchestrates and executes:
 * - Tier 1: Feature Coverage Suites (F1-F6, 30 tests)
 * - Tier 2: Boundary & Corner Cases (B1-B6, 30 tests)
 * - Tier 3: Cross-Feature Combinations (10 tests)
 * - Tier 4: Real-World Application Scenarios (6 scenarios)
 * Total: 76 Comprehensive Test Cases
 */

import { runF1EditorPagesTests } from './tier1_features/f1_editor_pages.test';
import { runF2SupabasePersistenceTests } from './tier1_features/f2_supabase_persistence.test';
import { runF3StorageImageTests } from './tier1_features/f3_storage_image.test';
import { runF4ExportPipelineTests } from './tier1_features/f4_export_pipeline.test';
import { runF5AiCoauthorTests } from './tier1_features/f5_ai_coauthor.test';
import { runF6ProductionBuildTests } from './tier1_features/f6_production_build.test';

import { runB1EditorBoundariesTests } from './tier2_boundaries/b1_editor_boundaries.test';
import { runB2PersistenceBoundariesTests } from './tier2_boundaries/b2_persistence_boundaries.test';
import { runB3StorageBoundariesTests } from './tier2_boundaries/b3_storage_boundaries.test';
import { runB4ExportBoundariesTests } from './tier2_boundaries/b4_export_boundaries.test';
import { runB5AiBoundariesTests } from './tier2_boundaries/b5_ai_boundaries.test';
import { runB6BuildBoundariesTests } from './tier2_boundaries/b6_build_boundaries.test';

import { runTier3CombinationsTests } from './tier3_combinations/cross_feature_combinations.test';
import { runTier4ScenariosTests } from './tier4_scenarios/real_world_scenarios.test';

export interface SuiteResult {
  suite: string;
  passed: number;
  failed: number;
  tests: { name: string; passed: boolean; error?: string }[];
}

export async function runAllE2ETests(): Promise<{
  totalPassed: number;
  totalFailed: number;
  totalTests: number;
  suiteResults: SuiteResult[];
  durationMs: number;
}> {
  console.log('\n================================================================================');
  console.log('       IRIS TIPTAP PAGES INTEGRATION — E2E TEST EXECUTION ENGINE');
  console.log('================================================================================\n');

  const startTime = Date.now();
  const suiteRunners = [
    // Tier 1: Feature Coverage (30 tests)
    runF1EditorPagesTests,
    runF2SupabasePersistenceTests,
    runF3StorageImageTests,
    runF4ExportPipelineTests,
    runF5AiCoauthorTests,
    runF6ProductionBuildTests,

    // Tier 2: Boundary & Corner Cases (30 tests)
    runB1EditorBoundariesTests,
    runB2PersistenceBoundariesTests,
    runB3StorageBoundariesTests,
    runB4ExportBoundariesTests,
    runB5AiBoundariesTests,
    runB6BuildBoundariesTests,

    // Tier 3: Cross-Feature Combinations (10 tests)
    runTier3CombinationsTests,

    // Tier 4: Real-World Application Scenarios (6 tests)
    runTier4ScenariosTests,
  ];

  const suiteResults: SuiteResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const runner of suiteRunners) {
    const result = await runner();
    suiteResults.push(result);
    totalPassed += result.passed;
    totalFailed += result.failed;

    const icon = result.failed === 0 ? '✅' : '❌';
    console.log(`${icon} [${result.passed}/${result.passed + result.failed}] ${result.suite}`);

    for (const t of result.tests) {
      if (t.passed) {
        console.log(`    ✓ ${t.name}`);
      } else {
        console.log(`    ✗ ${t.name}`);
        console.log(`      Error: ${t.error}`);
      }
    }
    console.log('');
  }

  const durationMs = Date.now() - startTime;
  const totalTests = totalPassed + totalFailed;

  console.log('================================================================================');
  console.log('                             TEST EXECUTION SUMMARY');
  console.log('================================================================================');
  console.log(`Total Test Suites : ${suiteResults.length}`);
  console.log(`Total Test Cases  : ${totalTests}`);
  console.log(`Passed            : ${totalPassed}`);
  console.log(`Failed            : ${totalFailed}`);
  console.log(`Execution Time    : ${durationMs}ms`);
  console.log('================================================================================');

  if (totalFailed > 0) {
    console.log(`❌ RESULT: FAILED (${totalFailed} failures)`);
  } else {
    console.log(`✅ RESULT: ALL ${totalPassed} TESTS PASSED CLEANLY (100% SUCCESS)`);
  }
  console.log('================================================================================\n');

  return {
    totalPassed,
    totalFailed,
    totalTests,
    suiteResults,
    durationMs,
  };
}

// Auto-run if executed directly as entry point
if (typeof require !== 'undefined' && require.main === module) {
  runAllE2ETests().then((res) => {
    if (res.totalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
