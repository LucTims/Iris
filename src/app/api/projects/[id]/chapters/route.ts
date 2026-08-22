import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface IncomingChapter {
  number: number;
  title: string;
  content?: string;
  status?: string;
}

// POST /api/projects/[id]/chapters - Bulk-create chapters for a project.
// Utilisé quand un plan généré est scindé en plusieurs chapitres (splitHtmlIntoChapters)
// ou lors d'un import de manuscrit, pour éviter que les nouveaux chapitres ne vivent
// qu'en state client (ids Date.now()) et disparaissent au rechargement.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    // Vérifie explicitement que le projet appartient bien à l'utilisateur
    // (défense en profondeur en plus de la policy RLS sur chapters).
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const chapters: IncomingChapter[] = Array.isArray(body?.chapters) ? body.chapters : [];

    if (chapters.length === 0) {
      return NextResponse.json({ error: "Aucun chapitre à créer." }, { status: 400 });
    }

    const rows = chapters.map((chapter) => {
      const content = chapter.content || "";
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      return {
        project_id: projectId,
        number: chapter.number,
        title: chapter.title || `Chapitre ${chapter.number}`,
        content,
        status: chapter.status || "Brouillon",
        word_count: wordCount
      };
    });

    const { data: insertedChapters, error: insertError } = await supabase
      .from("chapters")
      .insert(rows)
      .select();

    if (insertError) {
      // Violation de la contrainte unique (project_id, number) : conflit explicite,
      // pas un échec silencieux.
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Des chapitres avec ces numéros existent déjà pour ce projet." },
          { status: 409 }
        );
      }
      throw insertError;
    }

    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", projectId);

    return NextResponse.json({ chapters: insertedChapters });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/chapters error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
