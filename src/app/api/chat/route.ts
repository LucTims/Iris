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

    const { messages, context } = await req.json();

    const systemPrompt = `Tu es un assistant de rédaction de livre intelligent appelé Iris IA. 
Tu aides un auteur à écrire son livre.
Contexte du projet de l'auteur :
Titre : ${context?.title}
Synopsis : ${context?.synopsis}
Ton : ${context?.tone}

Réponds de manière concise, encourageante et professionnelle. Tu peux proposer des idées, des suites de phrases, ou corriger le style.`;

    const aiMessages: any[] = messages.map((msg: any) => ({
      role: msg.sender === "ai" ? "assistant" : "user",
      content: msg.text,
    }));

    const result = streamText({
      model: google("gemini-2.5-flash"),
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
