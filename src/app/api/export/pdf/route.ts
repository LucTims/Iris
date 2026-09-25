import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderBookPdf, type ChapterData } from "@/lib/export/pdfBook";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const { title, subtitle, category, chapters, coverUrl, format, workType } = await req.json();
    if (!Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: "Aucun chapitre à exporter." }, { status: 400 });
    }

    const buffer = await renderBookPdf({
      title,
      subtitle,
      category,
      chapters: chapters.map((ch: ChapterData) => ({ title: ch.title, number: ch.number, content: ch.content || "" })),
      coverUrl,
      format: format === "print" ? "print" : "digital",
      workType,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="livre.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF (pdfmake):", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Erreur PDF : ${detail}` }, { status: 500 });
  }
}
