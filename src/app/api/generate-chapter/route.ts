import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMonthlyQuota } from "@/lib/ai/quota";

export const maxDuration = 60; // Autoriser jusqu'à 60 secondes car générer un chapitre prend du temps

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Accès non autorisé. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    // Rate Limiting anti-abus (3 requêtes / minute / utilisateur)
    const rateLimit = await checkRateLimit(`chapter_${user.id}`, 3, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de requêtes de génération en cours. Veuillez patienter." },
        { status: 429 }
      );
    }

    const {
      title,
      synopsis,
      tone,
      chapterTitle,
      chapterNumber,
      previousChaptersSummary,
      model: chosenModel,
      projectId
    } = await req.json();

    // 1. Fetch user profile & plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, plan")
      .eq("id", user.id)
      .single();

    const userPlan = profile?.plan || "free";
    const userRole = profile?.role || "user";

    // 2. Server Whitelist: Force gemini-2.5-flash for free users attempting gemini-2.5-pro
    let selectedModelName = chosenModel || "gemini-2.5-flash";
    if (selectedModelName === "gemini-2.5-pro" && userPlan === "free" && userRole !== "admin") {
      selectedModelName = "gemini-2.5-flash";
    }

    // 3. Quota Enforcement: Check usage since the start of the current month
    // Note: sera remplacé par un système de quota en mots/tokens réels en Phase 5.
    const quota = await checkMonthlyQuota(supabase, user.id, userPlan, userRole);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Quota mensuel d'IA atteint (${quota.limit} générations). Passez à un plan supérieur pour continuer à générer des chapitres.` },
        { status: 429 }
      );
    }

    // 4. Track usage in Supabase ai_usage table
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: "generate_chapter",
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    const systemPrompt = `Tu es un auteur professionnel de best-sellers. Ta mission est de rédiger un chapitre COMPLET pour un livre.
Le texte que tu génères sera directement inséré dans le manuscrit de l'auteur.

Livre concerné :
Titre : ${title}
Synopsis global : ${synopsis || "Non défini"}
Ton / Style demandé : ${tone || "Professionnel et engageant"}

${previousChaptersSummary ? `Résumé des chapitres précédents pour garder la cohérence :\n${previousChaptersSummary}\n` : ""}

Tu dois rédiger le texte du :
Chapitre ${chapterNumber} : ${chapterTitle}

Instructions impératives :
1. Rédige le chapitre complet. Il doit être long, détaillé et immersif (vise au moins 800 à 1500 mots).
2. N'ajoute AUCUN préambule (pas de "Voici le chapitre :" ni de "Bien sûr, je vais rédiger..."). Commence DIRECTEMENT par le contenu du chapitre.
3. N'inclus PAS le titre du chapitre au début, l'éditeur de texte s'en charge.
4. Convertis le contenu en HTML valide, avec des balises <p>, <h2>, <h3>, <strong>, <em>, <blockquote>.`;

    const result = streamText({
      model: google(selectedModelName),
      system: systemPrompt,
      prompt: "Rédige ce chapitre maintenant en HTML en respectant scrupuleusement les consignes et le style.",
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Erreur lors de la génération du chapitre:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec l'IA." },
      { status: 500 }
    );
  }
}
