export type RateLimitInfo = {
  count: number;
  resetTime: number;
};

// Simple In-Memory Rate Limiter Map for MVP
// En production sur un environnement Vercel distribué (Edge/Serverless),
// il est recommandé d'utiliser Redis (ex: @upstash/ratelimit).
const rateLimits = new Map<string, RateLimitInfo>();

/**
 * Nettoie le cache pour éviter les fuites de mémoire.
 */
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, info] of rateLimits.entries()) {
    if (now > info.resetTime) {
      rateLimits.delete(key);
    }
  }
}

// Nettoyage automatique toutes les 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Vérifie si un identifiant a dépassé sa limite de requêtes.
 * @param identifier L'identifiant unique (ex: ID utilisateur ou Adresse IP)
 * @param limit Nombre maximum de requêtes autorisées
 * @param windowMs Fenêtre de temps en millisecondes
 * @returns { success: boolean, count: number, resetTime: number }
 */
export async function checkRateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const info = rateLimits.get(identifier);

  if (!info || now > info.resetTime) {
    // Si c'est la première requête ou si la fenêtre est réinitialisée
    const resetTime = now + windowMs;
    rateLimits.set(identifier, {
      count: 1,
      resetTime,
    });
    return { success: true, count: 1, resetTime };
  }

  if (info.count >= limit) {
    return { success: false, count: info.count, resetTime: info.resetTime };
  }

  info.count += 1;
  return { success: true, count: info.count, resetTime: info.resetTime };
}
