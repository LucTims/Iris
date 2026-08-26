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

    // Pièces réellement dépensées, attribuées par projet via le champ
    // metadata.project_id des débits (RLS : uniquement les transactions de
    // l'utilisateur courant). Certaines actions sans projet ne sont pas
    // rattachées (comptées seulement dans le total).
    let totalCoins = 0;
    try {
      const { data: wallets } = await supabase.from("wallets").select("id");
      const walletIds = (wallets || []).map((w) => w.id);
      if (walletIds.length > 0) {
        const { data: debits } = await supabase
          .from("coin_transactions")
          .select("amount, metadata")
          .eq("type", "debit")
          .in("wallet_id", walletIds);
        for (const d of debits || []) {
          const amt = Number(d.amount) || 0;
          totalCoins += amt;
          const pid = (d.metadata as any)?.project_id;
          if (pid) {
            if (!projectStats[pid]) projectStats[pid] = { words: 0, chaptersCount: 0 };
            (projectStats[pid] as any).coins = ((projectStats[pid] as any).coins || 0) + amt;
          }
        }
      }
    } catch (coinErr) {
      console.warn("Analytics coins non disponibles:", coinErr);
    }

    return NextResponse.json({
      global: {
        totalWords,
        totalPages: Math.ceil(totalWords / 250),
        totalCoins,
      },
      projectStats,
    });

  } catch (error: any) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
