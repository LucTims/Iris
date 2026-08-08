import { google } from "@ai-sdk/google";
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
      projectId: bodyProjectId
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

    // Detect Intent
    const intent = detectIntent(lastUserMessage);

    // 4. Track usage in Supabase ai_usage table
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: bodyProjectId || context?.projectId || null,
        action: intent === "MODIFY_CHAPTER" ? "chat_modify_chapter" : "chat_assistant",
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    // Branch A: MODIFY_CHAPTER
    if (intent === "MODIFY_CHAPTER") {
      let availableChapters: ChapterItem[] = Array.isArray(bodyChapters) && bodyChapters.length > 0
        ? bodyChapters
        : (Array.isArray(context?.chapters) ? context.chapters : []);

      // If no chapters provided in body, try fetching from Supabase if projectId is available
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

      const resolved = resolveTargetChapter({
        userPrompt: lastUserMessage,
        chapters: availableChapters,
        activeChapterIndex,
        currentChapterContent: context?.currentChapterContent,
        fallbackSynopsis: context?.synopsis
      });

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

Demande de l'auteur :
"${lastUserMessage}"

Consignes de génération :
1. Rédige le nouveau contenu HTML du chapitre réécrit/enrichi en suivant scrupuleusement les demandes de l'auteur.
2. Utilise des balises HTML sémantiques valides (<p>, <h2>, <h3>, <strong>, <em>, <ul>, <li>, <blockquote>). N'inclus PAS <html>, <body>, <head> ou des blocs Markdown \`\`\`html.
3. Rédige un court résumé des modifications (1-2 phrases) pour la propriété 'summary'.
4. Rédige un message chaleureux et explicatif pour la propriété 'chatSummary' (destiné au fil de discussion).`;

      const modificationResult = await generateObject({
        model: google(selectedModelName),
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
    const systemPrompt = `Tu es un assistant de rédaction de livre intelligent appelé Iris IA. 
Tu aides un auteur à écrire son livre.
Contexte du projet de l'auteur :
Titre : ${context?.title || "Non défini"}
Synopsis : ${context?.synopsis || "Non défini"}
Ton : ${context?.tone || "Professionnel"}

Réponds de manière concise, encourageante et professionnelle. Tu peux proposer des idées, des suites de phrases, ou corriger le style.`;

    const aiMessages: any[] = messages.map((msg: any) => ({
      role: (msg.sender === "ai" || msg.role === "assistant") ? "assistant" : "user",
      content: msg.text || msg.content || "",
    }));

    const result = streamText({
      model: google(selectedModelName),
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
