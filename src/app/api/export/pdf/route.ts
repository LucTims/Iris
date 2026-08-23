import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { htmlToPdfmakeContent } from "@/lib/export/htmlToPdfmake";

export const runtime = "nodejs";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChapterData {
  title: string;
  content: string;
  number: number;
}

/**
 * Load pdfmake's Node printer with its bundled Roboto fonts (as Buffers, so no
 * separate .ttf files need to ship in the serverless bundle).
 */
async function getPrinter(): Promise<any> {
  const pdfmakeMod: any = await import("pdfmake");
  const PdfPrinter = pdfmakeMod.default || pdfmakeMod;

  const vfsMod: any = await import("pdfmake/build/vfs_fonts");
  const vfs =
    vfsMod?.pdfMake?.vfs || vfsMod?.default?.pdfMake?.vfs || vfsMod?.vfs || vfsMod?.default || vfsMod;

  const fonts = {
    Roboto: {
      normal: Buffer.from(vfs["Roboto-Regular.ttf"], "base64"),
      bold: Buffer.from(vfs["Roboto-Medium.ttf"], "base64"),
      italics: Buffer.from(vfs["Roboto-Italic.ttf"], "base64"),
      bolditalics: Buffer.from(vfs["Roboto-MediumItalic.ttf"], "base64"),
    },
  };

  return new PdfPrinter(fonts);
}

/**
 * Fetch external (http/https) images and inline them as base64 data URLs so
 * pdfmake can embed them. Only PNG/JPEG are supported by pdfmake; anything else
 * (or a failed/oversized fetch) is left as-is and simply skipped at render.
 */
async function embedExternalImages(html: string): Promise<string> {
  if (!html) return html;
  const urls = Array.from(
    html.matchAll(/<img[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/gi),
    (m) => m[1]
  );
  const unique = Array.from(new Set(urls));

  for (const url of unique) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!/image\/(png|jpe?g)/i.test(ct)) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 5_000_000) continue; // 5 MB safety cap
      const dataUrl = `data:${ct};base64,${buf.toString("base64")}`;
      html = html.split(url).join(dataUrl);
    } catch {
      // ignore individual image failures
    }
  }
  return html;
}

function buildDocDefinition(
  title: string,
  subtitle: string | undefined,
  chapters: ChapterData[]
): any {
  const content: any[] = [];

  // Title page
  content.push({ text: (title || "Sans titre").toUpperCase(), style: "coverTitle", margin: [0, 220, 0, 10] });
  if (subtitle) content.push({ text: subtitle, style: "coverSubtitle" });
  content.push({ text: "───────────────", alignment: "center", color: "#cccccc", margin: [0, 20, 0, 60] });
  content.push({ text: "Généré avec Iris", style: "branding", pageBreak: "after" });

  // Table of contents
  content.push({ text: "Table des Matières", style: "tocTitle", margin: [0, 40, 0, 20] });
  chapters.forEach((ch, idx) => {
    content.push({ text: ch.title || `Chapitre ${ch.number || idx + 1}`, style: "tocItem" });
  });

  // Chapters
  chapters.forEach((ch, idx) => {
    content.push({
      text: ch.title || `Chapitre ${ch.number || idx + 1}`,
      style: "chapterTitle",
      pageBreak: "before",
      margin: [0, 30, 0, 10],
    });
    content.push({ text: "───────────────", alignment: "center", color: "#dddddd", margin: [0, 0, 0, 20] });
    content.push(...htmlToPdfmakeContent(ch.content));
  });

  return {
    pageSize: "A4",
    pageMargins: [70, 70, 70, 70],
    info: { title, subject: `Livre généré avec Iris - ${title}` },
    content,
    footer: (currentPage: number, pageCount: number) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: "center",
      fontSize: 9,
      color: "#999999",
      margin: [0, 10, 0, 0],
    }),
    styles: {
      coverTitle: { fontSize: 26, bold: true, alignment: "center", color: "#222222" },
      coverSubtitle: { fontSize: 14, italics: true, alignment: "center", color: "#666666", margin: [0, 6, 0, 0] },
      branding: { fontSize: 10, italics: true, alignment: "center", color: "#999999" },
      tocTitle: { fontSize: 18, bold: true, alignment: "center", color: "#222222" },
      tocItem: { fontSize: 12, color: "#444444", margin: [0, 4, 0, 4] },
      chapterTitle: { fontSize: 20, bold: true, alignment: "center", color: "#222222" },
      h1: { fontSize: 16, bold: true, color: "#222222", margin: [0, 14, 0, 8] },
      h2: { fontSize: 14, bold: true, color: "#333333", margin: [0, 12, 0, 6] },
      h3: { fontSize: 13, bold: true, color: "#333333", margin: [0, 10, 0, 4] },
      paragraph: { fontSize: 11, alignment: "justify", margin: [0, 0, 0, 8] },
      blockquote: { fontSize: 11, italics: true, color: "#555555" },
    },
    defaultStyle: { font: "Roboto", fontSize: 11, lineHeight: 1.35 },
  };
}

function streamToBuffer(pdfDoc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on("data", (c: Buffer) => chunks.push(c));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const { title, subtitle, chapters } = await req.json();
    if (!Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: "Aucun chapitre à exporter." }, { status: 400 });
    }

    // Inline external images so pdfmake can embed them
    const preparedChapters: ChapterData[] = [];
    for (const ch of chapters) {
      preparedChapters.push({
        title: ch.title,
        number: ch.number,
        content: await embedExternalImages(ch.content || ""),
      });
    }

    const printer = await getPrinter();
    const docDefinition = buildDocDefinition(title || "Mon Livre Iris", subtitle, preparedChapters);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const buffer = await streamToBuffer(pdfDoc);

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
