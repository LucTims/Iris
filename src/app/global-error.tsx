"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Dernier filet : erreur de rendu dans le layout racine.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center" }}>
        <h1>Une erreur inattendue est survenue</h1>
        <p>L&apos;équipe Iris a été prévenue. Vous pouvez réessayer.</p>
        <button onClick={() => reset()} style={{ marginTop: 16, padding: "8px 16px" }}>
          Réessayer
        </button>
      </body>
    </html>
  );
}
