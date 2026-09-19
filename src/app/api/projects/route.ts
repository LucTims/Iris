import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WORK_TYPES } from "@/lib/book/work-type";
import { evaluateCompletion, resolveBookStatus } from "@/lib/book/completion";

/** Valeurs acceptées par les contraintes CHECK de `projects`. */
const VALID_WORK_TYPES: string[] = WORK_TYPES;

// GET /api/projects - List user projects
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    // On lit le titre et le compteur de mots de chaque chapitre (pas leur
    // contenu : ce serait des mégaoctets pour rien) afin de calculer
    // l'avancement réel du livre et l'état « Terminé ».
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*, chapters(count), chapter_list:chapters(title, word_count)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const enriched = (projects || []).map((project) => {
      const completion = evaluateCompletion(project.chapter_list || []);
      const { chapter_list: _chapterList, ...rest } = project;
      return {
        ...rest,
        completion,
        status: resolveBookStatus(project.status, completion),
      };
    });

    return NextResponse.json({ projects: enriched });
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/projects - Create new project
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { title, subtitle, category, audience, synopsis, tone, characters, length, instructions, referenceDocument, workType, blueprintId } = body;

    if (!title) {
      return NextResponse.json({ error: "Le titre du projet est requis" }, { status: 400 });
    }

    // `blueprintId` et `workType` désignent la même chose ; l'assistant envoie
    // les deux, les clients plus anciens seulement `workType`.
    const resolvedBlueprint = String(blueprintId || workType || "");

    // Document de référence analysé (facultatif) : persisté pour que la
    // génération reste possible depuis n'importe quel appareil/session.
    const refAnalysis =
      referenceDocument && typeof referenceDocument.analysis === "string" && referenceDocument.analysis.trim()
        ? referenceDocument.analysis
        : null;
    const refMeta = refAnalysis
      ? { name: referenceDocument.name || null, purpose: referenceDocument.purpose || "reference" }
      : null;

    // Insert project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        subtitle,
        category,
        audience,
        synopsis,
        tone,
        characters,
        length,
        instructions,
        // Forme de l'ouvrage (livre / guide / ebook). Rétrocompatible :
        // les blueprints visuels (storybook) utilisent "livre" comme work_type.
        work_type: ["livre", "guide", "ebook"].includes(resolvedBlueprint)
          ? resolvedBlueprint
          : resolvedBlueprint === "storybook" ? "livre" : null,
        // Blueprint : identifiant étendu qui inclut les types visuels (storybook).
        blueprint_id: ["roman", "guide", "ebook", "storybook"].includes(resolvedBlueprint)
          ? resolvedBlueprint
          : "roman",
        reference_analysis: refAnalysis,
        reference_meta: refMeta,
        status: "En cours"
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Create initial chapter 1
    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .insert({
        project_id: project.id,
        number: 1,
        title: "Sommaire (En cours...)",
        content: "",
        status: "Brouillon"
      })
      .select()
      .single();

    if (chapterError) throw chapterError;

    return NextResponse.json({ project, chapter });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
