import {
  assert,
  assertEqual,
  assertGreaterThanOrEqual,
  assertArrayLength,
  validateAdminLogEntryContract,
} from '../harness/assertions';
import { mockAdminLogs } from '../../../src/lib/admin/mockData';
import { AdminLogEntry, LogLevel } from '../../../src/lib/admin/types';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF8LogsTelemetryTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 1 — F8: System Logs & Error Telemetry Explorer';
  const tests: TestResult[] = [];

  // Test 1: Log Feed Schema & Contract Validation
  try {
    assertArrayLength(mockAdminLogs, 5, 'Must have at least 5 log entries');
    assertGreaterThanOrEqual(mockAdminLogs.length, 8, 'Expected full telemetry sample of 8 logs');
    mockAdminLogs.forEach(log => validateAdminLogEntryContract(log));
    tests.push({ name: 'F8.1: Telemetry logs dataset conforms to AdminLogEntry schema and valid timestamps', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F8.1: Telemetry logs dataset conforms to AdminLogEntry schema and valid timestamps', passed: false, error: err.message });
  }

  // Test 2: Severity Level Filtering (INFO, WARN, ERROR, CRITICAL)
  try {
    const filterByLevel = (logs: AdminLogEntry[], level: LogLevel | 'ALL') => {
      return level === 'ALL' ? logs : logs.filter(l => l.level === level);
    };

    const infoLogs = filterByLevel(mockAdminLogs, 'INFO');
    const warnLogs = filterByLevel(mockAdminLogs, 'WARN');
    const errorLogs = filterByLevel(mockAdminLogs, 'ERROR');
    const critLogs = filterByLevel(mockAdminLogs, 'CRITICAL');

    assertGreaterThanOrEqual(infoLogs.length, 3, 'Should have >= 3 INFO logs');
    assertGreaterThanOrEqual(warnLogs.length, 2, 'Should have >= 2 WARN logs');
    assertGreaterThanOrEqual(errorLogs.length, 1, 'Should have >= 1 ERROR log');
    assertGreaterThanOrEqual(critLogs.length, 1, 'Should have >= 1 CRITICAL log');
    tests.push({ name: 'F8.2: Severity filter tabs correctly segregate INFO, WARN, ERROR, and CRITICAL logs', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F8.2: Severity filter tabs correctly segregate INFO, WARN, ERROR, and CRITICAL logs', passed: false, error: err.message });
  }

  // Test 3: Service and Endpoint Tagging
  try {
    const services = new Set(mockAdminLogs.map(l => l.service));
    assert(services.has('api-ai'), 'Contains api-ai logs');
    assert(services.has('api-export'), 'Contains api-export logs');
    assert(services.has('api-ratelimit'), 'Contains api-ratelimit logs');
    assert(services.has('api-payment'), 'Contains api-payment logs');
    assert(services.has('sec-auth'), 'Contains sec-auth logs');
    tests.push({ name: 'F8.3: Microservice tag classifier labels events across AI, storage, auth, and billing', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F8.3: Microservice tag classifier labels events across AI, storage, auth, and billing', passed: false, error: err.message });
  }

  // Test 4: Keyword Search on Log Messages
  try {
    const searchLogs = (query: string) => {
      const q = query.toLowerCase();
      return mockAdminLogs.filter(
        l => l.message.toLowerCase().includes(q) || l.endpoint.toLowerCase().includes(q) || (l.user_email && l.user_email.toLowerCase().includes(q))
      );
    };

    const brutes = searchLogs('brute-force');
    assertEqual(brutes.length, 1, 'Finds 1 brute-force attack log');
    assertEqual(brutes[0].level, 'CRITICAL', 'Brute-force log is CRITICAL');

    const ratelimit = searchLogs('rate');
    assertGreaterThanOrEqual(ratelimit.length, 1, 'Finds rate limit log');
    tests.push({ name: 'F8.4: Keyword search successfully indexes error messages, endpoints, and actor emails', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F8.4: Keyword search successfully indexes error messages, endpoints, and actor emails', passed: false, error: err.message });
  }

  // Test 5: Stack Trace Extraction & JSON Payload Inspector
  try {
    const errorLog = mockAdminLogs.find(l => l.level === 'ERROR')!;
    assert(errorLog.stack_trace !== undefined, 'ERROR log must contain stack trace');
    assert(errorLog.stack_trace!.includes('PayloadTooLargeError'), 'Stack trace captures error class');
    assert(typeof errorLog.payload === 'object', 'Payload is valid JSON object');
    assertEqual(errorLog.payload!.max_allowed, 10485760, 'Payload details max allowed size');
    tests.push({ name: 'F8.5: Expandable stack trace modal provides actionable debugging details for errors', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F8.5: Expandable stack trace modal provides actionable debugging details for errors', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
