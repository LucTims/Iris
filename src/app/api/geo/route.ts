import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { title, content } = await req.json();

    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      system: `Tu es un expert en GEO (Generative Engine Optimization).
Ton rôle est d'analyser un texte et de donner un score sur 100 de sa "compréhension" par les IAs (Google, Perplexity, ChatGPT), ainsi que 3 recommandations très courtes et précises pour l'améliorer sémantiquement.
- score: un nombre de 0 à 100.
- feedback: tableau de 3 strings, recommandations courtes.`,
      prompt: `Titre du document: ${title}\n\nContenu:\n${content.substring(0, 15000)}`,
      schema: z.object({
        score: z.number().describe("Score de 0 à 100"),
        feedback: z.array(z.string()).describe("3 recommandations courtes d'amélioration GEO"),
      }),
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("GEO API Error:", error);
    return NextResponse.json({ error: "Failed to generate GEO score" }, { status: 500 });
  }
}
