import crypto from "crypto";

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook Chariow ("Pulse"), selon le
 * contrat officiel (https://chariow.dev/en/guides/pulse-security) :
 *   signature = "sha256=" + hex(hmac_sha256(raw_body, pulse_secret))
 * Extrait dans un module dédié (pur, sans dépendance réseau) pour pouvoir le
 * tester unitairement sans mock du serveur HTTP.
 */
export function verifyChariowSignature(
  rawBody: string,
  secret: string,
  receivedSignature: string | null | undefined
): boolean {
  if (!secret || !receivedSignature) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(receivedSignature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}
