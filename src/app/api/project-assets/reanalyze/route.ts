import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { deductGenerationCost } from "@/lib/ai/cost-engine";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes max pour analyser plusieurs images en lots

const BUCKET = "project-assets";
const VISION_MODEL = "gemini-3.6-flash";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Identique à l'implémentation de la route principale.
 */
async function describeImage(
  bytes: Buffer,
  contentType: string
): Promise<{ text: string; usage: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const { text, usage } = await generateText({
      model: google(VISION_MODEL),
      abortSignal: controller.signal,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Décris cette illustration ou photo le plus précisément possible. Identifie les personnages (genre, âge, vêtements, cheveux), l'action en cours, l'émotion dominante, l'environnement (décor, objets marquants) et le moment de la journée ou la lumière. Ne porte aucun jugement sur le style, dis simplement ce qui s'y passe.",
            },
            { type: "image", image: bytes },
          ],
        },
      ],
    });
    return { text, usage };
  } finally {
    clearTimeout(timeout);
  }
}

function getContentType(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`reanalyze_${user.id}`, 10, 5 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter un instant." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const projectId = body.projectId;
    const paths = body.paths; // Array of storage_paths for the wizard (before DB insertion)

    if (!projectId && (!paths || paths.length === 0)) {
      return NextResponse.json({ error: "projectId ou paths requis." }, { status: 400 });
    }

    let failedAssets: Array<{ id?: string; file_name?: string; storage_path: string; analysis_status?: string }> = [];

    if (projectId) {
      // Récupérer uniquement les assets en échec pour l'utilisateur et le projet donnés.
      const { data, error: fetchErr } = await supabase
        .from("project_assets")
        .select("id, file_name, storage_path, analysis_status")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .eq("analysis_status", "failed");

      if (fetchErr) {
        console.error("[reanalyze] Erreur lecture BDD :", fetchErr);
        return NextResponse.json({ error: "Impossible de lire le statut des images." }, { status: 500 });
      }
      failedAssets = data || [];
    } else {
      // Pour le wizard (stateless)
      failedAssets = paths.map((p: string) => ({
        storage_path: p,
        file_name: p.split("/").pop(),
        analysis_status: "failed",
      }));
    }

    if (failedAssets.length === 0) {
      return NextResponse.json({ message: "Aucune image en échec à ré-analyser.", results: [] });
    }

    const db = admin();
    const results: Array<{ id?: string; path: string; success: boolean; analysis?: string; error?: string }> = [];

    // Analyse par lots (concurrency = 4)
    const CONCURRENCY = 4;
    for (let start = 0; start < failedAssets.length; start += CONCURRENCY) {
      const batch = failedAssets.slice(start, start + CONCURRENCY);
      
      await Promise.all(
        batch.map(async (asset) => {
          let success = false;
          let errorMessage = null;
          let analysisText = undefined;

          try {
            // Téléchargement depuis Storage
            const { data: fileData, error: downloadErr } = await db.storage
              .from(BUCKET)
              .download(asset.storage_path);

            if (downloadErr || !fileData) {
              throw new Error(`Téléchargement impossible : ${downloadErr?.message}`);
            }

            const bytes = Buffer.from(await fileData.arrayBuffer());
            const contentType = getContentType(asset.storage_path);

            // Relance de l'analyse
            const described = await describeImage(bytes, contentType);

            if (described.text) {
              // Facturation
              await deductGenerationCost(
                user.id,
                VISION_MODEL,
                described.usage,
                `Analyse d'image (relance) : ${asset.file_name}`,
                { projectId: projectId || "wizard", outputText: described.text }
              );

              analysisText = described.text;

              // Mise à jour de la BDD uniquement si le projet existe (hors wizard)
              if (projectId && asset.id) {
                const { error: updateErr } = await db
                  .from("project_assets")
                  .update({
                    ai_analysis: described.text,
                    analysis_status: "done",
                  })
                  .eq("id", asset.id);

                if (updateErr) {
                  throw new Error(`Mise à jour impossible : ${updateErr.message}`);
                }
              }
              success = true;
            }
          } catch (err: any) {
            console.warn(`[reanalyze] Échec pour ${asset.file_name} :`, err);
            errorMessage = err.message;
          }

          results.push({ id: asset.id, path: asset.storage_path, success, analysis: analysisText, error: errorMessage });
        })
      );
    }

    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Analyse terminée. ${results.length - failedCount} réussites, ${failedCount} échecs.`,
      results,
    });
  } catch (error) {
    console.error("[reanalyze] Erreur inattendue :", error);
    return NextResponse.json({ error: "Erreur serveur lors de la ré-analyse." }, { status: 500 });
  }
}
