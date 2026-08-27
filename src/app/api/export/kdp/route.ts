import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import {
  htmlToPdfmakeContent,
  extractLeadingHeading,
  isSummaryChapter,
  SUPPORTED_PDF_FONTS,
} from "@/lib/export/htmlToPdfmake";
import {
  getTrim,
  trimToPoints,
  gutterInches,
  estimatePages,
  OUTER_MARGIN_IN,
  PT_PER_INCH,
} from "@/lib/export/kdp";

export const runtime = "nodejs";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChapterData {
  title: string;
  content: string;
  number: number;
}

/**
 * Charge le printer pdfmake (Node) avec Roboto embarqué + les polices TTF
 * disponibles sur disque. Dupliqué volontairement du moteur d'export standard
 * pour ne pas modifier ce dernier (qui fonctionne).
 */
async function getPrinter(): Promise<any> {
  const pdfmakeMod: any = await import("pdfmake");
  const PdfPrinter = pdfmakeMod.default || pdfmakeMod;

  const vfsMod: any = await import("pdfmake/build/vfs_fonts");
  const vfs =
    vfsMod?.pdfMake?.vfs || vfsMod?.default?.pdfMake?.vfs || vfsMod?.vfs || vfsMod?.default || vfsMod;

  const fonts: any = {
    Roboto: {
      normal: Buffer.from(vfs["Roboto-Regular.ttf"], "base64"),
      bold: Buffer.from(vfs["Roboto-Medium.ttf"], "base64"),
      italics: Buffer.from(vfs["Roboto-Italic.ttf"], "base64"),
      bolditalics: Buffer.from(vfs["Roboto-MediumItalic.ttf"], "base64"),
    },
  };

  const fontsDir = path.join(process.cwd(), "src", "lib", "export", "fonts");
  const families = ["Merriweather", "Lora", "Montserrat", "PlayfairDisplay"];
  for (const fam of families) {
    try {
      fonts[fam] = {
        normal: fs.readFileSync(path.join(fontsDir, `${fam}-normal.ttf`)),
        bold: fs.readFileSync(path.join(fontsDir, `${fam}-bold.ttf`)),
        italics: fs.readFileSync(path.join(fontsDir, `${fam}-italics.ttf`)),
        bolditalics: fs.readFileSync(path.join(fontsDir, `${fam}-bolditalics.ttf`)),
      };
    } catch (e) {
      console.warn(`Police PDF ${fam} introuvable, fallback Roboto.`, e);
    }
  }

  return new PdfPrinter(fonts);
}

async function embedExternalImages(html: string): Promise<string> {
  if (!html) return html;
  const urls = Array.from(
    html.matchAll(/<img[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/gi),
    (m) => m[1]
  );
  for (const url of Array.from(new Set(urls))) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!/image\/(png|jpe?g)/i.test(ct)) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 5_000_000) continue;
      html = html.split(url).join(`data:${ct};base64,${buf.toString("base64")}`);
    } catch {
      /* image ignorée */
    }
  }
  return html;
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

