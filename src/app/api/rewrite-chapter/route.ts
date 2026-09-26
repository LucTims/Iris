import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMonthlyQuota } from "@/lib/ai/quota";
import { checkMinimumBalance, deductChapterCost } from "@/lib/ai/cost-engine";
import {
  getAiModel,
  fetchSearchContext,
} from "@/lib/ai/search-context";
import { factualityRules } from "@/lib/ai/factuality";
import { detectGenre } from "@/lib/ai/book-style";
import { craftCharter, emotionDirective } from "@/lib/ai/writing-craft";
import { resolveWorkType } from "@/lib/book/work-type";
import { defaultEnrichment, enrichmentRules } from "@/lib/book/enrichment";
import { loadWritingProfile } from "@/lib/book/writing-profile";

export const maxDuration = 60;

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

    const { content, instructions, projectContext, model, useWebSearch = true } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Le contenu est requis pour une réécriture." }, { status: 400 });
    }

    if (!(await checkMinimumBalance(user.id, 30))) {
      return NextResponse.json(
        { error: "Fonds insuffisants (pièces) pour réécrire ce texte." },
        { status: 402 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, plan")
      .eq("id", user.id)
      .single();

    const userPlan = profile?.plan || "free";
    const userRole = profile?.role || "user";

    let selectedModelName = model || "gemini-3.6-flash";
    if (selectedModelName === "gemini-2.5-pro" && userPlan === "free" && userRole !== "admin") {
      selectedModelName = "gemini-3.6-flash";
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

    const searchQuery = projectContext
      ? `${projectContext.title} ${instructions || ""}`
      : instructions || "";
    const searchContext = await fetchSearchContext(
      selectedModelName,
      useWebSearch,
      searchQuery
    );

    // Nature du livre et plume de l'auteur : la réécriture doit rester dans la
    // même voix et la même mise en forme que le reste du manuscrit.
    const projectId: string | null = projectContext?.id || null;
    let bookRow: { category?: string | null; tone?: string | null; work_type?: string | null; title?: string | null } | null = null;
    if (projectId) {
      const { data } = await supabase
        .from("projects")
        .select("category, tone, work_type, title")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();
      bookRow = data;
    }
    const genre = detectGenre(bookRow?.category, bookRow?.tone || projectContext?.tone);
    const workType = resolveWorkType({ explicit: bookRow?.work_type, category: bookRow?.category, title: bookRow?.title });
    const writing = bookRow ? await loadWritingProfile(supabase, projectId) : {};
    const enrichment = writing.enrichment ?? defaultEnrichment(genre, workType);
    const authorStyleBlock = writing.authorStyle
      ? `\nLA PLUME DE L'AUTEUR (à respecter : le texte réécrit doit sonner comme lui) :\n${writing.authorStyle.slice(0, 3000)}\n`
      : "";

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
      model: getAiModel(selectedModelName),
      system: `Tu es un écrivain et éditeur de métier : tu réécris ce texte comme le ferait un auteur publié qui a une vraie plume.
IMPORTANT:
- Tu dois répondre UNIQUEMENT avec le contenu réécrit formaté en HTML valide (<h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, et les éléments de mise en forme autorisés ci-dessous).
- N'utilise JAMAIS de Markdown (pas de **, pas de #, pas de \`\`\`).
- NE FAIS AUCUNE SALUTATION (ne dis pas "Bonjour", ni "Voici le contenu", ni "Absolument").
- Ne rajoute aucun commentaire personnel à la fin, donne-moi juste le code HTML pur de la nouvelle version du texte.
${authorStyleBlock}
${craftCharter(genre, workType)}

${emotionDirective(bookRow?.tone || projectContext?.tone, genre)}

${enrichmentRules(enrichment, genre)}
${searchContext}
${genre === "fiction" ? "" : factualityRules(searchContext)}`,
      prompt: prompt,
      onError({ error }) {
        console.error("[rewrite-chapter] Erreur pendant le stream IA:", error);
      },
      async onFinish({ usage, text }) {
        await deductChapterCost(
          user.id,
          selectedModelName,
          usage,
          "Réécriture d'un chapitre",
          { projectId: projectContext?.id || null, outputText: text }
        );
      },
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
