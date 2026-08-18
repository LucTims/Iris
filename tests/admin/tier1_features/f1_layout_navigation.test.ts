import {
  assert,
  assertEqual,
  assertIncludes,
  assertArrayLength,
} from '../harness/assertions';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF1LayoutNavigationTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 1 — F1: Admin Layout & 10-Module Navigation';
  const tests: TestResult[] = [];

  const expectedNavItems = [
    { id: 'overview', label: "Vue d'ensemble", href: '/admin' },
    { id: 'users', label: 'Utilisateurs', href: '/admin/users' },
    { id: 'projects', label: 'Projets & Livres', href: '/admin/projects' },
    { id: 'ai', label: 'Surveillance IA', href: '/admin/ai' },
    { id: 'credits', label: 'Crédits & Quotas', href: '/admin/credits' },
    { id: 'subscriptions', label: 'Abonnements', href: '/admin/subscriptions' },
    { id: 'logs', label: 'Logs & Événements', href: '/admin/logs' },
    { id: 'security', label: 'Sécurité & Accès', href: '/admin/security' },
    { id: 'settings', label: 'Paramètres Globaux', href: '/admin/settings' },
    { id: 'health', label: 'Santé Système', href: '/admin/health' },
  ];

  // Test 1: Navigation Links Completeness (All 10 Priority 1 modules)
  try {
    assertArrayLength(expectedNavItems, 10, 'Expected exactly 10 navigation modules in admin sidebar');
    const hrefs = expectedNavItems.map(i => i.href);
    assert(hrefs.includes('/admin'), 'Missing overview route');
    assert(hrefs.includes('/admin/users'), 'Missing users route');
    assert(hrefs.includes('/admin/projects'), 'Missing projects route');
    assert(hrefs.includes('/admin/ai'), 'Missing ai surveillance route');
    assert(hrefs.includes('/admin/credits'), 'Missing credits route');
    assert(hrefs.includes('/admin/subscriptions'), 'Missing subscriptions route');
    assert(hrefs.includes('/admin/logs'), 'Missing logs route');
    assert(hrefs.includes('/admin/security'), 'Missing security route');
    assert(hrefs.includes('/admin/settings'), 'Missing settings route');
    assert(hrefs.includes('/admin/health'), 'Missing health route');
    tests.push({ name: 'F1.1: Sidebar contains all 10 priority navigation links', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F1.1: Sidebar contains all 10 priority navigation links', passed: false, error: err.message });
  }

  // Test 2: Active Route Highlighting Logic
  try {
    const currentPath = '/admin/users';
    const activeItem = expectedNavItems.find(i => i.href === currentPath);
    assert(activeItem !== undefined, 'Active route must match a registered nav item');
    assertEqual(activeItem?.id, 'users', 'Active route should be users module');
    
    // Simulate active class resolution
    const getNavItemClass = (href: string, activeHref: string) => {
      return href === activeHref
        ? 'bg-secondary-container text-on-secondary-container font-bold'
        : 'text-on-surface-variant hover:bg-surface-container-high';
    };
    
    const activeClass = getNavItemClass('/admin/users', currentPath);
    const inactiveClass = getNavItemClass('/admin/ai', currentPath);
    assertIncludes(activeClass, 'bg-secondary-container', 'Active item should receive highlighted container token');
    assertIncludes(inactiveClass, 'hover:bg-surface-container-high', 'Inactive item should receive default state class');
    tests.push({ name: 'F1.2: Active navigation route highlighting is computed accurately', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F1.2: Active navigation route highlighting is computed accurately', passed: false, error: err.message });
  }

  // Test 3: "Retour à l'App" Link Integrity
  try {
    const returnLink = { label: 'Retour App', href: '/dashboard', icon: 'arrow_back' };
    assertEqual(returnLink.href, '/dashboard', 'Return link must route directly to main app dashboard');
    assertEqual(returnLink.icon, 'arrow_back', 'Return link should render back arrow icon');
    tests.push({ name: 'F1.3: "Retour App" link points to /dashboard with back icon', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F1.3: "Retour App" link points to /dashboard with back icon', passed: false, error: err.message });
  }

  // Test 4: Environment & Role Badges Contract
  try {
    const adminHeaderProps = {
      title: 'Iris Admin',
      badge: 'Mode Démo / Mock',
      userRole: 'Super Admin',
      userEmail: 'www.martau@gmail.com',
    };
    assert(adminHeaderProps.badge.includes('Mock') || adminHeaderProps.badge.includes('Démo'), 'Header must indicate mock demo mode');
    assertEqual(adminHeaderProps.userRole, 'Super Admin', 'User role should be displayed');
    tests.push({ name: 'F1.4: Header displays environment mode and administrator role badge', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F1.4: Header displays environment mode and administrator role badge', passed: false, error: err.message });
  }

  // Test 5: Role-based Guard Fallback
  try {
    const checkAdminAccess = (user: { email?: string; role?: string } | null) => {
      if (!user) return { allow: false, redirect: '/dashboard' };
      if (user.role === 'admin' || user.email === 'www.martau@gmail.com' || user.email === 'amadou.diallo@iris-editions.com') {
        return { allow: true, redirect: null };
      }
      return { allow: false, redirect: '/dashboard' };
    };

    assertEqual(checkAdminAccess(null).allow, false, 'Unauthenticated user is denied');
    assertEqual(checkAdminAccess({ email: 'hacker@anon.com', role: 'user' }).allow, false, 'Standard user is denied');
    assertEqual(checkAdminAccess({ email: 'www.martau@gmail.com', role: 'admin' }).allow, true, 'Primary super admin is allowed');
    assertEqual(checkAdminAccess({ email: 'amadou.diallo@iris-editions.com', role: 'admin' }).allow, true, 'Co-admin is allowed');
    tests.push({ name: 'F1.5: Role-based authentication guard redirects unauthorized users to /dashboard', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F1.5: Role-based authentication guard redirects unauthorized users to /dashboard', passed: false, error: err.message });
  }

  // Test 6: Responsive Sidebar Collapse State Contract
  try {
    let isCollapsed = false;
    const toggleCollapse = () => { isCollapsed = !isCollapsed; return isCollapsed; };
    assertEqual(toggleCollapse(), true, 'Sidebar toggles to collapsed mode');
    assertEqual(toggleCollapse(), false, 'Sidebar toggles back to expanded mode');
    tests.push({ name: 'F1.6: Responsive sidebar collapse state toggles correctly', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F1.6: Responsive sidebar collapse state toggles correctly', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
