import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductFixedCoins } from "@/lib/ai/cost-engine";
import { getAiModel } from "@/lib/ai/search-context";

export const maxDuration = 60;

/** Tarif forfaitaire de l'analyse d'un document, en pièces. */
const ANALYSIS_COST_COINS = 20;

/** Consignes d'analyse selon l'usage voulu du document par l'auteur. */
const PURPOSE_INSTRUCTIONS: Record<string, string> = {
  inspiration:
    "L'auteur veut S'INSPIRER de ce document (idées, angles, exemples) sans le copier. Dégage les idées et angles réutilisables.",
  learn:
    "L'auteur veut APPRENDRE de ce document : extrais les connaissances, faits, chiffres, définitions et arguments importants à réutiliser dans le livre.",
  style:
    "L'auteur veut REPRODUIRE LE STYLE et le ton de ce document. Décris précisément le style d'écriture (registre, rythme, vocabulaire, structure des phrases) pour pouvoir l'imiter.",
  reference:
    "L'auteur fournit ce document comme RÉFÉRENCE générale pour écrire son livre. Dégage tout ce qui est utile.",
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Accès non autorisé. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const rateLimit = await checkRateLimit(`analyze_${user.id}`, 8, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop d'analyses en peu de temps. Veuillez patienter quelques instants." },
        { status: 429 }
      );
    }

    const {
      text,
      fileName,
      purpose = "reference",
      model: chosenModel,
      projectId,
    } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return NextResponse.json(
        { error: "Le document ne contient pas assez de texte à analyser." },
        { status: 400 }
      );
    }

    const selectedModelName = chosenModel || "gemini-2.5-flash";

    const hasEnoughCoins = await checkMinimumBalance(user.id, ANALYSIS_COST_COINS);
    if (!hasEnoughCoins) {
      return NextResponse.json(
        { error: `Fonds insuffisants. L'analyse d'un document coûte ${ANALYSIS_COST_COINS} pièces.` },
        { status: 402 }
      );
    }

    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: "analyze_document",
        model: selectedModelName,
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    const purposeInstruction =
      PURPOSE_INSTRUCTIONS[purpose] || PURPOSE_INSTRUCTIONS.reference;

    const system = `Tu es un analyste littéraire et éditorial expert. On te donne le contenu d'un document fourni par un auteur qui écrit un livre.
${purposeInstruction}

Produis une ANALYSE STRUCTURÉE, dense et directement exploitable, en français, avec ces sections (titres en gras suivis de deux-points) :
- **Résumé** : de quoi parle le document (3 à 6 phrases).
- **Idées et thèmes clés** : liste à puces des points essentiels.
- **Ton et style** : registre, rythme, vocabulaire, procédés d'écriture.
- **Faits, chiffres et exemples notables** : données réutilisables (si présentes).
- **Structure** : comment le document est organisé.
- **Comment l'exploiter pour le livre** : recommandations concrètes selon l'objectif de l'auteur.

Sois factuel et concis. N'invente rien qui ne soit pas dans le document. Réponds UNIQUEMENT avec l'analyse (pas de salutation, pas de "Voici l'analyse").`;

    const prompt = `Document à analyser${fileName ? ` (fichier : ${fileName})` : ""} :\n\n"""\n${text}\n"""`;

    const result = await generateText({
      model: getAiModel(selectedModelName),
      system,
      prompt,
    });

    await deductFixedCoins(
      user.id,
      ANALYSIS_COST_COINS,
      `Analyse de document${fileName ? ` : ${fileName}` : ""}`,
      { model_id: selectedModelName }
    );

    return NextResponse.json({
      analysis: (result.text || "").trim(),
      fileName: fileName || null,
      purpose,
    });
  } catch (error) {
    console.error("Erreur lors de l'analyse du document:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'analyse du document." },
      { status: 500 }
    );
  }
}
