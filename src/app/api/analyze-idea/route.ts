import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { generateWithFallback } from "@/lib/ai/model-fallback";
import { DEFAULT_WRITING_MODEL } from "@/lib/ai/pricing";
import {
  buildIdeaAnalysisPrompt,
  buildIdeaQuestionsPrompt,
  parseIdeaAnalysis,
  parseIdeaQuestions,
} from "@/lib/book/ideaAnalysis";

export const maxDuration = 60;

/**
 * POST /api/analyze-idea — Iris lit l'idée de l'auteur (texte libre ou
 * document) et propose catégorie, public, ton et style (`mode: "analyze"`),
 * ou lui pose quelques questions pour préciser une idée floue
 * (`mode: "questions"`). Appel court sur le modèle économique : offert à
 * l'auteur (non facturé), limité en fréquence.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`analyze_idea_${user.id}`, 10, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Trop de demandes en peu de temps. Patientez quelques secondes." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "questions" ? "questions" : "analyze";
    const input = {
      title: String(body?.title || "").slice(0, 200),
      subtitle: String(body?.subtitle || "").slice(0, 200) || undefined,
      idea: String(body?.idea || "").slice(0, 4000) || undefined,
      documentText: String(body?.documentText || "").slice(0, 12000) || undefined,
      bookType: String(body?.bookType || "").slice(0, 60) || undefined,
    };

    const material = `${input.title} ${input.idea || ""} ${input.documentText || ""}`.trim();
    if (mode === "analyze" && material.length < 15) {
      return NextResponse.json({ error: "Décrivez un peu plus votre idée pour qu'Iris puisse l'analyser." }, { status: 400 });
    }

    const prompt = mode === "questions" ? buildIdeaQuestionsPrompt(input) : buildIdeaAnalysisPrompt(input);
    const result = await generateWithFallback({ preferred: DEFAULT_WRITING_MODEL, prompt, maxAttempts: 2 });

    if (mode === "questions") {
      const questions = parseIdeaQuestions(result.text);
      return NextResponse.json({ questions });
    }
    return NextResponse.json({ analysis: parseIdeaAnalysis(result.text) });
  } catch (error) {
    console.error("[analyze-idea] Échec de l'analyse de l'idée:", error);
    return NextResponse.json({ error: "Iris n'a pas pu analyser votre idée. Réessayez ou choisissez vous-même." }, { status: 500 });
  }
}
