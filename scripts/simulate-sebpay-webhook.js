#!/usr/bin/env node

/**
 * Script de Simulation Webhook SebPay & Vérification Cryptographique
 *
 * Utilisation :
 *   node scripts/simulate-sebpay-webhook.js
 *   node scripts/simulate-sebpay-webhook.js --url http://localhost:3000/api/webhooks/sebpay
 *   node scripts/simulate-sebpay-webhook.js --mode success --tx-id tx_custom_123
 *   node scripts/simulate-sebpay-webhook.js --mode invalid_sig
 *   node scripts/simulate-sebpay-webhook.js --mode fail
 */

const crypto = require("crypto");

// Configuration par défaut
const DEFAULT_SECRET_KEY = process.env.SEBPAY_SECRET_KEY || "test_sebpay_secret_key_12345";
const DEFAULT_WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/webhooks/sebpay";

/**
 * Calcule la signature cryptographique HMAC-SHA256 du corps de requête
 */
function generateSignature(payloadString, secretKey = DEFAULT_SECRET_KEY) {
  return crypto.createHmac("sha256", secretKey).update(payloadString).digest("hex");
}

/**
 * Envoie une requête HTTP POST au webhook avec les en-têtes SebPay
 */
async function sendWebhookRequest(url, payload, signatureHeader, customHeaders = {}) {
  const bodyString = typeof payload === "string" ? payload : JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (signatureHeader !== null && signatureHeader !== undefined) {
    headers["X-SebPay-Signature"] = signatureHeader;
  }

  // Support fetch if available (Node 18+) or fallback to native http/https
  if (typeof fetch === "function") {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: bodyString,
      });

      let json = null;
      try {
        json = await response.json();
      } catch {
        // Non-JSON response
      }

      return {
        status: response.status,
        ok: response.ok,
        data: json,
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error.message,
      };
    }
  }

  // Fallback for older Node.js runtimes
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const httpModule = parsedUrl.protocol === "https:" ? require("https") : require("http");
      const req = httpModule.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: "POST",
          headers: {
            ...headers,
            "Content-Length": Buffer.byteLength(bodyString),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            let json = null;
            try {
              json = JSON.parse(data);
            } catch {
              json = data;
            }
            resolve({
              status: res.statusCode || 0,
              ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
              data: json,
            });
          });
        }
      );

      req.on("error", (err) => {
        resolve({
          status: 0,
          ok: false,
          error: err.message,
        });
      });

      req.write(bodyString);
      req.end();
    } catch (err) {
      resolve({
        status: 0,
        ok: false,
        error: err.message,
      });
    }
  });
}

/**
 * Génère un UUID v4 standard pour les transactions simulées
 */
function generateUuid() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Scénario 1 : Simulation d'un paiement réussi (ex: Pack Creator - 3 000 pièces)
 */
