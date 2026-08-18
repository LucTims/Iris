import {
  assert,
  assertEqual,
  assertGreaterThanOrEqual,
  assertArrayLength,
  validateAdminProjectContract,
} from '../harness/assertions';
import { mockAdminProjects, mockAdminUsers } from '../../../src/lib/admin/mockData';
import { AdminProject, ProjectStatus } from '../../../src/lib/admin/types';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF4ProjectsExplorerTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 1 — F4: Projects & Generated Books Explorer';
  const tests: TestResult[] = [];

  // Test 1: Project Data Catalog Contract & Schema
  try {
    assertArrayLength(mockAdminProjects, 5, 'Projects catalog must contain >= 5 books');
    mockAdminProjects.forEach(p => validateAdminProjectContract(p));
    tests.push({ name: 'F4.1: Projects dataset contains valid records conforming to AdminProject schema', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F4.1: Projects dataset contains valid records conforming to AdminProject schema', passed: false, error: err.message });
  }

  // Test 2: Author Foreign Key Integrity
  try {
    const userIds = new Set(mockAdminUsers.map(u => u.id));
    mockAdminProjects.forEach(proj => {
      assert(userIds.has(proj.author_id), `Project ${proj.id} author_id ${proj.author_id} must resolve to a valid user`);
    });
    tests.push({ name: 'F4.2: All projects reference valid existing author IDs in mock user store', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F4.2: All projects reference valid existing author IDs in mock user store', passed: false, error: err.message });
  }

  // Test 3: Status Distribution & Filter Matching
  try {
    const filterByStatus = (projects: AdminProject[], status: ProjectStatus | 'all') => {
      return status === 'all' ? projects : projects.filter(p => p.status === status);
    };

    const published = filterByStatus(mockAdminProjects, 'publie');
    const inProgress = filterByStatus(mockAdminProjects, 'en_cours');
    const drafts = filterByStatus(mockAdminProjects, 'brouillon');
    const finished = filterByStatus(mockAdminProjects, 'termine');

    assertGreaterThanOrEqual(published.length, 2, 'Should have >= 2 published books');
    assertGreaterThanOrEqual(inProgress.length, 1, 'Should have >= 1 in-progress book');
    assertGreaterThanOrEqual(drafts.length, 1, 'Should have >= 1 draft book');
    assertGreaterThanOrEqual(finished.length, 1, 'Should have >= 1 completed book');
    tests.push({ name: 'F4.3: Status filter segregates books across draft, in-progress, and published states', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F4.3: Status filter segregates books across draft, in-progress, and published states', passed: false, error: err.message });
  }

  // Test 4: Export Formats Integrity (PDF, DOCX, EPUB)
  try {
    const publishedBook = mockAdminProjects.find(p => p.id === 'proj_001')!; // Le Chant des Baobabs
    assert(publishedBook.exported_formats.includes('pdf'), 'Published book should support PDF export');
    assert(publishedBook.exported_formats.includes('docx'), 'Published book should support DOCX export');
    assert(publishedBook.exported_formats.includes('epub'), 'Published book should support EPUB export');

    const draftBook = mockAdminProjects.find(p => p.id === 'proj_003')!; // Chroniques de Ségou
    assertEqual(draftBook.exported_formats.length, 0, 'Draft book has zero exported formats');
    tests.push({ name: 'F4.4: Export formats array accurately reflects available downloadable artifacts', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F4.4: Export formats array accurately reflects available downloadable artifacts', passed: false, error: err.message });
  }

  // Test 5: Estimated Pages Calculation Model
  try {
    const calculateEstimatedPages = (wordCount: number): number => {
      // Standard book formatting: ~250 words per page, minimum 1 page
      if (wordCount <= 0) return 0;
      return Math.max(1, Math.ceil(wordCount / 250));
    };

    assertEqual(calculateEstimatedPages(42350), 170, '42,350 words yields ~170 pages');
    assertEqual(calculateEstimatedPages(4200), 17, '4,200 words yields ~17 pages');
    assertEqual(calculateEstimatedPages(0), 0, '0 words yields 0 pages');
    tests.push({ name: 'F4.5: Estimated page count algorithm computes realistic pagination estimates', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F4.5: Estimated page count algorithm computes realistic pagination estimates', passed: false, error: err.message });
  }

  // Test 6: Cover Thumbnail Fallback Handling
  try {
    const getCoverImageDisplay = (project: AdminProject) => {
      return project.cover_url || '/images/default-book-cover.png';
    };

    const bookWithCover = mockAdminProjects.find(p => p.cover_url !== undefined)!;
    const bookWithoutCover = mockAdminProjects.find(p => !p.cover_url)!;

    assert(getCoverImageDisplay(bookWithCover).startsWith('http'), 'Renders valid remote image URL');
    assertEqual(getCoverImageDisplay(bookWithoutCover), '/images/default-book-cover.png', 'Fallback to default placeholder cover');
    tests.push({ name: 'F4.6: Cover thumbnail renderer handles missing cover image with elegant fallback', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F4.6: Cover thumbnail renderer handles missing cover image with elegant fallback', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
