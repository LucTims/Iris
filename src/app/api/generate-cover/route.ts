import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCoverForUser } from "@/lib/cover/generateCover";
import type { CoverEngine } from "@/lib/ai/cover";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Génération de couverture depuis l'application (session navigateur).
 * Toute la logique (moteurs, stockage, facturation, limite de débit) vit dans
 * `@/lib/cover/generateCover`, partagée avec l'outil MCP `generate_cover`.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const body = await req.json();
    const projectId: string | undefined = body.projectId;
    const engine: CoverEngine = body.engine === "premium" ? "premium" : "free";
    const userPrompt: string | undefined = body.prompt;

    const result = await generateCoverForUser(
      user.id,
      { projectId, engine, prompt: userPrompt },
      { db: supabase }
    );

    if (!result.ok) {
      return NextResponse.json(
        result.detail ? { error: result.error, detail: result.detail } : { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      url: result.url,
      // `engine` reflète ce qui a RÉELLEMENT été produit, pas ce qui a été demandé.
      engine: result.engine,
      requestedEngine: result.requestedEngine,
      downgraded: result.downgraded,
      charged: result.charged,
      width: result.width,
      height: result.height,
      model: result.model,
    });
  } catch (error) {
    console.error("Erreur serveur génération couverture:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération de la couverture." }, { status: 500 });
  }
}