async function simulateSuccess(webhookUrl, secretKey, options = {}) {
  const txId = options.txId || generateUuid();
  const planId = options.planId || "pack_creator";
  const defaultAmount = planId === "pack_starter" || planId === "starter" ? 1000 : planId === "pack_author" || planId === "author" ? 5000 : planId === "pack_pro" || planId === "pro" ? 15000 : planId === "pack_studio" || planId === "studio" ? 45000 : 2500;
  const amount = options.amount || defaultAmount;

  const payload = {
    transaction_id: `sp_tx_${Date.now()}`,
    external_reference: txId,
    status: "approved",
    amount: amount,
    currency: "XOF",
    phone: "22997000000",
    operator: "MTN",
    country: "BJ",
    metadata: {
      order_id: txId,
      plan_id: planId,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, secretKey);

  console.log(`\n🚀 [TEST 1] Envoi Webhook Paiement Réussi (${planId} - ${amount} FCFA)...`);
  console.log(`   Transaction ID / Ref : ${txId}`);
  console.log(`   Signature HMAC-SHA256 : ${signature.substring(0, 16)}...`);

  const result = await sendWebhookRequest(webhookUrl, payloadString, signature);

  console.log(`   Statut HTTP reçu : ${result.status}`);
  console.log(`   Réponse :`, result.data || result.error);

  return { payload, signature, result };
}

/**
 * Scénario 2 : Test de rejet de signature invalide (Doit renvoyer 401)
 */
async function testInvalidSignature(webhookUrl) {
  const fakeTxId = generateUuid();
  const payload = {
    transaction_id: `sp_tx_${Date.now()}`,
    external_reference: fakeTxId,
    status: "approved",
    amount: 5000,
    currency: "XOF",
  };

  const payloadString = JSON.stringify(payload);
  const fakeSignature = "deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678";

  console.log(`\n🔒 [TEST 2] Test Sécurité : Envoi avec Signature HMAC Invalide (Attendu: 401)...`);
  const result = await sendWebhookRequest(webhookUrl, payloadString, fakeSignature);

  console.log(`   Statut HTTP reçu : ${result.status}`);
  console.log(`   Réponse :`, result.data || result.error);

  const passed = result.status === 401;
  if (passed) {
    console.log(`   ✅ Rejet 401 confirmé : Requête non autorisée correctement bloquée.`);
  } else {
    console.log(`   ❌ ÉCHEC : Attendu 401, reçu ${result.status}`);
  }

  return { passed, result };
}

/**
 * Scénario 3 : Test de signature manquante (Doit renvoyer 401)
 */
async function testMissingSignature(webhookUrl) {
  const fakeTxId = generateUuid();
  const payload = {
    transaction_id: `sp_tx_${Date.now()}`,
    external_reference: fakeTxId,
    status: "approved",
    amount: 1000,
  };

  console.log(`\n🔒 [TEST 3] Test Sécurité : Envoi sans En-tête de Signature (Attendu: 401)...`);
  const result = await sendWebhookRequest(webhookUrl, payload, null);

  console.log(`   Statut HTTP reçu : ${result.status}`);
  console.log(`   Réponse :`, result.data || result.error);

  const passed = result.status === 401;
  if (passed) {
    console.log(`   ✅ Rejet 401 confirmé : Signature manquante rejetée.`);
  } else {
    console.log(`   ❌ ÉCHEC : Attendu 401, reçu ${result.status}`);
  }

  return { passed, result };
}

/**
 * Scénario 4 : Simulation d'un échec de paiement (Statut 'failed')
 */
async function simulateFailure(webhookUrl, secretKey, options = {}) {
  const txId = options.txId || generateUuid();

  const payload = {
    transaction_id: `sp_tx_failed_${Date.now()}`,
    external_reference: txId,
    status: "rejected",
    amount: 2500,
    currency: "XOF",
    phone: "22997000000",
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, secretKey);

  console.log(`\n⚠️ [TEST 4] Envoi Webhook Paiement Échoué / Annulé...`);
  console.log(`   Transaction ID : ${txId}`);

  const result = await sendWebhookRequest(webhookUrl, payloadString, signature);

  console.log(`   Statut HTTP reçu : ${result.status}`);
  console.log(`   Réponse :`, result.data || result.error);

  return { payload, signature, result };
}

/**
 * Exécution principale de la suite de simulation
 */
async function main() {
  console.log("================================================================================");
  console.log("        SIMULATION ET TEST DU WEBHOOK DE PAIEMENT SEBPAY (IRIS)");
  console.log("================================================================================");

  // Parsing des arguments CLI
  const args = process.argv.slice(2);
  let webhookUrl = DEFAULT_WEBHOOK_URL;
  let secretKey = DEFAULT_SECRET_KEY;
  let mode = "all";
  let customTxId = null;
  let customPlan = null;
  let customAmount = null;

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: node scripts/simulate-sebpay-webhook.js [options]

Options:
  --url <url>         Webhook URL (default: http://localhost:3000/api/webhooks/sebpay)
  --secret <secret>   Sebpay secret key (default: test_sebpay_secret_key_12345)
  --mode <mode>       Execution mode: success | invalid_sig | missing_sig | fail | all (default: all)
  --tx-id <uuid>      Custom transaction ID
  --plan <planId>     Plan ID (pack_starter, pack_creator, pack_author, pack_pro, pack_studio)
  --amount <number>   Payment amount in FCFA
  --help, -h          Show this help message
`);
    return;
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) {
      webhookUrl = args[i + 1];
      i++;
    } else if (args[i] === "--secret" && args[i + 1]) {
      secretKey = args[i + 1];
      i++;
    } else if (args[i] === "--mode" && args[i + 1]) {
      mode = args[i + 1];
      i++;
    } else if (args[i] === "--tx-id" && args[i + 1]) {
      customTxId = args[i + 1];
      i++;
    } else if (args[i] === "--plan" && args[i + 1]) {
      customPlan = args[i + 1];
      i++;
    } else if (args[i] === "--amount" && args[i + 1]) {
      customAmount = Number(args[i + 1]);
      i++;
    }
  }

  console.log(`Cible URL        : ${webhookUrl}`);
  console.log(`Secret Key       : ${secretKey ? secretKey.substring(0, 4) + "***" : "NON CONFIGURÉ"}`);
  console.log(`Mode d'exécution : ${mode.toUpperCase()}`);

  if (mode === "success") {
    await simulateSuccess(webhookUrl, secretKey, {
      txId: customTxId,
      planId: customPlan,
      amount: customAmount,
    });
  } else if (mode === "invalid_sig") {
    await testInvalidSignature(webhookUrl);
  } else if (mode === "missing_sig") {
    await testMissingSignature(webhookUrl);
  } else if (mode === "fail") {
    await simulateFailure(webhookUrl, secretKey, { txId: customTxId });
  } else {
    // Mode "all" : exécute tous les tests
    console.log("\n--- Lancement de la suite complète de vérification ---");

    const t2 = await testInvalidSignature(webhookUrl);
    const t3 = await testMissingSignature(webhookUrl);
    const t1 = await simulateSuccess(webhookUrl, secretKey, {
      txId: customTxId,
      planId: customPlan,
      amount: customAmount,
    });
    const t4 = await simulateFailure(webhookUrl, secretKey, { txId: customTxId });

    console.log("\n================================================================================");
    console.log("                      RÉSUMÉ DES TESTS SIMULATION");
    console.log("================================================================================");
    console.log(`Signature Invalide (401) : ${t2.passed ? "✅ SUCCÈS (Rejeté 401)" : "❌ ÉCHEC"}`);
    console.log(`Signature Manquante (401): ${t3.passed ? "✅ SUCCÈS (Rejeté 401)" : "❌ ÉCHEC"}`);
    console.log(`Paiement Validé          : Statut HTTP ${t1.result.status} (${t1.result.data?.status || t1.result.error || "Exécuté"})`);
    console.log(`Paiement Échoué          : Statut HTTP ${t4.result.status} (${t4.result.data?.status || t4.result.error || "Exécuté"})`);
    console.log("================================================================================\n");
  }
}

// Export pour utilisation comme module de test
module.exports = {
  generateSignature,
  sendWebhookRequest,
  simulateSuccess,
  testInvalidSignature,
  testMissingSignature,
  simulateFailure,
  main,
};

if (require.main === module) {
  main().catch((err) => {
    console.error("Erreur fatale script de simulation:", err);
    process.exit(1);
  });
}
