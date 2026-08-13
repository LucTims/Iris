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
      model: chosenModel,
      includeDetailedPlan,
      includeToc
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

    let missionText = "";
    let mainTitle = "";
    
    if (includeDetailedPlan) {
      missionText = `Ta mission est de générer le **PLAN DÉTAILLÉ** de ce livre. Structure le plan de manière logique avec des chapitres et des sous-parties, accompagnés d'une brève description.`;
      mainTitle = "Plan Détaillé";
    } else {
      let tocInstruction = includeToc ? "Commence obligatoirement par un **SOMMAIRE** (Table des matières) listant les chapitres, puis enchaîne avec la rédaction du contenu." : "Ne fais pas de sommaire.";
      
      missionText = `Ta mission est d'écrire **DIRECTEMENT LE CONTENU DU LIVRE** (le texte complet). Puisque c'est un format de type "${length}", écris les chapitres avec le contenu final prêt à être lu. Rédige de façon fluide en utilisant le style demandé.
${tocInstruction}`;
      mainTitle = title;
    }

    const prompt = `Voici les détails du livre :
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

${missionText}`;

    const result = streamText({
      model: google(selectedModelName),
      system: `Tu es un ghostwriter expert et rédacteur de livres professionnels. 
IMPORTANT: 
- Tu dois répondre UNIQUEMENT avec le contenu formaté en HTML valide (<h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>).
- Le tout premier élément DOIT être <h1>${mainTitle}</h1>.
- N'utilise JAMAIS de Markdown (pas de **, pas de #, pas de \`\`\`).
- NE FAIS AUCUNE SALUTATION (ne dis pas "Bonjour", ni "Voici le contenu", ni "Absolument", ni "En tant qu'IA").
- Commence directement par la balise <h1>.
- Ne rajoute aucun commentaire personnel à la fin, sois purement factuel et professionnel dans l'exécution de la tâche.`,
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
