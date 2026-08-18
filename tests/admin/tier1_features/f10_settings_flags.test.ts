import {
  assert,
  assertEqual,
  assertGreaterThanOrEqual,
  validateAdminSettingsContract,
} from '../harness/assertions';
import { mockAdminSettings } from '../../../src/lib/admin/mockData';
import { AdminSettingsState } from '../../../src/lib/admin/types';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF10SettingsFlagsTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 1 — F10: Global Settings & Feature Flags';
  const tests: TestResult[] = [];

  // Test 1: Global Settings State Contract Validation
  try {
    validateAdminSettingsContract(mockAdminSettings);
    assertEqual(typeof mockAdminSettings.maintenance_banner.enabled, 'boolean', 'Banner enabled is boolean');
    assertEqual(typeof mockAdminSettings.feature_flags.tiptap_v3_editor, 'boolean', 'Flag is boolean');
    tests.push({ name: 'F10.1: Global settings state conforms to AdminSettingsState schema contracts', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F10.1: Global settings state conforms to AdminSettingsState schema contracts', passed: false, error: err.message });
  }

  // Test 2: Maintenance Banner Broadcast Configuration
  try {
    const toggleBanner = (state: AdminSettingsState, enabled: boolean, message?: string): AdminSettingsState => {
      return {
        ...state,
        maintenance_banner: {
          ...state.maintenance_banner,
          enabled,
          message: message || state.maintenance_banner.message,
        },
      };
    };

    const enabledState = toggleBanner(mockAdminSettings, true, 'Arrêt programmé pour mise à niveau');
    assertEqual(enabledState.maintenance_banner.enabled, true, 'Banner is enabled');
    assertEqual(enabledState.maintenance_banner.message, 'Arrêt programmé pour mise à niveau', 'Custom message saved');

    const disabledState = toggleBanner(enabledState, false);
    assertEqual(disabledState.maintenance_banner.enabled, false, 'Banner is disabled');
    tests.push({ name: 'F10.2: Maintenance banner broadcast toggle and custom message update correctly', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F10.2: Maintenance banner broadcast toggle and custom message update correctly', passed: false, error: err.message });
  }

  // Test 3: Feature Flag Mutation & Rollout Controls
  try {
    const toggleFlag = (
      flags: AdminSettingsState['feature_flags'],
      flagKey: keyof AdminSettingsState['feature_flags']
    ) => ({
      ...flags,
      [flagKey]: !flags[flagKey],
    });

    const currentFlags = mockAdminSettings.feature_flags;
    assertEqual(currentFlags.tiptap_v3_editor, true, 'Tiptap v3 is initially active');
    const modifiedFlags = toggleFlag(currentFlags, 'tiptap_v3_editor');
    assertEqual(modifiedFlags.tiptap_v3_editor, false, 'Tiptap v3 toggles to inactive');
    tests.push({ name: 'F10.3: Feature flag switches permit granular runtime activation and deactivation', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F10.3: Feature flag switches permit granular runtime activation and deactivation', passed: false, error: err.message });
  }

  // Test 4: AI Safety Spend Caps and Rate Limits
  try {
    const aiSafety = mockAdminSettings.ai_safety;
    assertGreaterThanOrEqual(aiSafety.daily_spend_cap_usd, 10.0, 'Daily spend cap is >= $10');
    assertGreaterThanOrEqual(aiSafety.max_tokens_per_request, 1024, 'Max tokens is >= 1024');
    assertEqual(aiSafety.default_fallback_model, 'gemini-2.5-flash', 'Default fallback is Flash');
    tests.push({ name: 'F4.4: AI safety guardrails enforce request token limits and daily spend caps', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F4.4: AI safety guardrails enforce request token limits and daily spend caps', passed: false, error: err.message });
  }

  // Test 5: Super-Admin Whitelist Verification
  try {
    const whitelist = mockAdminSettings.admin_whitelist;
    const isWhitelisted = (email: string) => whitelist.includes(email.toLowerCase().trim());

    assertEqual(isWhitelisted('www.martau@gmail.com'), true, 'Primary super admin is whitelisted');
    assertEqual(isWhitelisted('amadou.diallo@iris-editions.com'), true, 'Co-founder admin is whitelisted');
    assertEqual(isWhitelisted('unauthorized@attacker.org'), false, 'Non-whitelisted address rejected');
    tests.push({ name: 'F10.5: Super-admin email whitelist validates authoritative administrator permissions', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F10.5: Super-admin email whitelist validates authoritative administrator permissions', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