function countWords(chapters: ChapterData[]): number {
  return chapters.reduce((sum, ch) => {
    const plain = (ch.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return sum + (plain ? plain.split(" ").length : 0);
  }, 0);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      subtitle,
      author,
      chapters,
      trim: trimId = "6x9",
      fontFamily = "merriweather",
      fontSize = 11,
      lineHeight = 1.4,
      includeTitlePage = true,
      includeCopyright = true,
      copyrightYear = String(new Date().getFullYear()),
      includeToc = true,
      pageNumbers = true,
    } = body || {};

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: "Aucun chapitre à exporter." }, { status: 400 });
    }

    // Prépare les chapitres (images externes en base64 pour pdfmake).
    const prepared: ChapterData[] = [];
    for (const ch of chapters) {
      prepared.push({ title: ch.title, number: ch.number, content: await embedExternalImages(ch.content || "") });
    }

    // Géométrie de page KDP : taille de coupe + marges (gouttière calée sur le
    // nombre de pages estimé pour respecter les minimums de reliure KDP).
    const trim = getTrim(trimId);
    const { width, height } = trimToPoints(trim);
    const pages = estimatePages(countWords(prepared), trim);
    const gutterPt = gutterInches(pages) * PT_PER_INCH;
    const outerPt = OUTER_MARGIN_IN * PT_PER_INCH;
    // pdfmake n'applique pas de marges miroir : on met la gouttière des DEUX
    // côtés (left=right) pour garantir que le texte ne tombe jamais dans la
    // reliure, quel que soit le côté de la page.
    const pageMargins: [number, number, number, number] = [gutterPt, outerPt, gutterPt, outerPt + 16];

    const bodyFont = SUPPORTED_PDF_FONTS[String(fontFamily).toLowerCase()] || "Merriweather";
    const size = Math.max(9, Math.min(14, Number(fontSize) || 11));

    const content: any[] = [];

    // ---- Pages liminaires (front matter) ----
    if (includeTitlePage) {
      content.push({ text: (title || "Sans titre").toUpperCase(), style: "coverTitle", margin: [0, height / 3.2, 0, 12] });
      if (subtitle) content.push({ text: subtitle, style: "coverSubtitle" });
      if (author) content.push({ text: author, style: "coverAuthor", margin: [0, 40, 0, 0] });
      content.push({ text: "", pageBreak: "after" });
    }

    if (includeCopyright) {
      const holder = author ? `© ${copyrightYear} ${author}` : `© ${copyrightYear}`;
      content.push({ text: "", margin: [0, height / 2.5, 0, 0] });
      content.push({ text: holder, style: "copyright" });
      content.push({ text: "Tous droits réservés.", style: "copyright" });
      content.push({
        text: "Aucune partie de ce livre ne peut être reproduite sans l'autorisation écrite de l'auteur.",
        style: "copyrightSmall",
        margin: [0, 8, 0, 0],
      });
      content.push({ text: "", pageBreak: "after" });
    }

    // ---- Table des matières ----
    const hasSummary = prepared.some((ch) => isSummaryChapter(ch.title, ch.content));
    if (includeToc && !hasSummary) {
      content.push({ text: "Table des matières", style: "tocTitle", margin: [0, 20, 0, 20] });
      prepared.forEach((ch, idx) => {
        const { title: lead } = extractLeadingHeading(ch.content);
        content.push({ text: lead || ch.title || `Chapitre ${ch.number || idx + 1}`, style: "tocItem" });
      });
      content.push({ text: "", pageBreak: "after" });
    }

    // ---- Chapitres (chacun démarre sur une nouvelle page) ----
    prepared.forEach((ch, idx) => {
      const { title: leadTitle, rest } = extractLeadingHeading(ch.content);
      const effectiveTitle = leadTitle || ch.title || `Chapitre ${ch.number || idx + 1}`;
      // Le premier chapitre suit déjà un pageBreak:"after" du front matter/TOC ;
      // s'il n'y a AUCUN front matter ni TOC, il ne faut pas de saut avant lui.
      const somethingBefore = includeTitlePage || includeCopyright || (includeToc && !hasSummary) || idx > 0;
      content.push({
        text: effectiveTitle,
        style: "chapterTitle",
        ...(idx === 0 && somethingBefore ? {} : idx > 0 ? { pageBreak: "before" } : {}),
        margin: [0, 40, 0, 18],
      });
      content.push(...htmlToPdfmakeContent(rest));
    });

    // Numéro de page centré en pied (on saute la page 1 = titre).
    const footer = pageNumbers
      ? (currentPage: number) =>
          currentPage <= (includeTitlePage ? 1 : 0)
            ? null
            : { text: String(currentPage), alignment: "center", fontSize: 9, color: "#777777", margin: [0, 8, 0, 0] }
      : undefined;

    const docDefinition: any = {
      pageSize: { width, height },
      pageMargins,
      info: { title: title || "Livre", author: author || undefined },
      content,
      ...(footer ? { footer } : {}),
      styles: {
        coverTitle: { fontSize: 26, bold: true, alignment: "center", color: "#111111" },
        coverSubtitle: { fontSize: 14, italics: true, alignment: "center", color: "#555555", margin: [0, 8, 0, 0] },
        coverAuthor: { fontSize: 13, alignment: "center", color: "#333333" },
        copyright: { fontSize: 10, alignment: "center", color: "#444444", margin: [0, 2, 0, 2] },
        copyrightSmall: { fontSize: 9, alignment: "center", color: "#777777" },
        tocTitle: { fontSize: 18, bold: true, alignment: "center", color: "#111111" },
        tocItem: { fontSize: 12, color: "#333333", margin: [0, 5, 0, 5] },
        chapterTitle: { fontSize: 20, bold: true, alignment: "center", color: "#111111" },
        h1: { fontSize: size + 5, bold: true, color: "#111111", margin: [0, 14, 0, 8] },
        h2: { fontSize: size + 3, bold: true, color: "#222222", margin: [0, 12, 0, 6] },
        h3: { fontSize: size + 1, bold: true, color: "#222222", margin: [0, 10, 0, 4] },
        paragraph: { fontSize: size, alignment: "justify", margin: [0, 0, 0, 8] },
        blockquote: { fontSize: size, italics: true, color: "#555555" },
      },
      defaultStyle: { font: bodyFont, fontSize: size, lineHeight: Math.max(1.1, Math.min(2, Number(lineHeight) || 1.4)) },
    };

    const printer = await getPrinter();
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const buffer = await streamToBuffer(pdfDoc);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="livre-kdp.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF KDP:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Erreur PDF KDP : ${detail}` }, { status: 500 });
  }
}
