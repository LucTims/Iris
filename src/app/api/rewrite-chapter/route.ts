import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMonthlyQuota } from "@/lib/ai/quota";

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

    const rateLimit = await checkRateLimit(`rewrite_${user.id}`, 10, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter quelques instants." },
        { status: 429 }
      );
    }

    const { content, instructions, projectContext, model } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Le contenu est requis pour une réécriture." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, plan")
      .eq("id", user.id)
      .single();

    const userPlan = profile?.plan || "free";
    const userRole = profile?.role || "user";

    let selectedModelName = model || "gemini-2.5-flash";
    if (selectedModelName === "gemini-2.5-pro" && userPlan === "free" && userRole !== "admin") {
      selectedModelName = "gemini-2.5-flash";
    }

    const quota = await checkMonthlyQuota(supabase, user.id, userPlan, userRole);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Quota mensuel d'IA atteint (${quota.limit} générations). Passez à un plan supérieur pour continuer.` },
        { status: 429 }
      );
    }

    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        action: "rewrite_chapter",
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    let projectInfo = "";
    if (projectContext) {
      projectInfo = `
Informations du livre (pour contexte) :
Titre : ${projectContext.title}
Audience : ${projectContext.audience || "Non spécifié"}
Ton : ${projectContext.tone || "Non spécifié"}
`;
    }

    const prompt = `${projectInfo}
Voici le contenu actuel :
--------------------------------------------------
${content}
--------------------------------------------------

INSTRUCTIONS DE RÉÉCRITURE DEMANDÉES PAR L'AUTEUR :
${instructions || "Améliore ce texte pour le rendre plus professionnel, fluide et captivant, tout en corrigeant les éventuelles fautes."}

Ta mission :
Réécris TOUT le contenu ci-dessus en appliquant strictement les instructions de réécriture demandées par l'auteur. 
Si le texte contient des titres, conserve-les (ou améliore-les).`;

    const result = streamText({
      model: google(selectedModelName),
      system: `Tu es un ghostwriter expert et éditeur de livres professionnels.
IMPORTANT: 
- Tu dois répondre UNIQUEMENT avec le contenu réécrit formaté en HTML valide (<h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>).
- N'utilise JAMAIS de Markdown (pas de **, pas de #, pas de \`\`\`).
- NE FAIS AUCUNE SALUTATION (ne dis pas "Bonjour", ni "Voici le contenu", ni "Absolument").
- Ne rajoute aucun commentaire personnel à la fin, donne-moi juste le code HTML pur de la nouvelle version du texte.`,
      prompt: prompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Erreur lors de la réécriture:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec l'IA." },
      { status: 500 }
    );
  }
}
