import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMonthlyQuota } from "@/lib/ai/quota";
import { getAiModel } from "@/lib/ai/search-context";

export const maxDuration = 30; // 30s is enough for contextual actions

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

    // Rate Limiting anti-abus (10 requêtes / minute / utilisateur pour les actions contextuelles)
    const rateLimit = await checkRateLimit(`aiaction_${user.id}`, 10, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de requêtes en cours. Veuillez patienter." },
        { status: 429 }
      );
    }

    const {
      actionType,
      selectedText,
      tone,
      synopsis,
      projectId,
      model: chosenModel
    } = await req.json();

    if (!selectedText || !actionType) {
      return NextResponse.json(
        { error: "Le texte sélectionné et l'action sont requis." },
        { status: 400 }
      );
    }

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
        { error: `Quota mensuel d'IA atteint. Passez à un plan supérieur.` },
        { status: 429 }
      );
    }

    // 4. Track usage in Supabase ai_usage table
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: `action_${actionType}`,
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    let instruction = "";
    switch (actionType) {
      case "reformuler":
        instruction = "Reformule le texte suivant de manière plus fluide et élégante, tout en conservant son sens original.";
        break;
      case "enrichir":
        instruction = "Enrichis le texte suivant en ajoutant plus de détails descriptifs, de vocabulaire riche et de profondeur, sans le dénaturer.";
        break;
      case "etendre":
        instruction = "Développe et étends les idées du texte suivant pour créer un paragraphe plus long et plus complet.";
        break;
      case "corriger":
        instruction = "Corrige l'orthographe, la grammaire et la syntaxe du texte suivant, sans modifier son sens ou son style inutilement.";
        break;
      default:
        instruction = "Améliore le texte suivant.";
    }

    const systemPrompt = `Tu es un assistant littéraire et éditeur professionnel.
Ta mission est de modifier un extrait de texte selon l'instruction suivante : ${instruction}

Contexte du livre (pour adapter le style si nécessaire) :
- Ton / Style : ${tone || "Professionnel"}
- Synopsis : ${synopsis || "Non défini"}

Instructions impératives :
1. Renvoie UNIQUEMENT le texte modifié. Aucun préambule, aucun commentaire, pas de guillemets autour de la réponse, pas de "Voici le texte :".
2. Conserve le formatage HTML de base si présent (ex: <strong>, <em>), sinon renvoie du texte simple ou des balises <p>.
3. Ne réponds qu'avec le résultat final de la transformation.`;

    const result = streamText({
      model: getAiModel(selectedModelName),
      system: systemPrompt,
      prompt: `Voici le texte à traiter :\n\n${selectedText}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Erreur lors de l'action IA contextuelle:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec l'IA." },
      { status: 500 }
    );
  }
}
