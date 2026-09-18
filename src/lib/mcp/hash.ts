/**
 * Hash SHA-256 hex d'une clé API MCP, utilisé à la fois côté serveur
 * (vérification) et côté client (génération, avant l'insertion en base —
 * seul le hash est envoyé, jamais la clé en clair). Web Crypto est
 * disponible nativement dans les deux environnements, pas besoin du module
 * `crypto` de Node.
 */
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
