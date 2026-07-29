import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { messages, context, model: chosenModel } = await req.json();

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

    // 3. Quota Enforcement: Check monthly usage count
    const { count: usageCount } = await supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const FREE_LIMIT = 50;
    if (userPlan === "free" && userRole !== "admin" && (usageCount || 0) >= FREE_LIMIT) {
      return NextResponse.json(
        { error: "Quota mensuel d'IA atteint (50 générations). Passez au Plan Pro pour un accès illimité." },
        { status: 429 }
      );
    }

    // 4. Track usage in Supabase ai_usage table
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        action: "chat_assistant",
        model: selectedModelName
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    const systemPrompt = `Tu es un assistant de rédaction de livre intelligent appelé Iris IA. 
Tu aides un auteur à écrire son livre.
Contexte du projet de l'auteur :
Titre : ${context?.title}
Synopsis : ${context?.synopsis}
Ton : ${context?.tone}

Réponds de manière concise, encourageante et professionnelle. Tu peux proposer des idées, des suites de phrases, ou corriger the style.`;

    const aiMessages: any[] = messages.map((msg: any) => ({
      role: msg.sender === "ai" ? "assistant" : "user",
      content: msg.text,
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
