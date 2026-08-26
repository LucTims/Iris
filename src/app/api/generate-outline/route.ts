import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductGenerationCost } from "@/lib/ai/cost-engine";
import { getAiModel } from "@/lib/ai/search-context";

export const maxDuration = 60;

/**
 * Génère UNIQUEMENT une structure de chapitres (titre + aperçu) au format JSON.
 * Utilisé par « Générer tout le livre » quand il n'existe pas de sommaire
 * (mode prototype) : on déduit la structure du projet + du prototype + du
 * nombre de chapitres visé, puis chaque chapitre est rédigé séparément.
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

    const rateLimit = await checkRateLimit(`outline_${user.id}`, 5, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Trop de requêtes. Veuillez patienter." }, { status: 429 });
    }

    const {
      title,
      subtitle,
      synopsis,
      tone,
      audience,
      category,
      length,
      instructions,
      prototype,
      targetChapters,
      referenceAnalysis,
      model: chosenModel,
      projectId,
    } = await req.json();

    const selectedModelName = chosenModel || "gemini-2.5-flash";
    const nbChapters = Math.max(3, Math.min(24, Number(targetChapters) || 8));

    const hasEnoughCoins = await checkMinimumBalance(user.id, 20);
    if (!hasEnoughCoins) {
      return NextResponse.json(
        { error: "Fonds insuffisants pour préparer la structure du livre." },
        { status: 402 }
      );
    }

    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: "generate_outline",
        model: selectedModelName,
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    const prompt = `Tu es un architecte de livres. Propose la STRUCTURE en chapitres d'un livre.

Détails :
Titre : ${title || "Sans titre"}
Sous-titre : ${subtitle || "—"}
Catégorie : ${category || "—"}
Public cible : ${audience || "—"}
Longueur souhaitée : ${length || "—"}
Ton / style : ${tone || "—"}
Idée / synopsis : ${synopsis || "—"}
Consignes : ${instructions || "—"}
${prototype ? `\nPrototype rédigé par l'IA (sers-t'en comme base d'inspiration) :\n${String(prototype).slice(0, 4000)}\n` : ""}
${referenceAnalysis ? `\nAnalyse d'un document de référence fourni par l'auteur :\n${String(referenceAnalysis).slice(0, 4000)}\n` : ""}

Génère EXACTEMENT ${nbChapters} chapitres (ni plus, ni moins), dans un ordre logique et progressif. Pour chaque chapitre : un titre clair et un aperçu de 1 à 2 phrases décrivant précisément ce qu'il couvrira. Réponds en français.`;

    const result = await generateObject({
      model: getAiModel(selectedModelName),
      schema: z.object({
        chapters: z
          .array(
            z.object({
              title: z.string().describe("Titre du chapitre"),
              brief: z.string().describe("Aperçu en 1 à 2 phrases du contenu du chapitre"),
            })
          )
          .describe("Liste ordonnée des chapitres du livre"),
      }),
      prompt,
    });

    await deductGenerationCost(
      user.id,
      selectedModelName,
      result.usage,
      `Structure du livre : ${title || ""}`,
      { projectId, outputText: JSON.stringify(result.object ?? {}) }
    );

    const chapters = (result.object.chapters || [])
      .filter((c) => c && c.title && c.title.trim())
      .slice(0, 24);

    return NextResponse.json({ chapters });
  } catch (error) {
    console.error("Erreur lors de la génération de la structure:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la préparation de la structure du livre." },
      { status: 500 }
    );
  }
}
