import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderBookPdfWithLayout, type ChapterData } from "@/lib/export/pdfBook";
import { sanitizeExportStyle } from "@/lib/export/exportStyle";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    // La composition PDF est coûteuse en CPU (jusqu'à 60 s par appel).
    const rate = await checkRateLimit(`pdf_export_${user.id}`, 10, 10 * 60 * 1000);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Trop d'exports en peu de temps. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const { title, subtitle, author, category, chapters, coverUrl, format, workType, style, preview } = await req.json();
    if (!Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: "Aucun chapitre à exporter." }, { status: 400 });
    }

    const { buffer, layout } = await renderBookPdfWithLayout({
      title,
      subtitle,
      author: typeof author === "string" ? author : undefined,
      category,
      chapters: chapters.map((ch: ChapterData) => ({ title: ch.title, number: ch.number, content: ch.content || "" })),
      coverUrl,
      format: format === "print" ? "print" : "digital",
      workType,
      style: sanitizeExportStyle(style),
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // Aperçu : affiché dans la fenêtre d'export avant le téléchargement.
        "Content-Disposition": preview ? 'inline; filename="apercu.pdf"' : 'attachment; filename="livre.pdf"',
        "X-Iris-Page-Count": String(layout.pageCount),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF (pdfmake):", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Erreur PDF : ${detail}` }, { status: 500 });
  }
}
