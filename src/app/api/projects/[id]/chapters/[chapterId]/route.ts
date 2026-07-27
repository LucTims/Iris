import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUT /api/projects/[id]/chapters/[chapterId] - Autosave chapter
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    const { title, content, status } = await req.json();

    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;

    const { data: chapter, error } = await supabase
      .from("chapters")
      .update({
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content, word_count: wordCount }),
        ...(status !== undefined && { status }),
        updated_at: new Date().toISOString()
      })
      .eq("id", chapterId)
      .eq("project_id", id)
      .select()
      .single();

    if (error) throw error;

    // Update project updated_at
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ chapter });
  } catch (error: any) {
    console.error("PUT /api/projects/[id]/chapters/[chapterId] error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
