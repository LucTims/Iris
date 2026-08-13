import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function countWords(htmlString: string | null | undefined): number {
  if (!htmlString) return 0;
  const textContent = htmlString.replace(/<[^>]*>?/gm, " ");
  const words = textContent.trim().split(/\s+/);
  if (words.length === 1 && words[0] === "") return 0;
  return words.length;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    // Récupère tous les chapitres de tous les projets de l'utilisateur
    // On sélectionne juste project_id et content pour optimiser
    const { data: chapters, error } = await supabase
      .from("chapters")
      .select("project_id, content");

    if (error) throw error;

    const projectStats: Record<string, { words: number, chaptersCount: number }> = {};
    let totalWords = 0;

    if (chapters) {
      for (const chapter of chapters) {
        const projectId = chapter.project_id;
        const wordsInChapter = countWords(chapter.content);
        
        totalWords += wordsInChapter;
        
        if (!projectStats[projectId]) {
          projectStats[projectId] = { words: 0, chaptersCount: 0 };
        }
        projectStats[projectId].words += wordsInChapter;
        projectStats[projectId].chaptersCount += 1;
      }
    }

    return NextResponse.json({
      global: {
        totalWords,
        totalPages: Math.ceil(totalWords / 250),
        estimatedCost: (totalWords / 1000) * 0.05 // 0.05€ per 1000 words generated
      },
      projectStats
    });

  } catch (error: any) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
