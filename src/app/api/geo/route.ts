import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductGenerationCost } from "@/lib/ai/cost-engine";
import { getAiModel } from "@/lib/ai/search-context";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`geo_${user.id}`, 10, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Trop de requêtes. Veuillez patienter." }, { status: 429 });
    }

    const { title, content, projectId } = await req.json();
    const modelId = "gemini-2.5-flash";

    if (!(await checkMinimumBalance(user.id, 5))) {
      return NextResponse.json({ error: "Fonds insuffisants (pièces)." }, { status: 402 });
    }

    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: "geo_score",
        model: modelId,
      });
    } catch {
      /* tracking non bloquant */
    }

    const result = await generateObject({
      model: getAiModel(modelId),
      system: `Tu es un expert en GEO (Generative Engine Optimization).
Ton rôle est d'analyser un texte et de donner un score sur 100 de sa "compréhension" par les IAs (Google, Perplexity, ChatGPT), ainsi que 3 recommandations très courtes et précises pour l'améliorer sémantiquement.
- score: un nombre de 0 à 100.
- feedback: tableau de 3 strings, recommandations courtes.`,
      prompt: `Titre du document: ${title}\n\nContenu:\n${(content || "").substring(0, 15000)}`,
      schema: z.object({
        score: z.number().describe("Score de 0 à 100"),
        feedback: z.array(z.string()).describe("3 recommandations courtes d'amélioration GEO"),
      }),
    });

    await deductGenerationCost(
      user.id,
      modelId,
      result.usage,
      "Analyse GEO",
      { projectId, outputText: JSON.stringify(result.object ?? {}) }
    );

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("GEO API Error:", error);
    return NextResponse.json({ error: "Failed to generate GEO score" }, { status: 500 });
  }
}
