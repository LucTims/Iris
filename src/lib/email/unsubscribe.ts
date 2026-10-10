import crypto from "crypto";

// Lien de désinscription signé (HMAC) : pas besoin d'être connecté pour se
// désinscrire, et personne ne peut désinscrire un autre compte sans la signature.
function secret(): string {
  const s = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET;
  if (!s) throw new Error("EMAIL_UNSUBSCRIBE_SECRET (ou CRON_SECRET) manquant");
  return s;
}

export function unsubscribeToken(userId: string): string {
  return crypto.createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("hex");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(userId));
  const received = Buffer.from(token || "");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export function unsubscribeUrl(siteUrl: string, userId: string): string {
  return `${siteUrl}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}
