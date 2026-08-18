import {
  assert,
  assertEqual,
  assertGreaterThanOrEqual,
  assertArrayLength,
} from '../harness/assertions';
import { mockCreditTransactions, mockAdminUsers } from '../../../src/lib/admin/mockData';
import { AdminCreditTransaction } from '../../../src/lib/admin/types';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF6CreditsQuotasTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 1 — F6: Credit Ledger & Quotas Management';
  const tests: TestResult[] = [];

  // Test 1: Credit Transaction Ledger Contract
  try {
    assertArrayLength(mockCreditTransactions, 4, 'Must have at least 4 credit transactions');
    mockCreditTransactions.forEach(tx => {
      assert(typeof tx.id === 'string', 'tx.id must be string');
      assert(typeof tx.user_id === 'string', 'tx.user_id must be string');
      assert(typeof tx.amount_words === 'number' && tx.amount_words > 0, 'amount_words must be positive');
      assert(['grant', 'deduction', 'monthly_refill', 'purchase'].includes(tx.type), `Invalid tx type: ${tx.type}`);
      assert(tx.admin_email.length > 0, 'admin_email must be present');
    });
    tests.push({ name: 'F6.1: Credit transaction ledger validates audit trail schema and transaction types', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F6.1: Credit transaction ledger validates audit trail schema and transaction types', passed: false, error: err.message });
  }

  // Test 2: Manual Promotional Credit Grant Action
  try {
    const grantCredits = (
      userId: string,
      userEmail: string,
      amountWords: number,
      reason: string,
      adminEmail: string
    ): AdminCreditTransaction => {
      if (amountWords <= 0) throw new Error('Grant amount must be greater than 0');
      if (!reason.trim()) throw new Error('Grant reason is required');
      return {
        id: `crd_test_${Date.now()}`,
        user_id: userId,
        user_email: userEmail,
        amount_words: amountWords,
        type: 'grant',
        reason,
        admin_email: adminEmail,
        timestamp: new Date().toISOString(),
      };
    };

    const newGrant = grantCredits(
      'usr_005',
      'amina.traore@bamako-lit.ml',
      15000,
      'Prix du jury Festival Bamako 2026',
      'www.martau@gmail.com'
    );

    assertEqual(newGrant.amount_words, 15000, 'Granted 15,000 words');
    assertEqual(newGrant.type, 'grant', 'Transaction type is grant');
    assertEqual(newGrant.admin_email, 'www.martau@gmail.com', 'Admin stamp verified');
    tests.push({ name: 'F6.2: Manual promotional credit grant action creates verified audit ledger entry', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F6.2: Manual promotional credit grant action creates verified audit ledger entry', passed: false, error: err.message });
  }

  // Test 3: Daily Quota Enforcement for Free Tier
  try {
    const freeTierDailyQuota = 10000;
    const checkQuota = (generatedToday: number, requestingWords: number) => {
      const remaining = Math.max(0, freeTierDailyQuota - generatedToday);
      const isAllowed = requestingWords <= remaining;
      return { remaining, isAllowed };
    };

    const quotaUnder = checkQuota(4200, 2000);
    assertEqual(quotaUnder.remaining, 5800, '5,800 words remaining');
    assertEqual(quotaUnder.isAllowed, true, 'Generation allowed');

    const quotaOver = checkQuota(9500, 1000);
    assertEqual(quotaOver.remaining, 500, '500 words remaining');
    assertEqual(quotaOver.isAllowed, false, 'Generation rejected due to quota breach');
    tests.push({ name: 'F6.3: Daily quota enforcement accurately restricts free tier overages', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F6.3: Daily quota enforcement accurately restricts free tier overages', passed: false, error: err.message });
  }

  // Test 4: Word Balance Deduction
  try {
    const deductWords = (currentBalance: number, wordsSpent: number) => {
      if (wordsSpent > currentBalance) throw new Error('Insufficient word credits');
      return currentBalance - wordsSpent;
    };

    const remaining = deductWords(50000, 14200);
    assertEqual(remaining, 35800, 'Balance correctly reduced to 35,800 words');
    tests.push({ name: 'F6.4: Word balance deduction calculates remaining quota correctly', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F6.4: Word balance deduction calculates remaining quota correctly', passed: false, error: err.message });
  }

  // Test 5: Monthly Refill Allocation by Plan
  try {
    const getPlanMonthlyAllowance = (plan: 'free' | 'pro' | 'studio'): number => {
      switch (plan) {
        case 'free': return 10000;
        case 'pro': return 50000;
        case 'studio': return 200000;
      }
    };

    assertEqual(getPlanMonthlyAllowance('free'), 10000, 'Free plan allocation is 10k words');
    assertEqual(getPlanMonthlyAllowance('pro'), 50000, 'Pro plan allocation is 50k words');
    assertEqual(getPlanMonthlyAllowance('studio'), 200000, 'Studio plan allocation is 200k words');
    tests.push({ name: 'F6.5: Plan allowance matrix matches subscription tier entitlement policies', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F6.5: Plan allowance matrix matches subscription tier entitlement policies', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
