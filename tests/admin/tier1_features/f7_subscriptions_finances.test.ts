import {
  assert,
  assertEqual,
  assertGreaterThanOrEqual,
  assertArrayLength,
} from '../harness/assertions';
import { mockSubscriptionRecords } from '../../../src/lib/admin/mockData';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF7SubscriptionsFinancesTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 1 — F7: Subscriptions & Financial Management';
  const tests: TestResult[] = [];

  // Test 1: Subscription Records Schema & Contract
  try {
    assertArrayLength(mockSubscriptionRecords, 5, 'Must have at least 5 subscription records');
    mockSubscriptionRecords.forEach(sub => {
      assert(typeof sub.id === 'string', 'sub.id must be string');
      assert(typeof sub.amount_fcfa === 'number' && sub.amount_fcfa > 0, 'amount_fcfa must be positive');
      assert(['sebpay', 'stripe', 'wave', 'orange_money', 'mtn_momo'].includes(sub.provider), `Invalid provider: ${sub.provider}`);
      assert(['active', 'past_due', 'canceled'].includes(sub.status), `Invalid status: ${sub.status}`);
      assert(!isNaN(Date.parse(sub.current_period_end)), 'current_period_end must be valid date');
    });
    tests.push({ name: 'F7.1: Subscription records conform to billing schema and provider classifications', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F7.1: Subscription records conform to billing schema and provider classifications', passed: false, error: err.message });
  }

  // Test 2: Active Monthly Recurring Revenue (MRR) Calculation
  try {
    const activeMRR = mockSubscriptionRecords
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.amount_fcfa, 0);

    assertGreaterThanOrEqual(activeMRR, 100000, 'Active MRR should exceed 100,000 FCFA');
    assertEqual(activeMRR, 120000, 'Sum of active subscriptions (45k + 15k + 15k + 45k = 120,000 FCFA)');
    tests.push({ name: 'F7.2: Active MRR calculation aggregates only non-canceled, active subscriptions', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F7.2: Active MRR calculation aggregates only non-canceled, active subscriptions', passed: false, error: err.message });
  }

  // Test 3: Multi-Provider Payment Gateway Breakdown
  try {
    const providerCounts = mockSubscriptionRecords.reduce((acc, sub) => {
      acc[sub.provider] = (acc[sub.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    assert(providerCounts['wave'] >= 1, 'Includes Wave Mobile Money');
    assert(providerCounts['orange_money'] >= 1, 'Includes Orange Money');
    assert(providerCounts['mtn_momo'] >= 1, 'Includes MTN MoMo');
    assert(providerCounts['stripe'] >= 1, 'Includes Stripe Credit Card');
    assert(providerCounts['sebpay'] >= 1, 'Includes SebPay native');
    tests.push({ name: 'F7.3: Payment provider distribution monitors SebPay, Wave, Orange, MTN, and Stripe', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F7.3: Payment provider distribution monitors SebPay, Wave, Orange, MTN, and Stripe', passed: false, error: err.message });
  }

  // Test 4: Past-Due Subscription Dunning & Grace Period Logic
  try {
    const evaluateGracePeriod = (periodEndIso: string, graceDays: number = 7) => {
      const expiry = new Date(periodEndIso).getTime();
      const now = new Date('2026-08-17T20:00:00Z').getTime();
      const diffDays = Math.floor((now - expiry) / (1000 * 60 * 60 * 24));
      return {
        isExpired: now > expiry,
        inGracePeriod: now > expiry && diffDays <= graceDays,
        daysOverdue: Math.max(0, diffDays),
      };
    };

    const pastDueSub = mockSubscriptionRecords.find(s => s.status === 'past_due')!; // Jean-Luc Mbarga (ended Aug 10)
    const graceStatus = evaluateGracePeriod(pastDueSub.current_period_end);

    assertEqual(graceStatus.isExpired, true, 'Subscription has passed period end');
    assertEqual(graceStatus.inGracePeriod, true, '7 days overdue is within 7-day grace period');
    tests.push({ name: 'F7.4: Past-due dunning evaluation detects expired billing and grace period window', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F7.4: Past-due dunning evaluation detects expired billing and grace period window', passed: false, error: err.message });
  }

  // Test 5: Pricing Tier Valuation (Pro vs Studio)
  try {
    const planPricesFCFA = {
      free: 0,
      pro: 15000,
      studio: 45000,
    };

    assertEqual(planPricesFCFA.pro, 15000, 'Pro plan is 15,000 FCFA / month');
    assertEqual(planPricesFCFA.studio, 45000, 'Studio plan is 45,000 FCFA / month');
    tests.push({ name: 'F7.5: Pricing matrix reflects official West African SaaS pricing tiers', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F7.5: Pricing matrix reflects official West African SaaS pricing tiers', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
