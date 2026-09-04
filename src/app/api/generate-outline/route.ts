import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductGenerationCost } from "@/lib/ai/cost-engine";
import { generateWithFallback } from "@/lib/ai/model-fallback";
import { detectGenre } from "@/lib/ai/book-style";
import { resolveWorkType, workTypeOutlineRules, WORK_TYPE_META } from "@/lib/book/work-type";

export const maxDuration = 60;

/**
 * Analyse une liste de chapitres renvoyée en TEXTE (un chapitre par ligne,
 * « Titre :: aperçu »). On évite volontairement `generateObject` (sortie
 * structurée), peu fiable avec la combinaison @ai-sdk/google v4 + ai v7 :
 * un simple texte + parsing tolérant est bien plus robuste et ne casse jamais
 * la génération d'un livre sans sommaire.
 */
function parseOutlineText(text: string): { title: string; brief: string }[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    // On retire une éventuelle numérotation ou puce en début de ligne.
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .map((line) => {
      // Séparateurs acceptés (par ordre de priorité) : « :: », « — », « – », « - », « : ».
      const m = line.match(/^(.*?)\s*(?:::|—|–|\s-\s|:)\s*(.*)$/);
      if (m) {
        return { title: m[1].replace(/<[^>]*>/g, "").trim(), brief: m[2].replace(/<[^>]*>/g, "").trim() };
      }
      return { title: line.replace(/<[^>]*>/g, "").trim(), brief: "" };
    })
    .filter((c) => c.title.length > 1 && !/^chapitres?$/i.test(c.title))
    .slice(0, 24);
}

/**
 * Génère UNIQUEMENT une structure de chapitres (titre + aperçu).
 * Utilisé par « Générer tout le livre » quand il n'existe PAS de sommaire :
 * on déduit la structure à partir des infos du projet (titre, synopsis,
 * public…) — un « prototype » facultatif l'enrichit — puis chaque chapitre
 * est rédigé séparément. Fonctionne même sans prototype.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`outline_${user.id}`, 5, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Trop de requêtes. Veuillez patienter." }, { status: 429 });
    }

    const {
      title,
      subtitle,
      synopsis,
      tone,
      audience,
      category,
      length,
      instructions,
      prototype,
      targetChapters,
      referenceAnalysis,
      model: chosenModel,
      projectId,
      workType: requestedWorkType,
    } = await req.json();

    const selectedModelName = chosenModel || "gemini-2.5-flash";
    const nbChapters = Math.max(3, Math.min(24, Number(targetChapters) || 8));
    // La forme de l'ouvrage décide du découpage : un guide s'articule en
    // étapes opérationnelles, un livre en chapitres thématiques.
    const workType = resolveWorkType({ explicit: requestedWorkType, category, title, length });
    const outlineRules = workTypeOutlineRules(workType, detectGenre(category, tone));

    const hasEnoughCoins = await checkMinimumBalance(user.id, 20);
    if (!hasEnoughCoins) {
      return NextResponse.json(
        { error: "Fonds insuffisants pour préparer la structure du livre." },
        { status: 402 }
      );
    }

    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: "generate_outline",
        model: selectedModelName,
      });
    } catch (trackErr) {
      console.warn("Usage tracking error:", trackErr);
    }

    const prompt = `Tu es un architecte de livres. Propose la STRUCTURE en chapitres d'un livre (sans page de sommaire, mais chaque chapitre a bien un grand titre).

Détails :
Forme de l'ouvrage : ${WORK_TYPE_META[workType].label} — ${WORK_TYPE_META[workType].hint}
Titre : ${title || "Sans titre"}
Sous-titre : ${subtitle || "—"}
Catégorie : ${category || "—"}
Public cible : ${audience || "—"}
Longueur souhaitée : ${length || "—"}
Ton / style : ${tone || "—"}
Idée / synopsis : ${synopsis || "—"}
Consignes : ${instructions || "—"}
${prototype ? `\nPrototype rédigé par l'IA (sers-t'en comme base d'inspiration) :\n${String(prototype).slice(0, 4000)}\n` : ""}
${referenceAnalysis ? `\nAnalyse d'un document de référence fourni par l'auteur :\n${String(referenceAnalysis).slice(0, 4000)}\n` : ""}

${outlineRules}

Génère EXACTEMENT ${nbChapters} chapitres (ni plus, ni moins), dans un ordre logique et progressif.

FORMAT DE RÉPONSE STRICT — réponds UNIQUEMENT avec la liste, un chapitre par ligne, au format exact :
Titre du chapitre :: aperçu en 1 à 2 phrases de ce que couvre le chapitre

N'ajoute AUCUNE numérotation, AUCUN titre général, AUCUNE ligne vide, AUCUN texte avant ou après la liste. Réponds en français.`;

    // REPLI AUTOMATIQUE entre fournisseurs : cette route appelait un seul
    // modèle en direct, donc une clé morte (Gemini désactivé) empêchait toute
    // préparation de structure et bloquait l'écriture d'un livre sans sommaire.
    let result;
    try {
      result = await generateWithFallback({ preferred: selectedModelName, prompt });
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      console.error("[generate-outline] Tous les fournisseurs ont échoué :", msg);
      try {
        await supabase.from("ai_usage").insert({
          user_id: user.id,
          project_id: projectId || null,
          action: "generate_outline_error",
          model: msg.slice(0, 300),
        });
      } catch { /* best-effort */ }
      result = { text: "", modelUsed: selectedModelName, usage: undefined, fellBack: false, errors: [] } as any;
    }

    if (result.text) {
      await deductGenerationCost(
        user.id,
        result.modelUsed,
        result.usage,
        `Structure du livre : ${title || ""}`,
        { projectId, outputText: result.text }
      );
    }

    let chapters = parseOutlineText(result.text || "");

    // Filet de sécurité : si le modèle n'a rien renvoyé d'exploitable, on
    // fabrique une structure minimale à partir du projet pour que la génération
    // du livre ne soit JAMAIS bloquée (l'auteur pourra affiner les titres).
    if (chapters.length === 0) {
      const base = (synopsis || title || "").toString().trim();
      chapters = Array.from({ length: nbChapters }, (_, k) => ({
        title: `Chapitre ${k + 1}`,
        brief: base ? `Développe cette partie du livre : ${base.slice(0, 200)}` : "",
      }));
    }

    return NextResponse.json({ chapters });
  } catch (error) {
    console.error("Erreur lors de la génération de la structure:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la préparation de la structure du livre." },
      { status: 500 }
    );
  }
}
