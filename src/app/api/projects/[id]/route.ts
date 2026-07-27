import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    return NextResponse.json({ project, chapters });
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
