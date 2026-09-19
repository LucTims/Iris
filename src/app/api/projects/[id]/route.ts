import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateCompletion, resolveBookStatus } from "@/lib/book/completion";

/** Statuts de livre acceptés en base (tout le reste est refusé). */
const ALLOWED_STATUSES = ["Brouillon", "En cours", "En rédaction", "Mise en page", "Terminé"];

// GET /api/projects/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", id)
      .order("number", { ascending: true });

    if (chaptersError) throw chaptersError;

    // Avancement réel du livre : sert au badge « Livre terminé » et à la barre
    // de progression, côté éditeur comme côté liste de projets.
    const completion = evaluateCompletion(chapters || []);

    return NextResponse.json({
      project: { ...project, completion, status: resolveBookStatus(project.status, completion) },
      chapters,
      completion,
    });
  } catch (error: any) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    // Allow updating specific fields
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.subtitle !== undefined) updates.subtitle = body.subtitle;
    if (body.category !== undefined) updates.category = body.category;
    if (body.cover_url !== undefined) updates.cover_url = body.cover_url;

    // Statut du livre. Deux garde-fous :
    //  1. seules les valeurs connues sont acceptées (sinon n'importe quelle
    //     chaîne finissait en base et cassait l'affichage et les filtres) ;
    //  2. on refuse de marquer « Terminé » un livre dont aucun chapitre n'est
    //     rédigé — un livre vide déclaré fini n'a aucun sens et fausserait les
    //     statistiques de l'auteur comme celles de l'administration.
    if (body.status !== undefined) {
      const requested = String(body.status);
      if (!ALLOWED_STATUSES.includes(requested)) {
        return NextResponse.json({ error: "Statut de livre inconnu." }, { status: 400 });
      }

      if (requested === "Terminé") {
        const { data: chapterRows } = await supabase
          .from("chapters")
          .select("title, word_count")
          .eq("project_id", id);

        const report = evaluateCompletion(chapterRows || []);
        if (report.written === 0) {
          return NextResponse.json(
            { error: "Ce livre ne contient aucun chapitre rédigé : il ne peut pas être marqué terminé." },
            { status: 400 }
          );
        }
      }

      updates.status = requested;
    }


    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ project: data });
  } catch (error: any) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
