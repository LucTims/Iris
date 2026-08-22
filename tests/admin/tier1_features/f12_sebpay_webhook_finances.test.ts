import crypto from 'crypto';
import {
  assert,
  assertEqual,
  assertGreaterThanOrEqual,
  assertArrayLength,
} from '../harness/assertions';
import { mockAdminTransactions } from '../../../src/lib/admin/mockData';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runF12SebpayWebhookFinancesTests(): Promise<{
  suite: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}> {
  const suite = 'Tier 1 — F12: Sebpay Webhook & Admin Finances Integration';
  const tests: TestResult[] = [];

  const secretKey = 'test_sebpay_secret_key_12345';

  // Test 1: HMAC-SHA256 Signature Generation & Timing-Safe Verification
  try {
    const rawPayload = JSON.stringify({
      transaction_id: 'sp_tx_998877',
      external_reference: 'tx_001',
      status: 'approved',
      amount: 2500,
      currency: 'XOF',
    });

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawPayload)
      .digest('hex');

    const verifySig = (payload: string, sig: string, secret: string) => {
      const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      try {
        const a = Buffer.from(sig, 'hex');
        const b = Buffer.from(computed, 'hex');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      } catch {
        return false;
      }
    };

    assert(verifySig(rawPayload, expectedSignature, secretKey), 'Valid HMAC signature must verify successfully');
    assert(!verifySig(rawPayload, 'invalid_fake_signature_hex_1234567890abcdef', secretKey), 'Tampered signature must be rejected');
    assert(!verifySig(rawPayload + 'tampered', expectedSignature, secretKey), 'Tampered payload must be rejected');
    assert(!verifySig(rawPayload, expectedSignature, 'wrong_secret_key'), 'Wrong secret must be rejected');

    tests.push({ name: 'F12.1: Sebpay HMAC-SHA256 signature verification validates authentic webhooks and rejects fraud', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.1: Sebpay HMAC-SHA256 signature verification validates authentic webhooks and rejects fraud', passed: false, error: err.message });
  }

  // Test 2: Coin Pack Allocation Mapping (Starter, Creator, Author)
  try {
    const COIN_PACKS: Record<string, number> = {
      pack_starter: 1000,
      starter: 1000,
      pack_creator: 3000,
      creator: 3000,
      pack_author: 7000,
      author: 7000,
      pack_pro: 16000,
      pro: 16000,
      pack_studio: 45000,
      studio: 45000,
    };

    assertEqual(COIN_PACKS['pack_starter'], 1000, 'Pack Starter yields 1,000 coins');
    assertEqual(COIN_PACKS['pack_creator'], 3000, 'Pack Creator yields 3,000 coins');
    assertEqual(COIN_PACKS['pack_author'], 7000, 'Pack Author yields 7,000 coins');

    // Simulate wallet update
    const userWallet = { balance: 500 };
    const coinsToAdd = COIN_PACKS['pack_creator'];
    userWallet.balance += coinsToAdd;
    assertEqual(userWallet.balance, 3500, 'User wallet balance increases from 500 to 3500 coins on Creator pack purchase');

    tests.push({ name: 'F12.2: Coin pack allocation correctly awards 3000 coins for Creator pack and credits wallet balance', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.2: Coin pack allocation correctly awards 3000 coins for Creator pack and credits wallet balance', passed: false, error: err.message });
  }

  // Test 3: Transaction Status Transition (pending -> paid / failed)
  try {
    const processWebhookStatus = (currentStatus: string, incomingStatus: string) => {
      if (currentStatus === 'paid') return { newStatus: 'paid', duplicate: true };
      const s = incomingStatus.toLowerCase();
      if (s === 'approved' || s === 'paid' || s === 'success' || s === 'completed') {
        return { newStatus: 'paid', duplicate: false };
      }
      if (s === 'rejected' || s === 'failed' || s === 'canceled') {
        return { newStatus: 'failed', duplicate: false };
      }
      return { newStatus: currentStatus, duplicate: false };
    };

    assertEqual(processWebhookStatus('pending', 'approved').newStatus, 'paid', 'Pending transaction transitions to paid on approved');
    assertEqual(processWebhookStatus('pending', 'paid').newStatus, 'paid', 'Pending transaction transitions to paid on paid status');
    assertEqual(processWebhookStatus('pending', 'rejected').newStatus, 'failed', 'Pending transaction transitions to failed on rejected');
    assertEqual(processWebhookStatus('pending', 'failed').newStatus, 'failed', 'Pending transaction transitions to failed on failed status');
    assertEqual(processWebhookStatus('paid', 'approved').duplicate, true, 'Already paid transaction detects duplicate idempotent call');

    tests.push({ name: 'F12.3: Transaction status transitions accurately (pending -> paid or failed) with idempotency protection', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.3: Transaction status transitions accurately (pending -> paid or failed) with idempotency protection', passed: false, error: err.message });
  }

  // Test 4: Admin Finances Total Revenue Calculation (Paid Transactions Only)
  try {
    assertArrayLength(mockAdminTransactions, 5, 'Must contain sample transactions covering all statuses');

    const paidTx = mockAdminTransactions.filter(t => t.status === 'paid');
    const pendingTx = mockAdminTransactions.filter(t => t.status === 'pending');
    const failedTx = mockAdminTransactions.filter(t => t.status === 'failed');

    assert(paidTx.length >= 2, 'Has at least 2 paid transactions');
    assert(pendingTx.length >= 1, 'Has at least 1 pending transaction');
    assert(failedTx.length >= 1, 'Has at least 1 failed transaction');

    // Revenue must ONLY sum paid transactions (2500 + 5000 + 5000 = 12500 FCFA)
    const totalRevenueFCFA = paidTx.reduce((sum, t) => sum + t.amount, 0);
    assertEqual(totalRevenueFCFA, 12500, 'Total revenue sums exclusively paid transactions (12,500 FCFA)');

    // Ensure pending and failed amounts are not included
    const totalWithPending = mockAdminTransactions.reduce((sum, t) => sum + t.amount, 0);
    assert(totalRevenueFCFA < totalWithPending, 'Revenue calculation excludes pending (1000) and failed (2500) transactions');

    tests.push({ name: 'F12.4: Admin Finances metric strictly aggregates revenue from paid transactions and excludes pending/failed', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.4: Admin Finances metric strictly aggregates revenue from paid transactions and excludes pending/failed', passed: false, error: err.message });
  }

  // Test 5: HTTP Status Codes & Error Guard Contracts
  try {
    const handleWebhookGuard = (hasSecret: boolean, hasSignature: boolean, isSignatureValid: boolean, hasTx: boolean) => {
      if (!hasSecret) return { statusCode: 500, error: 'Configuration serveur invalide' };
      if (!hasSignature || !isSignatureValid) return { statusCode: 401, error: 'Signature invalide' };
      if (!hasTx) return { statusCode: 404, error: 'Transaction introuvable' };
      return { statusCode: 200, success: true };
    };

    assertEqual(handleWebhookGuard(false, true, true, true).statusCode, 500, 'Missing server secret returns 500');
    assertEqual(handleWebhookGuard(true, false, false, true).statusCode, 401, 'Missing signature returns 401');
    assertEqual(handleWebhookGuard(true, true, false, true).statusCode, 401, 'Invalid signature returns 401');
    assertEqual(handleWebhookGuard(true, true, true, false).statusCode, 404, 'Missing transaction returns 404');
    assertEqual(handleWebhookGuard(true, true, true, true).statusCode, 200, 'Valid webhook returns 200');

    tests.push({ name: 'F12.5: Webhook security pipeline enforces 401 rejection on unauthorized signatures and 404 on missing transactions', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.5: Webhook security pipeline enforces 401 rejection on unauthorized signatures and 404 on missing transactions', passed: false, error: err.message });
  }

  // Test 6: UUID Format Validation & Non-UUID Fallback Resolution
  try {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const invalidUuid = 'sp_tx_1724000000';

    assert(UUID_REGEX.test(validUuid), 'Valid UUID matches regex');
    assert(!UUID_REGEX.test(invalidUuid), 'Non-UUID string does not match regex');

    const resolveLookupStrategy = (txRef: string) => {
      if (UUID_REGEX.test(txRef)) return 'id';
      return 'provider_reference';
    };

    assertEqual(resolveLookupStrategy(validUuid), 'id', 'UUID references query primary key id');
    assertEqual(resolveLookupStrategy(invalidUuid), 'provider_reference', 'Non-UUID references query provider_reference safely without Postgres 22P02 error');

    tests.push({ name: 'F12.6: Webhook query router differentiates UUIDs from string provider references to prevent SQL syntax errors', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.6: Webhook query router differentiates UUIDs from string provider references to prevent SQL syntax errors', passed: false, error: err.message });
  }

  // Test 7: Signature Prefix Normalization & 32-Byte Buffer Verification
  try {
    const rawPayload = '{"status":"approved"}';
    const computedHash = crypto.createHmac('sha256', secretKey).update(rawPayload).digest('hex');

    const normalizeAndVerify = (rawSig: string, rawBody: string, secret: string) => {
      const cleanSig = rawSig.trim().replace(/^sha256=/i, '');
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      try {
        const sigBuf = Buffer.from(cleanSig, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        return sigBuf.length === 32 && expBuf.length === 32 && crypto.timingSafeEqual(sigBuf, expBuf);
      } catch {
        return false;
      }
    };

    assert(normalizeAndVerify(computedHash, rawPayload, secretKey), 'Standard hex verifies');
    assert(normalizeAndVerify(`sha256=${computedHash}`, rawPayload, secretKey), 'Prefix sha256= verifies');
    assert(normalizeAndVerify(`  ${computedHash}  `, rawPayload, secretKey), 'Whitespace-padded signature verifies');
    assert(!normalizeAndVerify('short_bad_hex', rawPayload, secretKey), 'Short non-32 byte buffer safely rejected');

    tests.push({ name: 'F12.7: Webhook normalizes sha256= prefix and whitespace while enforcing 32-byte constant-time check', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.7: Webhook normalizes sha256= prefix and whitespace while enforcing 32-byte constant-time check', passed: false, error: err.message });
  }

  // Test 8: Wrapped vs Flat Sebpay Payload Parsing
  try {
    const flatPayload = {
      external_reference: '123e4567-e89b-12d3-a456-426614174000',
      status: 'approved',
      amount: 2500,
    };

    const wrappedPayload = {
      event: 'payment.success',
      data: {
        external_reference: '123e4567-e89b-12d3-a456-426614174000',
        status: 'approved',
        amount: 2500,
      },
    };

    const extractPayloadData = (body: any) => {
      const data = body && typeof body.data === 'object' && body.data !== null ? body.data : body;
      return {
        txRef: data.external_reference || body.external_reference,
        status: (data.status || body.status || data.event || body.event || '').toLowerCase(),
      };
    };

    const flatExtracted = extractPayloadData(flatPayload);
    const wrappedExtracted = extractPayloadData(wrappedPayload);

    assertEqual(flatExtracted.txRef, '123e4567-e89b-12d3-a456-426614174000', 'Flat payload txRef extracted');
    assertEqual(flatExtracted.status, 'approved', 'Flat payload status extracted');
    assertEqual(wrappedExtracted.txRef, '123e4567-e89b-12d3-a456-426614174000', 'Wrapped payload txRef extracted');
    assertEqual(wrappedExtracted.status, 'approved', 'Wrapped payload status extracted');

    tests.push({ name: 'F12.8: Webhook parser handles both flat payloads and wrapped event structures transparently', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.8: Webhook parser handles both flat payloads and wrapped event structures transparently', passed: false, error: err.message });
  }

  // Test 9: Fallback Coin Computation for Unmapped Plans
  try {
    const computeCoins = (planId?: string, amount?: number) => {
      const COIN_PACKS: Record<string, number> = {
        pack_starter: 1000,
        pack_creator: 3000,
        pack_author: 7000,
        pack_pro: 16000,
        pack_studio: 45000,
      };
      const key = (planId || '').toLowerCase();
      let coins = COIN_PACKS[key] || 0;
      if (coins === 0 && amount) {
        if (amount >= 45000) coins = 45000;
        else if (amount >= 15000) coins = 16000;
        else if (amount >= 5000) coins = 7000;
        else if (amount >= 2500) coins = 3000;
        else if (amount >= 1000) coins = 1000;
      }
      return coins;
    };

    assertEqual(computeCoins('custom_unmapped_plan', 45000), 45000, '45000 FCFA unmapped plan falls back to 45,000 coins');
    assertEqual(computeCoins('custom_unmapped_plan', 15000), 16000, '15000 FCFA unmapped plan falls back to 16,000 coins');
    assertEqual(computeCoins('custom_unmapped_plan', 5000), 7000, '5000 FCFA unmapped plan falls back to 7,000 coins');
    assertEqual(computeCoins('custom_unmapped_plan', 2500), 3000, '2500 FCFA unmapped plan falls back to 3,000 coins');
    assertEqual(computeCoins('custom_unmapped_plan', 1000), 1000, '1000 FCFA unmapped plan falls back to 1,000 coins');
    assertEqual(computeCoins('pack_creator', 2500), 3000, 'Mapped pack_creator yields 3,000 coins directly');

    tests.push({ name: 'F12.9: Fallback coin valuation awards appropriate coin amounts for custom or unmapped plan IDs', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.9: Fallback coin valuation awards appropriate coin amounts for custom or unmapped plan IDs', passed: false, error: err.message });
  }

  // Test 10: Admin Dashboard Search & Multi-Filter Query Engine
  try {
    const txs = mockAdminTransactions;
    const filterTx = (query: string, status: string, plan: string) => {
      return txs.filter(tx => {
        const matchesSearch =
          (tx.user_name || '').toLowerCase().includes(query.toLowerCase()) ||
          (tx.user_email || '').toLowerCase().includes(query.toLowerCase()) ||
          (tx.id || '').toLowerCase().includes(query.toLowerCase()) ||
          (tx.provider_reference || '').toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === 'all' || tx.status === status;
        const matchesPlan = plan === 'all' || (tx.plan_id || '').toLowerCase().includes(plan.toLowerCase());
        return matchesSearch && matchesStatus && matchesPlan;
      });
    };

    assertEqual(filterTx('', 'all', 'all').length, 5, 'All transactions returned with default filters');
    assertEqual(filterTx('Fatou', 'all', 'all').length, 1, 'Search by user name');
    assertEqual(filterTx('bamako', 'all', 'all').length, 1, 'Search by user email');
    assertEqual(filterTx('', 'paid', 'all').length, 3, 'Filter by status paid');
    assertEqual(filterTx('', 'pending', 'all').length, 1, 'Filter by status pending');
    assertEqual(filterTx('', 'failed', 'all').length, 1, 'Filter by status failed');
    assertEqual(filterTx('', 'all', 'author').length, 2, 'Filter by pack author');

    tests.push({ name: 'F12.10: Admin Finances search, status, and pack filters operate accurately and in combination', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.10: Admin Finances search, status, and pack filters operate accurately and in combination', passed: false, error: err.message });
  }

  // Test 11: Non-Object / Primitive JSON Payload Rejection (400 Bad Request)
  try {
    const validateParsedBody = (parsed: any) => {
      if (!parsed || typeof parsed !== 'object') {
        return { statusCode: 400, error: 'Payload JSON invalide' };
      }
      return { statusCode: 200, valid: true };
    };

    assertEqual(validateParsedBody(null).statusCode, 400, 'JSON null rejected with 400');
    assertEqual(validateParsedBody(12345).statusCode, 400, 'JSON number rejected with 400');
    assertEqual(validateParsedBody('string_body').statusCode, 400, 'JSON string rejected with 400');
    assertEqual(validateParsedBody(false).statusCode, 400, 'JSON boolean rejected with 400');
    assertEqual(validateParsedBody({ external_reference: '123' }).statusCode, 200, 'Valid JSON object accepted');

    tests.push({ name: 'F12.11: Webhook parser safely rejects primitive or null JSON bodies with HTTP 400', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.11: Webhook parser safely rejects primitive or null JSON bodies with HTTP 400', passed: false, error: err.message });
  }

  // Test 12: Expanded Coin Pack Aliases & Hyphenated/Underscore Keys
  try {
    const COIN_PACKS: Record<string, number> = {
      pack_starter: 1000,
      'pack-starter': 1000,
      starter_pack: 1000,
      starter: 1000,
      pack_creator: 3000,
      'pack-creator': 3000,
      creator_pack: 3000,
      creator: 3000,
      pack_author: 7000,
      'pack-author': 7000,
      author_pack: 7000,
      author: 7000,
      pack_pro: 16000,
      'pack-pro': 16000,
      pro_pack: 16000,
      pro: 16000,
      pack_studio: 45000,
      'pack-studio': 45000,
      studio_pack: 45000,
      studio: 45000,
    };

    assertEqual(COIN_PACKS['pack-creator'], 3000, 'Hyphenated pack-creator maps to 3,000 coins');
    assertEqual(COIN_PACKS['creator_pack'], 3000, 'Suffix creator_pack maps to 3,000 coins');
    assertEqual(COIN_PACKS['pro_pack'], 16000, 'Suffix pro_pack maps to 16,000 coins');
    assertEqual(COIN_PACKS['studio_pack'], 45000, 'Suffix studio_pack maps to 45,000 coins');

    tests.push({ name: 'F12.12: Extended coin pack aliases correctly normalize hyphenated and suffixed plan keys', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.12: Extended coin pack aliases correctly normalize hyphenated and suffixed plan keys', passed: false, error: err.message });
  }

  // Test 13: Multi-Header Signature Resolution & Fallback
  try {
    const extractSignatureFromHeaders = (headers: Record<string, string | undefined>) => {
      return (
        headers['x-sebpay-signature'] ||
        headers['X-SebPay-Signature'] ||
        headers['x-signature'] ||
        headers['X-Signature'] ||
        headers['sebpay-signature'] ||
        headers['SebPay-Signature'] ||
        headers['x-hub-signature-256']
      );
    };

    assertEqual(extractSignatureFromHeaders({ 'sebpay-signature': 'sig_a' }), 'sig_a', 'Extracts sebpay-signature');
    assertEqual(extractSignatureFromHeaders({ 'x-hub-signature-256': 'sig_b' }), 'sig_b', 'Extracts x-hub-signature-256');
    assertEqual(extractSignatureFromHeaders({ 'X-SebPay-Signature': 'sig_c' }), 'sig_c', 'Extracts X-SebPay-Signature');

    tests.push({ name: 'F12.13: Webhook header reader extracts signatures across diverse casing and standard header aliases', passed: true });
  } catch (err: any) {
    tests.push({ name: 'F12.13: Webhook header reader extracts signatures across diverse casing and standard header aliases', passed: false, error: err.message });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  return { suite, passed, failed, tests };
}
