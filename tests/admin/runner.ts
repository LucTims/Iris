/**
 * Iris Admin Dashboard — Automated Zero-Dependency Test Suite Runner
 * 
 * Orchestrates and executes:
 * - Tier 1: Feature Coverage (11 Suites, 60 Tests)
 * - Tier 2: Boundary Value Analysis & Edge Cases (1 Suite, 32 Tests)
 * - Tier 3: Cross-Feature Combinations (1 Suite, 10 Tests)
 * - Tier 4: Real-World Scenarios (1 Suite, 5 Tests)
 * Total: 107 Comprehensive Automated Tests
 * 
 * Execution:
 * node --experimental-strip-types tests/admin/runner.ts
 */

import { runF1LayoutNavigationTests } from './tier1_features/f1_layout_navigation.test';
import { runF2DashboardKPIsTests } from './tier1_features/f2_dashboard_kpis.test';
import { runF3UsersManagementTests } from './tier1_features/f3_users_management.test';
import { runF4ProjectsExplorerTests } from './tier1_features/f4_projects_explorer.test';
import { runF5AiSurveillanceTests } from './tier1_features/f5_ai_surveillance.test';
import { runF6CreditsQuotasTests } from './tier1_features/f6_credits_quotas.test';
import { runF7SubscriptionsFinancesTests } from './tier1_features/f7_subscriptions_finances.test';
import { runF8LogsTelemetryTests } from './tier1_features/f8_logs_telemetry.test';
import { runF9SecurityAccessTests } from './tier1_features/f9_security_access.test';
import { runF10SettingsFlagsTests } from './tier1_features/f10_settings_flags.test';
import { runF11HealthDiagnosticsTests } from './tier1_features/f11_health_diagnostics.test';

import { runTier2BoundaryTests } from './tier2_boundaries/boundary_edge_cases.test';
import { runTier3CombinationsTests } from './tier3_combinations/cross_feature_combinations.test';
import { runTier4ScenariosTests } from './tier4_scenarios/real_world_scenarios.test';

export interface SuiteResult {
  suite: string;
  passed: number;
  failed: number;
  tests: { name: string; passed: boolean; error?: string }[];
}

export async function runAllAdminTests(): Promise<{
  totalPassed: number;
  totalFailed: number;
  totalTests: number;
  suiteResults: SuiteResult[];
  durationMs: number;
}> {
  console.log('\n================================================================================');
  console.log('       IRIS ADMIN OPERATIONAL COCKPIT — AUTOMATED TEST RUNNER');
  console.log('================================================================================\n');

  const startTime = Date.now();
  const suiteRunners = [
    // Tier 1: Category-Partition Feature Coverage (60 tests)
    runF1LayoutNavigationTests,
    runF2DashboardKPIsTests,
    runF3UsersManagementTests,
    runF4ProjectsExplorerTests,
    runF5AiSurveillanceTests,
    runF6CreditsQuotasTests,
    runF7SubscriptionsFinancesTests,
    runF8LogsTelemetryTests,
    runF9SecurityAccessTests,
    runF10SettingsFlagsTests,
    runF11HealthDiagnosticsTests,

    // Tier 2: Boundary Value Analysis & Edge Cases (32 tests)
    runTier2BoundaryTests,

    // Tier 3: Cross-Feature Combinations (10 tests)
    runTier3CombinationsTests,

    // Tier 4: Real-World Scenarios (5 tests)
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
  console.log(`Success Rate      : ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
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
const isDirectExecution =
  (typeof require !== 'undefined' && require.main === module) ||
  (typeof process !== 'undefined' && process.argv[1] && (process.argv[1].includes('runner.ts') || process.argv[1].includes('runner.js')));

if (isDirectExecution) {
  runAllAdminTests().then((res) => {
    if (res.totalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}

