/**
 * Iris Admin Dashboard — Test Assertion & Contract Inspection Harness
 * 
 * Provides zero-dependency assertion utilities, deep object comparisons,
 * schema validators, and entity contract inspectors for all admin modules.
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new AssertionError(`❌ ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new AssertionError(
      `❌ ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`
    );
  }
}

export function assertNotEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    throw new AssertionError(
      `❌ ${message}\n  Expected values to differ, but both were: ${JSON.stringify(actual)}`
    );
  }
}

export function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new AssertionError(
      `❌ ${message}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`
    );
  }
}

export function assertIncludes(actual: string, expectedSubstring: string, message: string): void {
  if (!actual || !actual.includes(expectedSubstring)) {
    throw new AssertionError(
      `❌ ${message}\n  Expected string to include: "${expectedSubstring}"\n  Actual content: "${actual?.substring(0, 300)}..."`
    );
  }
}

export function assertNotIncludes(actual: string, forbiddenSubstring: string, message: string): void {
  if (actual && actual.includes(forbiddenSubstring)) {
    throw new AssertionError(
      `❌ ${message}\n  Expected string NOT to include: "${forbiddenSubstring}"\n  Actual content: "${actual?.substring(0, 300)}..."`
    );
  }
}

export function assertMatches(actual: string, regex: RegExp, message: string): void {
  if (!regex.test(actual)) {
    throw new AssertionError(
      `❌ ${message}\n  Expected string to match pattern: ${regex}\n  Actual: "${actual?.substring(0, 300)}..."`
    );
  }
}

export function assertGreaterThanOrEqual(actual: number, expected: number, message: string): void {
  if (actual < expected) {
    throw new AssertionError(
      `❌ ${message}\n  Expected ${actual} >= ${expected}`
    );
  }
}

export function assertLessThanOrEqual(actual: number, expected: number, message: string): void {
  if (actual > expected) {
    throw new AssertionError(
      `❌ ${message}\n  Expected ${actual} <= ${expected}`
    );
  }
}

export function assertBetween(actual: number, min: number, max: number, message: string): void {
  if (actual < min || actual > max) {
    throw new AssertionError(
      `❌ ${message}\n  Expected ${actual} to be in range [${min}, ${max}]`
    );
  }
}

export async function assertThrowsAsync(
  fn: () => Promise<any>,
  expectedMessageSubstring?: string
): Promise<void> {
  let threw = false;
  let caughtError: any = null;
  try {
    await fn();
  } catch (err) {
    threw = true;
    caughtError = err;
  }

  if (!threw) {
    throw new AssertionError(`❌ Expected async function to throw an error, but it succeeded.`);
  }

  if (expectedMessageSubstring && caughtError) {
    const msg = caughtError.message || String(caughtError);
    if (!msg.includes(expectedMessageSubstring)) {
      throw new AssertionError(
        `❌ Expected error message to include "${expectedMessageSubstring}", got "${msg}"`
      );
    }
  }
}

export function assertThrows(
  fn: () => any,
  expectedMessageSubstring?: string
): void {
  let threw = false;
  let caughtError: any = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    caughtError = err;
  }

  if (!threw) {
    throw new AssertionError(`❌ Expected function to throw an error, but it succeeded.`);
  }

  if (expectedMessageSubstring && caughtError) {
    const msg = caughtError.message || String(caughtError);
    if (!msg.includes(expectedMessageSubstring)) {
      throw new AssertionError(
        `❌ Expected error message to include "${expectedMessageSubstring}", got "${msg}"`
      );
    }
  }
}

export function assertArrayLength(arr: any[], minLength: number, message: string): void {
  assert(Array.isArray(arr), `${message}: Target must be an array`);
  assert(
    arr.length >= minLength,
    `${message}: Array length ${arr.length} is less than required minimum ${minLength}`
  );
}

export function assertArrayContains<T>(
  arr: T[],
  predicate: (item: T) => boolean,
  message: string
): void {
  assert(Array.isArray(arr), `${message}: Target must be an array`);
  const found = arr.some(predicate);
  assert(found, `❌ ${message}: No array element matched the required predicate`);
}

/**
 * Normalizes text for accent-insensitive search comparisons.
 */
export function normalizeSearchQuery(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filter utility matching the UI data table filtering algorithm.
 */
export function filterCollection<T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query || query.trim() === '') return items;
  const normalizedQuery = normalizeSearchQuery(query);
  return items.filter(item => {
    return fields.some(field => {
      const val = item[field];
      if (typeof val === 'string') {
        return normalizeSearchQuery(val).includes(normalizedQuery);
      }
      return false;
    });
  });
}

