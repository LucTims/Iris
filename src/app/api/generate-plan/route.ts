import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMonthlyQuota } from "@/lib/ai/quota";

// Autoriser le temps d'exécution maximal pour l'IA (idéal pour Vercel)
export const maxDuration = 30;

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

    // Rate Limiting anti-abus (5 requêtes / minute / utilisateur)
    const rateLimit = await checkRateLimit(`plan_${user.id}`, 5, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter quelques instants." },
        { status: 429 }
      );
    }

    const {
      title,
      subtitle,
      category,
      audience,
      synopsis,
      tone,
      characters,
      length,
      instructions,
      model: chosenModel
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
    const quota = await checkMonthlyQuota(supabase, user.id, userPlan, userRole);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Quota mensuel d'IA atteint (${quota.limit} générations). Passez à un plan supérieur pour continuer.` },
        { status: 429 }
      );
    }

    // 4. Track usage in Supabase ai_usage table
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        action: "generate_plan",
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    const prompt = `Tu es un auteur et éditeur de livres professionnels (bestsellers). 
Je souhaite écrire un livre. Voici les détails du projet :

Titre : ${title}
Sous-titre : ${subtitle || "Non spécifié"}
Catégorie : ${category}
Public cible : ${audience}
Longueur souhaitée : ${length}
Ton / Style : ${tone}
Personnages / Concepts clés : ${characters || "Aucun spécifié"}

Synopsis ou Idée Principale :
${synopsis}

Consignes supplémentaires :
${instructions || "Aucune consigne spécifique"}

Ta mission est de me proposer un **PLAN DÉTAILLÉ** pour ce livre (chapitres, et sous-parties avec une courte description pour chaque).
Sois créatif, pertinent par rapport au public cible, et respecte scrupuleusement le ton demandé.
Ne me fais pas une introduction générique, commence directement par le plan avec des titres accrocheurs.`;

    const result = streamText({
      model: google(selectedModelName),
      system: "Tu es un assistant de rédaction de livre intelligent, appelé Iris IA. Tu aides les auteurs à structurer et rédiger leurs ouvrages.",
      prompt: prompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Erreur lors de la génération IA:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec l'IA." },
      { status: 500 }
    );
  }
}
