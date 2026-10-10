import * as Sentry from "@sentry/nextjs";

// Suivi des erreurs serveur (routes API, génération de livres, webhooks).
// Inactif tant que SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN n'est pas défini.
export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

// Capture les erreurs non gérées des routes et Server Components.
export const onRequestError = Sentry.captureRequestError;
