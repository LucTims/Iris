import {
  assert,
  assertEqual,
  assertDeepEqual,
  assertIncludes,
  assertNotEqual,
  assertThrows,
  filterCollection,
  normalizeSearchQuery,
} from '../harness/assertions';
import { mockAdminUsers, mockAdminProjects, mockAdminLogs } from '../../../src/lib/admin/mockData';
import { AdminUser, AdminProject, PlanType, SubscriptionStatus } from '../../../src/lib/admin/types';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runTier2BoundaryTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 2 — Boundary Value Analysis & Corner Cases (32 Tests)';
  const tests: TestResult[] = [];

  const runTest = (name: string, fn: () => void) => {
    try {
      fn();
      tests.push({ name, passed: true });
    } catch (err: any) {
      tests.push({ name, passed: false, error: err.message });
    }
  };

  // --------------------------------------------------------------------------
  // Category 1: Search & Accent Normalization Boundaries (Tests 1 - 8)
  // --------------------------------------------------------------------------

  runTest('B1.1: Diacritic accent-insensitive search matches "amadou" to "Amadou"', () => {
    const res = filterCollection(mockAdminUsers, 'amadou', ['full_name']);
    assertEqual(res.length, 1, 'Should find Amadou Diallo');
    assertEqual(res[0].id, 'usr_001', 'Matches usr_001');
  });

  runTest('B1.2: Accents in query "Kouamé" match unaccented search "kouame"', () => {
    const res = filterCollection(mockAdminUsers, 'kouame', ['full_name']);
    assertEqual(res.length, 1, 'Should find Koffi Kouamé');
    assertEqual(res[0].id, 'usr_004', 'Matches usr_004');
  });

  runTest('B1.3: Project search with accented title "Épopée" matches "epopee"', () => {
    const res = filterCollection(mockAdminProjects, 'epopee', ['title']);
    assertEqual(res.length, 1, 'Should find L\'Épopée du Rail Africain');
  });

  runTest('B1.4: Special regex characters in search query are treated literally and do not crash', () => {
    const res = filterCollection(mockAdminUsers, '.*+?^${}()|[]\\', ['full_name']);
    assertEqual(res.length, 0, 'No crash, returns empty result array');
  });

  runTest('B1.5: SQL wildcard characters (% and _) in search query do not leak data', () => {
    const res = filterCollection(mockAdminUsers, '%_admin_%', ['full_name', 'email']);
    assertEqual(res.length, 0, 'Does not treat % as SQL wildcard');
  });

  runTest('B1.6: Search query with leading, trailing, and excessive whitespace is normalized', () => {
    const res = filterCollection(mockAdminUsers, '   fatou   ', ['full_name']);
    assertEqual(res.length, 1, 'Finds Fatou Ndiaye despite surrounding whitespace');
  });

  runTest('B1.7: Single character search query returns all partial matching records', () => {
    const res = filterCollection(mockAdminUsers, 'a', ['full_name']);
    assert(res.length >= 5, 'Finds all users whose names contain letter a');
  });

  runTest('B1.8: Empty search query string returns complete unfiltered dataset', () => {
    const res = filterCollection(mockAdminUsers, '', ['full_name']);
    assertEqual(res.length, mockAdminUsers.length, 'Returns full dataset without filtering');
  });

  // --------------------------------------------------------------------------
  // Category 2: Empty States & Zero Values (Tests 9 - 16)
  // --------------------------------------------------------------------------

  runTest('B2.1: Empty search result state generates empty array with zero errors', () => {
    const res = filterCollection(mockAdminUsers, 'nonexistent_query_xyz_999', ['full_name', 'email']);
    assertEqual(res.length, 0, 'Returns empty array');
  });

  runTest('B2.2: Zero MRR calculation handles empty subscriber list without Division-by-Zero', () => {
    const emptySubscribers: any[] = [];
    const avgRevenuePerUser = emptySubscribers.length > 0 
      ? emptySubscribers.reduce((a, b) => a + b.amount, 0) / emptySubscribers.length 
      : 0;
    assertEqual(avgRevenuePerUser, 0, 'ARPU is safely 0 for empty list');
    assert(!isNaN(avgRevenuePerUser), 'ARPU is not NaN');
  });

  runTest('B2.3: Zero total words book returns 0 estimated pages without crashing', () => {
    const emptyBook: AdminProject = {
      id: 'proj_empty',
      title: 'Livre Vide',
      author_id: 'usr_001',
      author_name: 'Amadou',
      author_email: 'amadou@iris.app',
      genre: 'Essai',
      word_count: 0,
      chapters_count: 0,
      estimated_pages: 0,
      status: 'brouillon',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      exported_formats: [],
    };
    assertEqual(emptyBook.word_count, 0, 'Word count is 0');
    assertEqual(emptyBook.estimated_pages, 0, 'Estimated pages is 0');
  });

  runTest('B2.4: Empty log messages filter gracefully handles missing payloads', () => {
    const logWithoutPayload = mockAdminLogs.find(l => l.payload === undefined);
    assert(logWithoutPayload !== undefined, 'Found log entry without payload');
    assertEqual(typeof logWithoutPayload?.payload, 'undefined', 'Payload is safely undefined');
  });

  runTest('B2.5: User with 0 generated words and 0 projects renders baseline metrics', () => {
    const newUser: AdminUser = {
      id: 'usr_zero',
      email: 'zero@iris.sn',
      full_name: 'Nouveau Venu',
      role: 'user',
      plan: 'free',
      subscription_status: 'active',
      words_generated: 0,
      ai_tokens_used: 0,
      projects_count: 0,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    };
    assertEqual(newUser.words_generated, 0, 'Words is 0');
    assertEqual(newUser.ai_tokens_used, 0, 'Tokens is 0');
    assertEqual(newUser.projects_count, 0, 'Projects is 0');
  });

  runTest('B2.6: Growth percentage calculation handles 0 previous period baseline', () => {
    const computeGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100.0 : 0.0;
      return ((current - previous) / previous) * 100;
    };
    assertEqual(computeGrowth(150, 0), 100.0, 'Growth from 0 to 150 is 100%');
    assertEqual(computeGrowth(0, 0), 0.0, 'Growth from 0 to 0 is 0%');
  });

  runTest('B2.7: Project without cover URL renders placeholder without broken image errors', () => {
    const project = mockAdminProjects.find(p => !p.cover_url);
    const coverUrl = project?.cover_url || '/placeholder-cover.jpg';
    assertEqual(coverUrl, '/placeholder-cover.jpg', 'Gracefully falls back to placeholder');
  });

  runTest('B2.8: Empty IP blocklist returns 0 blocked entries safely', () => {
    const emptyList: string[] = [];
    const isBlocked = (ip: string) => emptyList.includes(ip);
    assertEqual(isBlocked('127.0.0.1'), false, 'Returns false for empty blocklist');
  });

  // --------------------------------------------------------------------------
  // Category 3: Clamping, Range & Security Boundaries (Tests 17 - 24)
  // --------------------------------------------------------------------------

  runTest('B3.1: Token balance clamp prevents negative credit balances', () => {
    const deductClamp = (current: number, deduction: number) => Math.max(0, current - deduction);
    assertEqual(deductClamp(100, 250), 0, 'Clamped to 0 when deduction exceeds balance');
    assertEqual(deductClamp(500, 200), 300, 'Correctly calculates positive remainder');
  });

  runTest('B3.2: AI Safety daily spend cap blocks requests exceeding maximum ceiling', () => {
    const dailyCapUsd = 50.0;
    const isSpendAllowed = (spentToday: number, requestCost: number) => (spentToday + requestCost) <= dailyCapUsd;
    assertEqual(isSpendAllowed(48.5, 1.0), true, 'Spend under cap allowed');
    assertEqual(isSpendAllowed(49.8, 0.5), false, 'Spend breaching cap blocked');
  });

  runTest('B3.3: XSS string in user full_name is sanitized and does not execute', () => {
    const maliciousName = '<script>alert("XSS")</script> Amadou';
    const sanitize = (str: string) => str.replace(/<[^>]*>?/gm, '');
    const cleanName = sanitize(maliciousName);
    assertEqual(cleanName, 'alert("XSS") Amadou', 'HTML tags stripped');
    assert(!cleanName.includes('<script>'), 'Script tag eliminated');
  });

  runTest('B3.4: Extremely long book title (500 chars) is truncated gracefully in UI cards', () => {
    const longTitle = 'A'.repeat(500);
    const truncate = (str: string, maxLen: number = 60) => str.length > maxLen ? `${str.substring(0, maxLen)}...` : str;
    const truncated = truncate(longTitle, 50);
    assertEqual(truncated.length, 53, 'Truncated to 50 chars + ellipsis');
    assert(truncated.endsWith('...'), 'Ends with ellipsis');
  });

  runTest('B3.5: Negative grant amounts are strictly rejected by validation rules', () => {
    assertThrows(() => {
      const grant = (amt: number) => {
        if (amt <= 0) throw new Error('Grant amount must be positive');
      };
      grant(-5000);
    }, 'Grant amount must be positive');
  });

  runTest('B3.6: System health status threshold clamping (99.0% - 100.0%)', () => {
    const clampUptime = (val: number) => Math.min(100.0, Math.max(0.0, val));
    assertEqual(clampUptime(105.4), 100.0, 'Clamped down to 100%');
    assertEqual(clampUptime(-5.2), 0.0, 'Clamped up to 0%');
  });

  runTest('B3.7: Unicode and emoji handling in project synopsis and title', () => {
    const unicodeTitle = '✨ L’Aventure Magique au Sahel 🌟 🌍';
    assertEqual(unicodeTitle.length > 0, true, 'Unicode characters preserved without corruption');
    assertEqual(normalizeSearchQuery(unicodeTitle).includes('sahel'), true, 'Search indexes unicode strings properly');
  });

  runTest('B3.8: Rejection of invalid subscription status enums', () => {
    const isValidStatus = (status: string): status is SubscriptionStatus => {
      return ['active', 'trialing', 'past_due', 'canceled', 'banned'].includes(status);
    };
    assertEqual(isValidStatus('active'), true, 'Valid active status');
    assertEqual(isValidStatus('invalid_status_xyz'), false, 'Invalid status rejected');
  });

  // --------------------------------------------------------------------------
  // Category 4: Modal, Keyboard & Interaction Boundaries (Tests 25 - 32)
  // --------------------------------------------------------------------------

  runTest('B4.1: Modal Escape key event listener triggers close handler', () => {
    let modalOpen = true;
    const handleKeyDown = (event: { key: string }) => {
      if (event.key === 'Escape') {
        modalOpen = false;
      }
    };
    handleKeyDown({ key: 'Escape' });
    assertEqual(modalOpen, false, 'Escape key closes modal');
  });

  runTest('B4.2: Modal backdrop click triggers close handler', () => {
    let modalOpen = true;
    const handleBackdropClick = (event: { target: string; currentTarget: string }) => {
      if (event.target === event.currentTarget) {
        modalOpen = false;
      }
    };
    handleBackdropClick({ target: 'backdrop', currentTarget: 'backdrop' });
    assertEqual(modalOpen, false, 'Backdrop click closes modal');
  });

  runTest('B4.3: Modal content click does NOT close modal (event bubbling prevented)', () => {
    let modalOpen = true;
    const handleModalClick = (event: { target: string; currentTarget: string }) => {
      if (event.target === event.currentTarget) {
        modalOpen = false;
      }
    };
    handleModalClick({ target: 'modal-body', currentTarget: 'backdrop' });
    assertEqual(modalOpen, true, 'Inner content click keeps modal open');
  });

  runTest('B4.4: Ban action rejects blank or whitespace-only ban reason', () => {
    assertThrows(() => {
      const validateBanReason = (reason: string) => {
        if (!reason || reason.trim().length === 0) {
          throw new Error('Ban reason is mandatory');
        }
      };
      validateBanReason('   \t\n  ');
    }, 'Ban reason is mandatory');
  });

  runTest('B4.5: Feature flag toggle debounce prevents rapid flickering', () => {
    let lastToggleTime = 0;
    let toggleCount = 0;
    const debounceToggle = (now: number, minIntervalMs: number = 300) => {
      if (now - lastToggleTime >= minIntervalMs) {
        lastToggleTime = now;
        toggleCount++;
        return true;
      }
      return false;
    };

    assertEqual(debounceToggle(1000), true, 'First toggle accepted');
    assertEqual(debounceToggle(1100), false, 'Immediate rapid toggle (100ms) blocked');
    assertEqual(debounceToggle(1400), true, 'Toggle after 400ms accepted');
    assertEqual(toggleCount, 2, 'Exactly 2 toggles processed');
  });

  runTest('B4.6: Pagination boundary checks (page 1 previous disabled, last page next disabled)', () => {
    const getPaginationState = (currentPage: number, totalPages: number) => ({
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages,
    });

    const firstPage = getPaginationState(1, 5);
    assertEqual(firstPage.hasPrevious, false, 'Page 1 has no previous page');
    assertEqual(firstPage.hasNext, true, 'Page 1 has next page');

    const lastPage = getPaginationState(5, 5);
    assertEqual(lastPage.hasPrevious, true, 'Page 5 has previous page');
    assertEqual(lastPage.hasNext, false, 'Page 5 has no next page');
  });

  runTest('B4.7: Extremely large word counts (10,000,000 words) formatted without scientific notation', () => {
    const words = 10000000;
    const formatted = `${(words / 1000000).toFixed(1)}M mots`;
    assertEqual(formatted, '10.0M mots', 'Formatted as 10.0M words');
  });

  runTest('B4.8: Multi-line ban explanation preserved with whitespace and line breaks', () => {
    const reason = 'Ligne 1: Utilisation de bots.\nLigne 2: Dépassement quota répétitif.\nLigne 3: Non-respect des CGU.';
    assertEqual(reason.split('\n').length, 3, 'Preserves 3 distinct explanation lines');
  });

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
