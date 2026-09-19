import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateCompletion, resolveBookStatus } from "@/lib/book/completion";
import { calculatePages, estimateReadingTime } from "@/lib/textAnalytics";

/**
 * Statistiques d'écriture de l'auteur.
 *
 * PERFORMANCE — cette route lisait `chapters.content` pour TOUS les chapitres
 * de l'auteur, puis recomptait les mots en mémoire à chaque appel. Sur un
 * compte avec quelques livres, cela représente plusieurs mégaoctets de HTML
 * transférés depuis Postgres pour produire une poignée de nombres, à chaque
 * ouverture de la page. On lit désormais la colonne `word_count`, déjà
 * maintenue par le pipeline de génération et par l'enregistrement de chapitre.
 *
 * Le contenu n'est plus jamais transféré ici.
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
    }

    // RLS restreint déjà aux projets de l'auteur ; le filtre explicite garde
    // la requête correcte si la policy évoluait.
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, title, status, category, work_type, blueprint_id, created_at, updated_at")
      .eq("user_id", user.id);

    if (projectsError) throw projectsError;

    const projectIds = (projects || []).map((p) => p.id);

    const { data: chapters, error: chaptersError } = projectIds.length
      ? await supabase
          .from("chapters")
          .select("project_id, title, word_count")
          .in("project_id", projectIds)
      : { data: [], error: null };

    if (chaptersError) throw chaptersError;

    // Regroupement des chapitres par projet (une seule passe).
    const byProject = new Map<string, { title: string; word_count: number | null }[]>();
    for (const chapter of chapters || []) {
      const list = byProject.get(chapter.project_id) || [];
      list.push({ title: chapter.title, word_count: chapter.word_count });
      byProject.set(chapter.project_id, list);
    }

    const projectStats: Record<
      string,
      {
        title: string;
        words: number;
        chaptersCount: number;
        pages: number;
        readingTime: string;
        percent: number;
        written: number;
        total: number;
        status: string;
        coins: number;
        updatedAt: string;
      }
    > = {};

    let totalWords = 0;
    let finishedBooks = 0;
    let inProgressBooks = 0;

    for (const project of projects || []) {
      const projectChapters = byProject.get(project.id) || [];
      const words = projectChapters.reduce((sum, c) => sum + (Number(c.word_count) || 0), 0);
      const completion = evaluateCompletion(projectChapters);
      const status = resolveBookStatus(project.status, completion);

      totalWords += words;
      if (status === "Terminé") finishedBooks += 1;
      else if (words > 0) inProgressBooks += 1;

      projectStats[project.id] = {
        title: project.title,
        words,
        chaptersCount: projectChapters.length,
        pages: calculatePages(words),
        readingTime: estimateReadingTime(words),
        percent: completion.percent,
        written: completion.written,
        total: completion.total,
        status,
        coins: 0,
        updatedAt: project.updated_at,
      };
    }

    // Pièces réellement dépensées, attribuées par projet via metadata.project_id.
    // Les actions sans projet ne sont comptées que dans le total.
    let totalCoins = 0;
    try {
      const { data: wallets } = await supabase.from("wallets").select("id");
      const walletIds = (wallets || []).map((w) => w.id);
      if (walletIds.length > 0) {
        const { data: debits } = await supabase
          .from("coin_transactions")
          .select("amount, metadata")
          .eq("type", "debit")
          .in("wallet_id", walletIds)
          // Borne de sécurité : un compte très actif ne doit pas faire
          // exploser la réponse ni la mémoire du serveur.
          .order("created_at", { ascending: false })
          .limit(5000);

        for (const debit of debits || []) {
          const amount = Number(debit.amount) || 0;
          totalCoins += amount;
          const pid = (debit.metadata as { project_id?: string } | null)?.project_id;
          if (pid && projectStats[pid]) {
            projectStats[pid].coins += amount;
          }
        }
      }
    } catch (coinErr) {
      console.warn("Analytics coins non disponibles:", coinErr);
    }

    const booksTotal = (projects || []).length;

    return NextResponse.json({
      global: {
        totalWords,
        totalPages: calculatePages(totalWords),
        totalCoins,
        booksTotal,
        finishedBooks,
        inProgressBooks,
        // Un auteur veut surtout savoir « combien j'ai écrit » : la durée de
        // lecture cumulée parle plus qu'un nombre de mots brut.
        totalReadingTime: estimateReadingTime(totalWords),
        averageWordsPerBook: booksTotal > 0 ? Math.round(totalWords / booksTotal) : 0,
      },
      projectStats,
    });
  } catch (error: unknown) {
    console.error("GET /api/analytics error:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
