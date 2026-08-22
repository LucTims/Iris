import { streamText, generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMonthlyQuota } from "@/lib/ai/quota";
import {
  detectIntent,
  resolveTargetChapter,
  ChapterItem,
  ExtendedChatApiRequest
} from "@/lib/ai/intent-detector";
import {
  getAiModel,
  fetchSearchContext,
  SEARCH_GROUNDING_INSTRUCTION,
} from "@/lib/ai/search-context";

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

    // Rate Limiting anti-abus (10 requêtes / minute / utilisateur)
    const rateLimit = await checkRateLimit(`chat_${user.id}`, 10, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter quelques instants." },
        { status: 429 }
      );
    }

    const body: ExtendedChatApiRequest = await req.json();
    const {
      messages = [],
      context,
      chapters: bodyChapters,
      activeChapterIndex,
      model: chosenModel,
      projectId: bodyProjectId,
      useWebSearch = true,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "La liste des messages est requise." },
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
        { error: `Quota mensuel d'IA atteint (${quota.limit} générations). Passez à un plan supérieur pour continuer.` },
        { status: 429 }
      );
    }

    // Extract last user prompt
    const userMessages = messages.filter(
      (msg: any) => msg.sender === "user" || msg.role === "user"
    );
    const lastUserMessage = userMessages.length > 0
      ? (userMessages[userMessages.length - 1].text || userMessages[userMessages.length - 1].content || "")
      : "";

    // Detect Intent (with conversation history for confirmations like "oui va y", "tu peux le faire sur le livre ?")
    const intent = detectIntent(lastUserMessage, messages);

    // 4. Resolve available chapters for all branches
    let availableChapters: ChapterItem[] = Array.isArray(bodyChapters) && bodyChapters.length > 0
      ? bodyChapters
      : (Array.isArray(context?.chapters) ? context.chapters : []);

    const projectId = bodyProjectId || context?.projectId;
    if (availableChapters.length === 0 && projectId) {
      try {
        const { data: dbChapters } = await supabase
          .from("chapters")
          .select("id, title, content, number, order_index")
          .eq("project_id", projectId)
          .order("order_index", { ascending: true });

        if (dbChapters && dbChapters.length > 0) {
          availableChapters = dbChapters.map((c: any, idx: number) => ({
            id: c.id,
            title: c.title,
            content: c.content,
            number: c.number || idx + 1,
            index: idx
          }));
        }
      } catch (dbErr) {
        console.warn("Could not fetch chapters from DB:", dbErr);
      }
    }

    const chaptersOverview = availableChapters.map((c, i) => {
      const num = c.number || i + 1;
      const title = c.title || `Chapitre ${num}`;
      
      // Extract headings (H1, H2, H3)
      const headingsMatches = (c.content || "").match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [];
      const extractedHeadings = headingsMatches.map(h => h.replace(/<[^>]*>/g, '').trim()).filter(Boolean);

      const plainText = c.content ? c.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : "Chapitre vide";
      const snippet = plainText.length > 1000 ? plainText.substring(0, 1000) + "..." : plainText;

      let sectionInfo = "";
      if (extractedHeadings.length > 0) {
        sectionInfo = `\n  Parties et sous-titres découverts dans le texte :\n   - ` + extractedHeadings.join('\n   - ');
      }

      return `[Chapitre ${num} : "${title}"]${sectionInfo}\n  Contenu du texte : ${snippet}`;
    }).join('\n\n');

    // 5. Track usage in Supabase ai_usage table
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: intent === "MODIFY_CHAPTER" ? "chat_modify_chapter" : "chat_assistant",
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    // Branch A: MODIFY_CHAPTER
    if (intent === "MODIFY_CHAPTER") {
      const resolved = resolveTargetChapter({
        userPrompt: lastUserMessage,
        chapters: availableChapters,
        activeChapterIndex,
        currentChapterContent: context?.currentChapterContent,
        fallbackSynopsis: context?.synopsis
      });

      // Build conversation history summary from recent user and AI messages (up to 8 messages)
      const recentHistory = messages && messages.length > 1
        ? messages.slice(-9, -1).map((m: any) => {
            const sender = (m.sender === "user" || m.role === "user") ? "Auteur" : "Iris IA";
            const text = m.text || m.content || "";
            return `${sender} : ${text}`;
          }).filter((line: string) => line.trim().length > 0).join('\n')
        : "";

      const historyFormatted = recentHistory ? `\nHistorique récent de la discussion :\n${recentHistory}\n` : "";

      const editPrompt = `Tu es un assistant de rédaction de livre intelligent appelé Iris IA.
L'auteur te demande de modifier ou réécrire un chapitre de son manuscrit.

Livre concerné :
Titre : ${context?.title || "Sans titre"}
Synopsis global : ${context?.synopsis || "Non spécifié"}
Ton / Style demandé : ${context?.tone || "Professionnel"}

Chapitre ciblé : ${resolved.targetTitle} (Index : ${resolved.targetIndex})
Contenu actuel du chapitre :
"""
${resolved.targetContent || "Chapitre vide."}
"""
${historyFormatted}
Demande actuelle de l'auteur :
"${lastUserMessage}"

Consignes de génération :
1. Rédige le nouveau contenu HTML du chapitre réécrit/enrichi en tenant compte du contenu actuel, des consignes de l'auteur ET de l'historique récent de la discussion.
2. IMPORTANT : TON ENVIRONNEMENT EST CONNECTÉ À L'ÉDITEUR. Le contenu que tu mets dans 'newContent' sera AUTOMATIQUEMENT inséré et remplacera le texte dans l'éditeur de l'auteur. Tu ne dois JAMAIS dire à l'auteur de copier/coller. Fais simplement le travail, renvoie le texte dans 'newContent', et annonce dans 'chatSummary' que tu l'as ajouté à l'éditeur.
3. Utilise des balises HTML sémantiques valides (<p>, <h1>, <h2>, <h3>, <strong>, <em>, <ul>, <li>, <blockquote>). N'inclus PAS <html>, <body>, <head> ou des blocs Markdown \`\`\`html.
4. COMMENCE TOUJOURS le contenu par le titre du chapitre en balise <h1> (ex: <h1>${resolved.targetTitle}</h1>). Ne supprime jamais le titre H1 du début.
5. Rédige un court résumé des modifications (1-2 phrases) pour la propriété 'summary'.
6. Rédige un message chaleureux et explicatif pour la propriété 'chatSummary' (destiné au fil de discussion).`;

      const modificationResult = await generateObject({
        model: getAiModel(selectedModelName),
        schema: z.object({
          chatSummary: z.string().describe("Message conversationnel explicatif pour l'auteur dans le chat"),
          summary: z.string().describe("Résumé synthétique court des modifications effectuées (1 à 2 phrases)"),
          newContent: z.string().describe("Le nouveau contenu HTML complet réécrit du chapitre")
        }),
        prompt: editPrompt
      });

      let cleanedHtml = modificationResult.object.newContent || "";
      cleanedHtml = cleanedHtml
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();

      const chapterModificationPayload = {
        chapterIndex: resolved.targetIndex,
        ...(resolved.targetChapter?.id !== undefined && { chapterId: resolved.targetChapter.id }),
        chapterTitle: resolved.targetTitle,
        newContent: cleanedHtml,
        summary: modificationResult.object.summary
      };

      return NextResponse.json({
        intent: "MODIFY_CHAPTER",
        chatSummary: modificationResult.object.chatSummary,
        message: modificationResult.object.chatSummary,
        text: modificationResult.object.chatSummary,
        chapterModification: chapterModificationPayload
      });
    }

    // Branch B: CHAT_ONLY
    const searchContext = await fetchSearchContext(
      selectedModelName,
      useWebSearch,
      lastUserMessage
    );

    const systemPrompt = `Tu es Iris IA : à la fois un assistant de recherche/connaissance complet ET le co-auteur du livre de l'auteur. Tu es cultivé, curieux et compétent sur TOUS les sujets (histoire, économie, sciences, marchés financiers, actualité, etc.), exactement comme un grand modèle de langage généraliste.

RÈGLE ABSOLUE — NE JAMAIS REFUSER :
Tu ne refuses JAMAIS de répondre à une question sous prétexte qu'elle "sort du cadre du livre" ou "ne fait pas partie du manuscrit". C'est formellement interdit. Une question sur la Première Guerre mondiale, la BRVM, un cours de bourse, une date historique, une définition, etc. DOIT recevoir une vraie réponse factuelle. Ne dis JAMAIS des phrases comme "mon rôle est de vous accompagner uniquement sur votre livre" ou "je n'ai pas accès à ces informations" : tu réponds directement, avec précision.

CAPACITÉS :
- Tu réponds aux questions de culture générale et de recherche factuelle (dates, chiffres, événements, marchés, personnalités...) comme le ferait un assistant expert.
- Quand la recherche web (Google Search) est disponible, utilise-la pour donner des données récentes et vérifiées, et cite tes sources.
- Tu es AUSSI le co-auteur du livre : tu as un ACCÈS TOTAL au manuscrit et à tous les chapitres ci-dessous, et tu peux aider à écrire, structurer et améliorer le livre.

Contexte du projet de l'auteur :
Titre du livre : ${context?.title || "Non défini"}
Synopsis : ${context?.synopsis || "Non défini"}
Ton : ${context?.tone || "Professionnel"}
Chapitre actuellement affiché à l'écran : ${activeChapterIndex !== undefined ? `Chapitre ${activeChapterIndex + 1}` : "Non spécifié"}

--- SOMMAIRE ET CONTENU DES CHAPITRES DU LIVRE ---
${chaptersOverview || "Aucun chapitre rédigé pour le moment."}
--- FIN DU MANUSCRIT ---
${searchContext}
${useWebSearch ? SEARCH_GROUNDING_INSTRUCTION : ""}

Consignes de style :
1. Si l'auteur pose une question factuelle ou de culture générale, réponds-y directement et complètement AVANT toute autre considération. Ne la relie au livre que si c'est pertinent.
2. Tu as un accès total à TOUS les chapitres ci-dessus. Si l'auteur demande "Que contient le chapitre 7 ?", confirme immédiatement et réponds avec les données des chapitres.
3. NE RECOPIE JAMAIS les balises techniques comme "--- [Chapitre 1...]" ni les extraits bruts du système dans tes réponses.
4. Ne prétends JAMAIS avoir déjà modifié le livre si tu es en mode texte simple. Si l'auteur veut appliquer une réécriture, confirme la modification avec bienveillance.
5. Réponds de manière concise, chaleureuse et professionnelle.`;

    const aiMessages: any[] = messages.map((msg: any) => ({
      role: (msg.sender === "ai" || msg.role === "assistant") ? "assistant" : "user",
      content: msg.text || msg.content || "",
    }));

    const result = streamText({
      model: getAiModel(selectedModelName),
      system: systemPrompt,
      messages: aiMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Erreur lors du chat IA:", error);
    return NextResponse.json(
      { error: "Erreur de communication avec l'IA." },
      { status: 500 }
    );
  }
}
