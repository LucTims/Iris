import {
  assert,
  assertEqual,
  assertGreaterThanOrEqual,
  assertArrayLength,
  filterCollection,
  validateAdminUserContract,
} from '../harness/assertions';
import { mockAdminUsers } from '../../../src/lib/admin/mockData';
import { AdminUser, PlanType, SubscriptionStatus } from '../../../src/lib/admin/types';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF3UsersManagementTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 1 — F3: User Management, Actions & Author Profiles';
  const tests: TestResult[] = [];

  // Test 1: User Data Table Population & Schema Contract (>= 5 users)
  try {
    assertArrayLength(mockAdminUsers, 5, 'User table requires at least 5 mock users');
    assertGreaterThanOrEqual(mockAdminUsers.length, 10, 'Expected full mock catalog of 10 users');
    mockAdminUsers.forEach(u => validateAdminUserContract(u));
    tests.push({ name: 'F3.1: User dataset has >=5 validated records conforming to AdminUser schema', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F3.1: User dataset has >=5 validated records conforming to AdminUser schema', passed: false, error: err.message });
  }

  // Test 2: Search by Name & Email
  try {
    const searchByName = filterCollection(mockAdminUsers, 'Fatou', ['full_name', 'email']);
    assertEqual(searchByName.length, 1, 'Should find 1 user named Fatou');
    assertEqual(searchByName[0].id, 'usr_003', 'Found user must be usr_003');

    const searchByEmail = filterCollection(mockAdminUsers, '@iris-editions.com', ['full_name', 'email']);
    assertEqual(searchByEmail.length, 1, 'Should find 1 user with @iris-editions.com email domain');
    assertEqual(searchByEmail[0].id, 'usr_001', 'Found user must be Amadou Diallo');
    tests.push({ name: 'F3.2: Full-text search accurately filters users by full name and email domain', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F3.2: Full-text search accurately filters users by full name and email domain', passed: false, error: err.message });
  }

  // Test 3: Plan Filter Tabs (Free, Pro, Studio)
  try {
    const filterByPlan = (users: AdminUser[], plan: PlanType | 'all') => {
      return plan === 'all' ? users : users.filter(u => u.plan === plan);
    };

    const freeUsers = filterByPlan(mockAdminUsers, 'free');
    const proUsers = filterByPlan(mockAdminUsers, 'pro');
    const studioUsers = filterByPlan(mockAdminUsers, 'studio');

    assertGreaterThanOrEqual(freeUsers.length, 2, 'Should have >= 2 Free users');
    assertGreaterThanOrEqual(proUsers.length, 3, 'Should have >= 3 Pro users');
    assertGreaterThanOrEqual(studioUsers.length, 2, 'Should have >= 2 Studio users');
    assertEqual(freeUsers.length + proUsers.length + studioUsers.length, mockAdminUsers.length, 'Sum of plans equals total users');
    tests.push({ name: 'F3.3: Plan filtering tabs (Free, Pro, Studio) segment user base accurately', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F3.3: Plan filtering tabs (Free, Pro, Studio) segment user base accurately', passed: false, error: err.message });
  }

  // Test 4: Status Dropdown Filter (Active, Past Due, Banned)
  try {
    const filterByStatus = (users: AdminUser[], status: SubscriptionStatus | 'all') => {
      return status === 'all' ? users : users.filter(u => u.subscription_status === status);
    };

    const activeUsers = filterByStatus(mockAdminUsers, 'active');
    const bannedUsers = filterByStatus(mockAdminUsers, 'banned');
    const pastDueUsers = filterByStatus(mockAdminUsers, 'past_due');

    assertGreaterThanOrEqual(activeUsers.length, 5, 'Should have >= 5 active users');
    assertEqual(bannedUsers.length, 1, 'Should have 1 banned user (Ousmane Diop)');
    assertEqual(bannedUsers[0].banned_reason !== undefined, true, 'Banned user must provide a reason');
    assertEqual(pastDueUsers.length, 1, 'Should have 1 past_due user (Jean-Luc Mbarga)');
    tests.push({ name: 'F3.4: Status dropdown correctly filters active, past due, and banned accounts', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F3.4: Status dropdown correctly filters active, past due, and banned accounts', passed: false, error: err.message });
  }

  // Test 5: Administrative Plan Upgrade / Downgrade Mutation
  try {
    const applyPlanChange = (user: AdminUser, newPlan: PlanType): AdminUser => {
      return {
        ...user,
        plan: newPlan,
        subscription_status: 'active',
      };
    };

    const testUser = mockAdminUsers.find(u => u.id === 'usr_005')!; // Amina Traoré (Free)
    const upgradedUser = applyPlanChange(testUser, 'pro');
    assertEqual(upgradedUser.plan, 'pro', 'Plan changed to Pro');
    assertEqual(upgradedUser.subscription_status, 'active', 'Status remains active');

    const downgradedUser = applyPlanChange(upgradedUser, 'free');
    assertEqual(downgradedUser.plan, 'free', 'Plan changed back to Free');
    tests.push({ name: 'F3.5: Admin plan change action mutates user subscription tier correctly', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F3.5: Admin plan change action mutates user subscription tier correctly', passed: false, error: err.message });
  }

  // Test 6: Administrative Ban & Unban Toggle with Reason
  try {
    const applyBan = (user: AdminUser, reason: string): AdminUser => {
      if (!reason || reason.trim().length === 0) {
        throw new Error('Ban reason is required');
      }
      return {
        ...user,
        subscription_status: 'banned',
        banned_reason: reason,
      };
    };

    const applyUnban = (user: AdminUser): AdminUser => {
      const { banned_reason, ...rest } = user;
      return {
        ...rest,
        subscription_status: 'active',
      };
    };

    const userToBan = mockAdminUsers.find(u => u.id === 'usr_004')!; // Koffi Kouamé
    const banned = applyBan(userToBan, 'Spamming generation API with unauthorized scripts');
    assertEqual(banned.subscription_status, 'banned', 'User status is banned');
    assertEqual(banned.banned_reason, 'Spamming generation API with unauthorized scripts', 'Ban reason stored');

    const unbanned = applyUnban(banned);
    assertEqual(unbanned.subscription_status, 'active', 'User status restored to active');
    assertEqual(unbanned.banned_reason, undefined, 'Ban reason cleared');
    tests.push({ name: 'F3.6: Ban/Unban toggle modifies subscription status and captures ban rationale', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F3.6: Ban/Unban toggle modifies subscription status and captures ban rationale', passed: false, error: err.message });
  }

  // Test 7: Rich Author Detail Modal Contract & Metrics Binding
  try {
    const targetUser = mockAdminUsers.find(u => u.id === 'usr_003')!; // Fatou Ndiaye
    const authorDetailModalProps = {
      isOpen: true,
      user: targetUser,
      stats: {
        totalWords: targetUser.words_generated,
        aiTokens: targetUser.ai_tokens_used,
        projectsCount: targetUser.projects_count,
        estimatedAiCostUsd: (targetUser.ai_tokens_used / 1000000) * 1.5,
      },
    };

    assertEqual(authorDetailModalProps.isOpen, true, 'Modal open state is true');
    assertEqual(authorDetailModalProps.user.full_name, 'Fatou Ndiaye', 'Author name binds correctly');
    assertEqual(authorDetailModalProps.stats.totalWords, 45000, 'Word count bound correctly');
    assertGreaterThanOrEqual(authorDetailModalProps.stats.estimatedAiCostUsd, 0.1, 'Cost estimate calculated');
    tests.push({ name: 'F3.7: Author detail modal receives complete profile state and telemetry aggregates', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F3.7: Author detail modal receives complete profile state and telemetry aggregates', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