// ============================================================================
// Entity Contract Validators
// ============================================================================

export function validateAdminUserContract(user: any): boolean {
  assert(typeof user === 'object' && user !== null, 'AdminUser must be an object');
  assert(typeof user.id === 'string' && user.id.length > 0, 'AdminUser.id must be a non-empty string');
  assert(typeof user.email === 'string' && user.email.includes('@'), 'AdminUser.email must be a valid email');
  assert(typeof user.full_name === 'string' && user.full_name.length > 0, 'AdminUser.full_name must be valid');
  assert(['admin', 'user'].includes(user.role), `AdminUser.role must be admin|user (got ${user.role})`);
  assert(['free', 'pro', 'studio'].includes(user.plan), `AdminUser.plan must be valid (got ${user.plan})`);
  assert(
    ['active', 'trialing', 'past_due', 'canceled', 'banned'].includes(user.subscription_status),
    `AdminUser.subscription_status must be valid (got ${user.subscription_status})`
  );
  assert(typeof user.words_generated === 'number' && user.words_generated >= 0, 'words_generated must be >= 0');
  assert(typeof user.ai_tokens_used === 'number' && user.ai_tokens_used >= 0, 'ai_tokens_used must be >= 0');
  assert(typeof user.projects_count === 'number' && user.projects_count >= 0, 'projects_count must be >= 0');
  assert(!isNaN(Date.parse(user.created_at)), 'created_at must be valid ISO date string');
  assert(!isNaN(Date.parse(user.last_active)), 'last_active must be valid ISO date string');
  return true;
}

export function validateAdminProjectContract(project: any): boolean {
  assert(typeof project === 'object' && project !== null, 'AdminProject must be an object');
  assert(typeof project.id === 'string' && project.id.length > 0, 'AdminProject.id must be valid');
  assert(typeof project.title === 'string' && project.title.length > 0, 'AdminProject.title must be valid');
  assert(typeof project.author_id === 'string' && project.author_id.length > 0, 'AdminProject.author_id must be valid');
  assert(typeof project.author_name === 'string', 'AdminProject.author_name must be a string');
  assert(typeof project.author_email === 'string' && project.author_email.includes('@'), 'AdminProject.author_email must be valid');
  assert(typeof project.genre === 'string', 'AdminProject.genre must be a string');
  assert(typeof project.word_count === 'number' && project.word_count >= 0, 'word_count must be >= 0');
  assert(typeof project.chapters_count === 'number' && project.chapters_count >= 0, 'chapters_count must be >= 0');
  assert(typeof project.estimated_pages === 'number' && project.estimated_pages >= 0, 'estimated_pages must be >= 0');
  assert(
    ['brouillon', 'en_cours', 'termine', 'publie'].includes(project.status),
    `AdminProject.status must be valid (got ${project.status})`
  );
  assert(Array.isArray(project.exported_formats), 'exported_formats must be an array');
  assert(!isNaN(Date.parse(project.created_at)), 'created_at must be valid ISO date string');
  assert(!isNaN(Date.parse(project.updated_at)), 'updated_at must be valid ISO date string');
  return true;
}

export function validateAdminKPIDataContract(kpi: any): boolean {
  assert(typeof kpi === 'object' && kpi !== null, 'AdminKPIData must be an object');
  assert(typeof kpi.total_users === 'number' && kpi.total_users >= 0, 'total_users must be >= 0');
  assert(typeof kpi.users_growth_pct === 'number', 'users_growth_pct must be number');
  assert(typeof kpi.mrr_fcfa === 'number' && kpi.mrr_fcfa >= 0, 'mrr_fcfa must be >= 0');
  assert(typeof kpi.mrr_growth_pct === 'number', 'mrr_growth_pct must be number');
  assert(typeof kpi.ai_cost_usd === 'number' && kpi.ai_cost_usd >= 0, 'ai_cost_usd must be >= 0');
  assert(typeof kpi.ai_tokens_total === 'number' && kpi.ai_tokens_total >= 0, 'ai_tokens_total must be >= 0');
  assert(typeof kpi.total_projects === 'number' && kpi.total_projects >= 0, 'total_projects must be >= 0');
  assert(typeof kpi.projects_growth_pct === 'number', 'projects_growth_pct must be number');
  assert(typeof kpi.total_words_generated === 'number' && kpi.total_words_generated >= 0, 'total_words_generated must be >= 0');
  assert(typeof kpi.conversion_rate_pct === 'number' && kpi.conversion_rate_pct >= 0, 'conversion_rate_pct must be >= 0');
  assert(typeof kpi.system_uptime_pct === 'number' && kpi.system_uptime_pct <= 100, 'system_uptime_pct must be <= 100');
  return true;
}

