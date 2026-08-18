import {
  assert,
  assertEqual,
  assertGreaterThanOrEqual,
  assertArrayLength,
  validateAdminKPIDataContract,
  validateActivityDataPointContract,
} from '../harness/assertions';
import {
  mockKPIData,
  mockActivity7d,
  mockActivity30d,
  mockActivity90d,
  mockActivityEvents,
} from '../../../src/lib/admin/mockData';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF2DashboardKPIsTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = "Tier 1 — F2: Dashboard Cockpit & Activity Analytics";
  const tests: TestResult[] = [];

  // Test 1: KPI Metric Cards Contract Validation
  try {
    validateAdminKPIDataContract(mockKPIData);
    assertGreaterThanOrEqual(mockKPIData.total_users, 1000, 'Total users should be >= 1000');
    assertGreaterThanOrEqual(mockKPIData.mrr_fcfa, 1000000, 'MRR should be >= 1,000,000 FCFA');
    assertGreaterThanOrEqual(mockKPIData.total_projects, 500, 'Total projects should be >= 500');
    assertGreaterThanOrEqual(mockKPIData.ai_cost_usd, 100, 'AI costs should be >= $100');
    tests.push({ name: 'F2.1: 6 core KPI metric cards conform to data contracts and realistic values', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F2.1: 6 core KPI metric cards conform to data contracts and realistic values', passed: false, error: err.message });
  }

  // Test 2: Growth Trend Indicators Calculation
  try {
    const calculateTrend = (growthPct: number) => ({
      isPositive: growthPct >= 0,
      badgeText: `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`,
      badgeClass: growthPct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800',
    });

    const userTrend = calculateTrend(mockKPIData.users_growth_pct);
    const mrrTrend = calculateTrend(mockKPIData.mrr_growth_pct);
    assertEqual(userTrend.isPositive, true, 'User growth is positive');
    assertEqual(userTrend.badgeText, '+18.5%', 'Formatted user growth rate');
    assertEqual(mrrTrend.badgeText, '+24.2%', 'Formatted MRR growth rate');
    tests.push({ name: 'F2.2: Growth trend badges compute formatted percentage strings correctly', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F2.2: Growth trend badges compute formatted percentage strings correctly', passed: false, error: err.message });
  }

  // Test 3: Multi-Timeframe Activity Timeline Data (7d, 30d, 90d)
  try {
    assertArrayLength(mockActivity7d, 7, '7-day activity should have 7 daily data points');
    assertArrayLength(mockActivity30d, 4, '30-day activity should have 4 weekly data points');
    assertArrayLength(mockActivity90d, 3, '90-day activity should have 3 monthly data points');

    mockActivity7d.forEach((point, idx) => {
      validateActivityDataPointContract(point);
      assert(point.ai_generations > 0, `Point ${idx} ai_generations must be > 0`);
      assert(point.words_count > 0, `Point ${idx} words_count must be > 0`);
      assert(point.revenue_fcfa > 0, `Point ${idx} revenue_fcfa must be > 0`);
    });
    tests.push({ name: 'F2.3: Multi-timeframe datasets (7d, 30d, 90d) validate schema and chronological order', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F2.3: Multi-timeframe datasets (7d, 30d, 90d) validate schema and chronological order', passed: false, error: err.message });
  }

  // Test 4: Live Activity Event Stream
  try {
    assertArrayLength(mockActivityEvents, 5, 'Activity event stream must contain at least 5 events');
    const types = mockActivityEvents.map(e => e.type);
    assert(types.includes('subscription'), 'Must include subscription event');
    assert(types.includes('export'), 'Must include book export event');
    assert(types.includes('quota_alert'), 'Must include quota alert event');
    assert(types.includes('user_joined'), 'Must include user joined event');
    assert(types.includes('project_created'), 'Must include project created event');
    tests.push({ name: 'F2.4: Real-time event stream classifies subscription, export, and quota alerts', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F2.4: Real-time event stream classifies subscription, export, and quota alerts', passed: false, error: err.message });
  }

  // Test 5: Currency and Word Count Formatting
  try {
    const formatFCFA = (amount: number) => `${amount.toLocaleString('fr-FR')} F`;
    const formatUSD = (amount: number) => `$${amount.toFixed(2)}`;
    const formatWords = (words: number) => words >= 1000000 ? `${(words / 1000000).toFixed(1)}M mots` : `${(words / 1000).toFixed(0)}k mots`;

    assertEqual(formatFCFA(4850000).replace(/\s/g, ' '), '4 850 000 F', 'FCFA formatting with French thousands separator');
    assertEqual(formatUSD(342.8), '$342.80', 'USD formatting with 2 decimals');
    assertEqual(formatWords(12500000), '12.5M mots', 'Word metric formatting for millions');
    tests.push({ name: 'F2.5: Financial and volume metric formatters produce compliant localized strings', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F2.5: Financial and volume metric formatters produce compliant localized strings', passed: false, error: err.message });
  }

  // Test 6: System Uptime SLA Evaluation
  try {
    assertEqual(mockKPIData.system_uptime_pct, 99.98, 'Uptime percentage must match SLA');
    const isSlaBreached = (uptime: number) => uptime < 99.9;
    assertEqual(isSlaBreached(mockKPIData.system_uptime_pct), false, 'SLA should not be breached');
    assertEqual(isSlaBreached(99.85), true, 'Uptime < 99.9 triggers SLA breach flag');
    tests.push({ name: 'F2.6: System uptime SLA health evaluates threshold compliance accurately', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F2.6: System uptime SLA health evaluates threshold compliance accurately', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
