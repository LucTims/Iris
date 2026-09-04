import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/isAdmin";
import { providerOf } from "@/lib/ai/model-fallback";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * SONDE RÉELLE des clés d'API (admin uniquement).
 *
 * La route /api/admin/health dit seulement si une variable d'environnement est
 * RENSEIGNÉE. C'est insuffisant : une clé peut être présente et pourtant
 * refusée par le fournisseur — c'est exactement ce qui est arrivé avec Gemini
 * (« The bound service account is deleted or disabled »), où la clé existait
 * bien mais le compte de service auquel elle était rattachée avait été
 * supprimé côté Google Cloud.
 *
 * Cette route fait donc un VRAI appel minimal (quelques jetons) à chaque
 * fournisseur et renvoie le verdict et, en cas d'échec, le message d'erreur
 * exact du fournisseur. C'est le moyen le plus rapide de savoir si une clé
 * fraîchement remplacée est réellement active EN PRODUCTION — car remplacer la
 * clé chez le fournisseur ne change rien tant que la variable d'environnement
 * de l'hébergeur n'a pas été mise à jour ET le site redéployé.
 *
 * Aucune valeur de clé n'est jamais renvoyée.
 */

const PROBES = [
  { id: "gemini-2.5-flash", label: "Gemini", envVar: "GOOGLE_GENERATIVE_AI_API_KEY" },
  { id: "gpt-4o-mini", label: "ChatGPT", envVar: "OPENAI_API_KEY" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude", envVar: "ANTHROPIC_API_KEY" },
];

const PROBE_TIMEOUT_MS = 15_000;

/** Rend l'erreur d'un fournisseur lisible et actionnable pour l'exploitant. */
function explain(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("service account")) {
    return "La clé est rattachée à un compte de service Google supprimé ou désactivé. Recréez la clé dans un NOUVEAU projet Google Cloud (AI Studio → « Create API key in new project »).";
  }
  if (m.includes("api key not valid") || m.includes("invalid api key") || m.includes("invalid x-api-key")) {
    return "La clé est refusée par le fournisseur. Vérifiez qu'elle a été recopiée en entier, sans espace, dans la variable d'environnement de l'hébergeur — puis redéployez.";
  }
  if (m.includes("quota") || m.includes("rate limit") || m.includes("429")) {
    return "Quota dépassé ou facturation non activée chez le fournisseur.";
  }
  if (m.includes("overloaded") || m.includes("529")) {
    return "Le fournisseur est temporairement surchargé (incident de son côté). La clé, elle, est valide.";
  }
  if (m.includes("permission") || m.includes("403")) {
    return "La clé est valide mais n'a pas accès à ce modèle. Activez l'API correspondante chez le fournisseur.";
  }
  return "Erreur renvoyée par le fournisseur (voir le détail).";
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { generateText } = await import("ai");
  const { getAiModel } = await import("@/lib/ai/search-context");

  const results = await Promise.all(
    PROBES.map(async (probe) => {
      const keyPresent = !!(
        process.env[probe.envVar] ||
        (probe.envVar === "GOOGLE_GENERATIVE_AI_API_KEY" ? process.env.GOOGLE_API_KEY : "")
      );

      // Clé absente : inutile d'appeler le fournisseur pour le savoir.
      if (!keyPresent) {
        return {
          provider: providerOf(probe.id),
          label: probe.label,
          model: probe.id,
          envVar: probe.envVar,
          keyPresent: false,
          ok: false,
          diagnostic: `La variable ${probe.envVar} n'est pas définie sur le serveur. Ajoutez-la chez votre hébergeur, puis redéployez.`,
          error: null,
          latencyMs: null,
        };
      }

      const startedAt = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      try {
        const { text } = await generateText({
          model: getAiModel(probe.id),
          prompt: "Réponds uniquement par le mot: OK",
          abortSignal: controller.signal,
        });
        return {
          provider: providerOf(probe.id),
          label: probe.label,
          model: probe.id,
          envVar: probe.envVar,
          keyPresent: true,
          ok: !!(text && text.trim()),
          diagnostic: text && text.trim()
            ? "Clé active : le fournisseur a bien répondu."
            : "Le fournisseur a répondu, mais sans texte. À surveiller.",
          error: null,
          latencyMs: Date.now() - startedAt,
        };
      } catch (err) {
        const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        return {
          provider: providerOf(probe.id),
          label: probe.label,
          model: probe.id,
          envVar: probe.envVar,
          keyPresent: true,
          ok: false,
          diagnostic: explain(message),
          error: message.slice(0, 400),
          latencyMs: Date.now() - startedAt,
        };
      } finally {
        clearTimeout(timer);
      }
    })
  );

  const working = results.filter((r) => r.ok).map((r) => r.label);
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    results,
    // Le repli multi-fournisseurs suffit tant qu'AU MOINS UN modèle répond :
    // l'écriture des livres continue même avec une clé morte.
    canWriteBooks: working.length > 0,
    workingProviders: working,
  });
}