export function validateAdminLogEntryContract(log: any): boolean {
  assert(typeof log === 'object' && log !== null, 'AdminLogEntry must be an object');
  assert(typeof log.id === 'string' && log.id.length > 0, 'AdminLogEntry.id must be valid');
  assert(!isNaN(Date.parse(log.timestamp)), 'timestamp must be valid ISO date string');
  assert(['INFO', 'WARN', 'ERROR', 'CRITICAL'].includes(log.level), `log.level must be valid (got ${log.level})`);
  assert(typeof log.service === 'string' && log.service.length > 0, 'log.service must be valid');
  assert(typeof log.endpoint === 'string' && log.endpoint.startsWith('/'), 'log.endpoint must start with /');
  assert(typeof log.status_code === 'number' && log.status_code >= 100, 'status_code must be valid HTTP status');
  assert(typeof log.ip_address === 'string' && log.ip_address.length > 0, 'ip_address must be valid');
  assert(typeof log.message === 'string' && log.message.length > 0, 'message must be valid');
  return true;
}

export function validateServiceHealthItemContract(health: any): boolean {
  assert(typeof health === 'object' && health !== null, 'ServiceHealthItem must be an object');
  assert(typeof health.id === 'string' && health.id.length > 0, 'ServiceHealthItem.id must be valid');
  assert(typeof health.name === 'string' && health.name.length > 0, 'ServiceHealthItem.name must be valid');
  assert(
    ['database', 'auth', 'ai', 'payment', 'runtime'].includes(health.category),
    `category must be valid (got ${health.category})`
  );
  assert(['operational', 'degraded', 'down'].includes(health.status), `status must be valid (got ${health.status})`);
  assert(typeof health.latency_ms === 'number' && health.latency_ms >= 0, 'latency_ms must be >= 0');
  assert(typeof health.uptime_pct === 'number' && health.uptime_pct <= 100, 'uptime_pct must be <= 100');
  assert(typeof health.details === 'string', 'details must be a string');
  return true;
}

export function validateAdminSettingsContract(settings: any): boolean {
  assert(typeof settings === 'object' && settings !== null, 'AdminSettingsState must be an object');
  assert(typeof settings.maintenance_banner === 'object', 'maintenance_banner must be an object');
  assert(typeof settings.maintenance_banner.enabled === 'boolean', 'maintenance_banner.enabled must be boolean');
  assert(typeof settings.maintenance_banner.message === 'string', 'maintenance_banner.message must be string');
  assert(
    ['info', 'warning', 'danger'].includes(settings.maintenance_banner.type),
    `maintenance_banner.type must be info|warning|danger (got ${settings.maintenance_banner.type})`
  );
  assert(typeof settings.feature_flags === 'object', 'feature_flags must be an object');
  assert(typeof settings.feature_flags.tiptap_v3_editor === 'boolean', 'tiptap_v3_editor must be boolean');
  assert(typeof settings.feature_flags.imagen_3_covers === 'boolean', 'imagen_3_covers must be boolean');
  assert(typeof settings.feature_flags.kdp_high_res_export === 'boolean', 'kdp_high_res_export must be boolean');
  assert(typeof settings.feature_flags.sebpay_wave_momo === 'boolean', 'sebpay_wave_momo must be boolean');
  assert(typeof settings.ai_safety === 'object', 'ai_safety must be an object');
  assert(typeof settings.ai_safety.max_tokens_per_request === 'number', 'max_tokens_per_request must be number');
  assert(typeof settings.ai_safety.daily_spend_cap_usd === 'number', 'daily_spend_cap_usd must be number');
  assert(Array.isArray(settings.admin_whitelist), 'admin_whitelist must be an array');
  return true;
}

export function validateActivityDataPointContract(point: any): boolean {
  assert(typeof point === 'object' && point !== null, 'ActivityDataPoint must be an object');
  assert(typeof point.date === 'string' && point.date.length > 0, 'ActivityDataPoint.date must be a valid non-empty string');
  assert(typeof point.ai_generations === 'number' && point.ai_generations >= 0, 'ai_generations must be >= 0');
  assert(typeof point.words_count === 'number' && point.words_count >= 0, 'words_count must be >= 0');
  assert(typeof point.new_projects === 'number' && point.new_projects >= 0, 'new_projects must be >= 0');
  assert(typeof point.new_users === 'number' && point.new_users >= 0, 'new_users must be >= 0');
  assert(typeof point.revenue_fcfa === 'number' && point.revenue_fcfa >= 0, 'revenue_fcfa must be >= 0');
  return true;
}

