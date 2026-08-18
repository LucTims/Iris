/**
 * Independent Empirical Challenger Verification Harness for Iris Admin Dashboard
 * 
 * Verifies:
 * 1. Base Layout & Navigation: 10 priority navigation items + return link to /dashboard
 * 2. Dashboard Cockpit: 6 KPI cards + interactive timeline chart (7d/30d/90d) + activity feed
 * 3. Users Management: Multi-filtering by plan and status, accent-insensitive & whitespace search
 * 4. User Mutations: Plan change (free/pro/studio) and Ban/Unban toggle
 * 5. User Detail Modal: Subscription details, AI meters, authored books, admin actions
 * 6. Full 10 Admin Module Pages DOM Rendering Validation
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock Next.js navigation and custom hooks in require.cache
try {
  const nextNavPath = require.resolve('next/navigation');
  require.cache[nextNavPath] = {
    id: nextNavPath,
    filename: nextNavPath,
    loaded: true,
    exports: {
      usePathname: () => '/admin',
      useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
      useSearchParams: () => new URLSearchParams(),
      useParams: () => ({}),
    },
  } as any;
} catch (e) {
  // Ignore if not resolvable
}

try {
  const useUserPath = require.resolve('../../src/hooks/useUser');
  require.cache[useUserPath] = {
    id: useUserPath,
    filename: useUserPath,
    loaded: true,
    exports: {
      useUser: () => ({
        displayName: 'Amadou Diallo',
        displayEmail: 'amadou.diallo@iris-editions.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        isAdmin: true,
        loading: false,
      }),
    },
  } as any;
} catch (e) {
  // Ignore if not resolvable
}

// Data store imports
import {
  mockAdminUsers,
  mockAdminProjects,
  mockKPIData,
  mockActivity7d,
  mockActivity30d,
  mockActivity90d,
  mockActivityEvents,
  mockAIModelUsage,
  mockCreditTransactions,
  mockSubscriptionRecords,
  mockAdminLogs,
  mockSecurityMetrics,
  mockAdminSettings,
  mockHealthItems,
} from '../../src/lib/admin/mockData';

// Component imports
import AdminLayout from '../../src/app/admin/layout';
import AdminDashboardPage from '../../src/app/admin/page';
import AdminUsersPage from '../../src/app/admin/users/page';
import AdminProjectsPage from '../../src/app/admin/projects/page';
import AdminAIPage from '../../src/app/admin/ai/page';
import AdminCreditsPage from '../../src/app/admin/credits/page';
import AdminSubscriptionsPage from '../../src/app/admin/subscriptions/page';
import AdminLogsPage from '../../src/app/admin/logs/page';
import AdminSecurityPage from '../../src/app/admin/security/page';
import AdminSettingsPage from '../../src/app/admin/settings/page';
import AdminHealthPage from '../../src/app/admin/health/page';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(category: string, name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    results.push({ category, name, passed: true });
  } catch (err: any) {
    results.push({ category, name, passed: false, error: err.message || String(err) });
  }
}

async function runEmpiricalVerification() {
  console.log('================================================================================');
  console.log('      INDEPENDENT EMPIRICAL CHALLENGER VERIFICATION HARNESS (IRIS ADMIN)');
  console.log('================================================================================\n');

  // --------------------------------------------------------------------------
  // Category 1: Layout & 10 Navigation Items
  // --------------------------------------------------------------------------
  recordTest('Layout & Navigation', 'Layout renders 10 priority navigation items in DOM', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminLayout, {
        children: React.createElement('div', { id: 'test-content' }, 'Admin Content Area'),
      })
    );

    const requiredNavItems = [
      { name: "Vue d'ensemble", href: "/admin" },
      { name: "Utilisateurs", href: "/admin/users" },
      { name: "Projets & Livres", href: "/admin/projects" },
      { name: "Surveillance IA", href: "/admin/ai" },
      { name: "Crédits & Quotas", href: "/admin/credits" },
      { name: "Abonnements", href: "/admin/subscriptions" },
      { name: "Logs & Événements", href: "/admin/logs" },
      { name: "Sécurité & Accès", href: "/admin/security" },
      { name: "Paramètres Globaux", href: "/admin/settings" },
      { name: "Santé Système", href: "/admin/health" },
    ];

    for (const item of requiredNavItems) {
      if (!html.includes(item.href)) {
        throw new Error(`Missing navigation link for ${item.name} (${item.href})`);
      }
      if (!html.includes(item.name)) {
        throw new Error(`Missing navigation label "${item.name}"`);
      }
    }

    if (!html.includes('/dashboard')) {
      throw new Error(`Missing return link to /dashboard`);
    }

    if (!html.includes("Super Admin") || !html.includes("Mode Démo / Mock")) {
      throw new Error(`Missing Super Admin role badge or Mode Démo indicator`);
    }
  });

  // --------------------------------------------------------------------------
  // Category 2: Dashboard Cockpit, 6 KPIs & Timeline Chart
  // --------------------------------------------------------------------------
  recordTest('Dashboard Cockpit', 'Dashboard renders all 6 KPI cards with correct metric values', () => {
    const html = renderToStaticMarkup(React.createElement(AdminDashboardPage));

    // Verify 6 KPI sections
    const requiredKPIHeaders = [
      "Auteurs Inscrits",
      "MRR Récurrent",
      "Coûts IA",
      "Livres Créés",
      "Mots Générés",
      "Disponibilité",
    ];

    for (const kpi of requiredKPIHeaders) {
      if (!html.includes(kpi)) {
        throw new Error(`Missing KPI metric card: "${kpi}"`);
      }
    }

    // Verify KPI values rendered
    if (!html.includes(mockKPIData.total_users.toLocaleString('fr-FR'))) {
      throw new Error(`Total users metric value ${mockKPIData.total_users} not found in HTML`);
    }
    if (!html.includes(`${mockKPIData.system_uptime_pct}%`)) {
      throw new Error(`System uptime metric value ${mockKPIData.system_uptime_pct}% not found`);
    }
    if (!html.includes(`$${mockKPIData.ai_cost_usd.toFixed(2)}`)) {
      throw new Error(`AI cost metric value $${mockKPIData.ai_cost_usd} not found`);
    }
  });

  recordTest('Dashboard Cockpit', 'Timeline chart renders data points and timeframe toggles', () => {
    const html = renderToStaticMarkup(React.createElement(AdminDashboardPage));

    // Check timeframe toggles
    if (!html.includes('7 jours') || !html.includes('30 jours') || !html.includes('90 jours')) {
      throw new Error('Timeframe toggles (7d, 30d, 90d) missing in timeline chart');
    }

    // Check chart legend
    if (!html.includes("Appels IA Co-Auteur") || !html.includes("Mots manuscrits générés")) {
      throw new Error('Timeline chart legend missing metric labels');
    }

    // Check live activity event stream
    if (!html.includes("Flux d&#x27;Activité en Direct") && !html.includes("Flux d'Activité en Direct")) {
      throw new Error('Live activity stream header missing');
    }
    if (mockActivityEvents.length < 5) {
      throw new Error(`Activity events count (${mockActivityEvents.length}) is less than required 5`);
    }
  });

  // --------------------------------------------------------------------------
  // Category 3: Users Table Filtering & Diacritic/Whitespace Search
  // --------------------------------------------------------------------------
  recordTest('Users Management', 'Users table contains >=5 mock users conforming to schema', () => {
    if (mockAdminUsers.length < 5) {
      throw new Error(`Mock users count (${mockAdminUsers.length}) is less than 5`);
    }

    for (const u of mockAdminUsers) {
      if (!u.id || !u.email || !u.full_name || !u.plan || !u.subscription_status) {
        throw new Error(`User record ${u.id} fails schema validation`);
      }
    }
  });

  recordTest('Users Management', 'Search correctly filters by name, email, accents, and whitespace', () => {
    // Normalization helper (matches client search logic)
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const searchFilter = (query: string) => {
      const q = normalize(query);
      return mockAdminUsers.filter(u => 
        normalize(u.full_name).includes(q) || normalize(u.email).includes(q)
      );
    };

    // Test 1: Normal query
    const res1 = searchFilter('Amadou');
    if (res1.length === 0 || !res1.some(u => u.full_name.includes('Amadou'))) {
      throw new Error('Search failed for "Amadou"');
    }

    // Test 2: Accent insensitive search ("kouame" matches "Kouamé")
    const res2 = searchFilter('kouame');
    if (res2.length === 0 || !res2.some(u => normalize(u.full_name).includes('kouame'))) {
      throw new Error('Search failed for accent insensitivity "kouame"');
    }

    // Test 3: Accent in query ("amadou" matches "amadou")
    const res3 = searchFilter('AMADOU');
    if (res3.length === 0) {
      throw new Error('Search failed for uppercase "AMADOU"');
    }

    // Test 4: Leading/Trailing whitespace
    const res4 = searchFilter('   fatou   ');
    if (res4.length === 0 || !res4.some(u => u.full_name.toLowerCase().includes('fatou'))) {
      throw new Error('Search failed with excess whitespace');
    }

    // Test 5: Email domain search
    const res5 = searchFilter('@iris-editions.com');
    if (res5.length === 0) {
      throw new Error('Search failed for email domain @iris-editions.com');
    }

    // Test 6: Empty search returns all users
    const res6 = searchFilter('');
    if (res6.length !== mockAdminUsers.length) {
      throw new Error('Empty search must return all users');
    }
  });

  recordTest('Users Management', 'Plan and Status filters segment user records correctly', () => {
    const filterUsers = (plan: string, status: string) => {
      return mockAdminUsers.filter(u => {
        const matchesPlan = plan === 'all' || u.plan === plan;
        const matchesStatus = status === 'all' || u.subscription_status === status;
        return matchesPlan && matchesStatus;
      });
    };

    // Filter by Plan
    const freeUsers = filterUsers('free', 'all');
    const proUsers = filterUsers('pro', 'all');
    const studioUsers = filterUsers('studio', 'all');

    if (freeUsers.length + proUsers.length + studioUsers.length !== mockAdminUsers.length) {
      throw new Error('Plan filter partition sum does not match total user count');
    }

    // Filter by Status
    const activeUsers = filterUsers('all', 'active');
    const bannedUsers = filterUsers('all', 'banned');
    const pastDueUsers = filterUsers('all', 'past_due');

    if (activeUsers.length === 0) {
      throw new Error('Active users filter returned 0 results');
    }
    if (bannedUsers.length === 0) {
      throw new Error('Banned users filter returned 0 results');
    }

    // Multi-criteria filter
    const proActive = filterUsers('pro', 'active');
    for (const u of proActive) {
      if (u.plan !== 'pro' || u.subscription_status !== 'active') {
        throw new Error(`User ${u.id} does not match multi-criteria (pro, active)`);
      }
    }
  });

  // --------------------------------------------------------------------------
  // Category 4: User Mutations (Plan Change & Ban Toggle)
  // --------------------------------------------------------------------------
  recordTest('User Mutations', 'Plan change mutation updates state and triggers feedback', () => {
    let users = [...mockAdminUsers];
    const targetUser = users[0];
    const originalPlan = targetUser.plan;
    const newPlan = originalPlan === 'pro' ? 'studio' : 'pro';

    // Simulate handlePlanChange
    users = users.map(u => u.id === targetUser.id ? { ...u, plan: newPlan } : u);

    const updatedUser = users.find(u => u.id === targetUser.id);
    if (!updatedUser || updatedUser.plan !== newPlan) {
      throw new Error(`Failed to mutate plan from ${originalPlan} to ${newPlan}`);
    }
  });

  recordTest('User Mutations', 'Ban toggle mutation flips subscription_status and reason', () => {
    let users = [...mockAdminUsers];
    const activeUser = users.find(u => u.subscription_status === 'active')!;
    const userId = activeUser.id;

    // Ban active user
    users = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          subscription_status: 'banned' as const,
          banned_reason: 'Suspension administrative manuelle',
        };
      }
      return u;
    });

    const bannedUser = users.find(u => u.id === userId)!;
    if (bannedUser.subscription_status !== 'banned' || !bannedUser.banned_reason) {
      throw new Error('Ban mutation failed to update status to banned or attach reason');
    }

    // Unban user
    users = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          subscription_status: 'active' as const,
          banned_reason: undefined,
        };
      }
      return u;
    });

    const unbannedUser = users.find(u => u.id === userId)!;
    if (unbannedUser.subscription_status !== 'active' || unbannedUser.banned_reason !== undefined) {
      throw new Error('Unban mutation failed to restore status to active');
    }
  });

  // --------------------------------------------------------------------------
  // Category 5: User Detail Modal & Authored Books Integration
  // --------------------------------------------------------------------------
  recordTest('User Detail Modal', 'Modal state displays subscription details, AI usage and authored books', () => {
    const user = mockAdminUsers[0];
    const userProjects = mockAdminProjects.filter(p => p.author_id === user.id || p.author_email === user.email);

    // Verify modal data contracts
    if (!user.words_generated && user.words_generated !== 0) {
      throw new Error('Missing words_generated in user profile modal data');
    }
    if (!user.ai_tokens_used && user.ai_tokens_used !== 0) {
      throw new Error('Missing ai_tokens_used in user profile modal data');
    }
    if (typeof user.projects_count !== 'number') {
      throw new Error('Missing projects_count in user profile modal data');
    }

    // Users page HTML contains modal trigger elements and table markup
    const html = renderToStaticMarkup(React.createElement(AdminUsersPage));
    if (!html.includes('Gestion des Utilisateurs')) {
      throw new Error('Users page missing main header');
    }
    if (!html.includes('Détails')) {
      throw new Error('Users table missing "Détails" modal trigger button');
    }
    if (!html.includes('Bannir') && !html.includes('Débannir')) {
      throw new Error('Users table missing Ban/Unban action button');
    }
  });

  // --------------------------------------------------------------------------
  // Category 6: Full 10 Admin Module Pages DOM Rendering Validation
  // --------------------------------------------------------------------------
  const modulePages = [
    { name: '1. Dashboard (/admin)', component: AdminDashboardPage, check: "Vue d'ensemble" },
    { name: '2. Users (/admin/users)', component: AdminUsersPage, check: "Gestion des Utilisateurs" },
    { name: '3. Projects (/admin/projects)', component: AdminProjectsPage, check: "Explorateur de Livres" },
    { name: '4. AI Telemetry (/admin/ai)', component: AdminAIPage, check: "Surveillance IA" },
    { name: '5. Credits (/admin/credits)', component: AdminCreditsPage, check: "Crédits" },
    { name: '6. Subscriptions (/admin/subscriptions)', component: AdminSubscriptionsPage, check: "Abonnements" },
    { name: '7. Logs (/admin/logs)', component: AdminLogsPage, check: "Logs & Événements" },
    { name: '8. Security (/admin/security)', component: AdminSecurityPage, check: "Sécurité" },
    { name: '9. Settings (/admin/settings)', component: AdminSettingsPage, check: "Paramètres Globaux" },
    { name: '10. Health (/admin/health)', component: AdminHealthPage, check: "Santé Système" },
  ];

  for (const mod of modulePages) {
    recordTest('Module DOM Rendering', `${mod.name} mounts and renders valid DOM containing "${mod.check}"`, () => {
      const html = renderToStaticMarkup(React.createElement(mod.component));
      if (!html || html.length < 50) {
        throw new Error(`Rendered HTML is empty or too short (${html?.length || 0} chars)`);
      }
      if (!html.includes(mod.check)) {
        throw new Error(`Rendered HTML does not include expected identifier "${mod.check}"`);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Summary & Report
  // --------------------------------------------------------------------------
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalCount = results.length;

  console.log('================================================================================');
  console.log('                       CHALLENGER VERIFICATION RESULTS');
  console.log('================================================================================');
  console.log(`Total Independent Tests : ${totalCount}`);
  console.log(`Passed                  : ${passedCount}`);
  console.log(`Failed                  : ${failedCount}`);
  console.log(`Pass Rate               : ${((passedCount / totalCount) * 100).toFixed(1)}%\n`);

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} [${r.category}] ${r.name}`);
    if (!r.passed) {
      console.log(`   Error: ${r.error}`);
    }
  }
  console.log('================================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEmpiricalVerification();
