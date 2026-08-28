import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import {
  htmlToPdfmakeContent,
  extractLeadingHeading,
  isSummaryChapter,
} from "@/lib/export/htmlToPdfmake";
import { bookFontPairing } from "@/lib/ai/book-style";
import { PDF_FONT_KEYS } from "@/lib/export/fontRegistry";

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

  const fonts: any = {
    Roboto: {
      normal: Buffer.from(vfs["Roboto-Regular.ttf"], "base64"),
      bold: Buffer.from(vfs["Roboto-Medium.ttf"], "base64"),
      italics: Buffer.from(vfs["Roboto-Italic.ttf"], "base64"),
      bolditalics: Buffer.from(vfs["Roboto-MediumItalic.ttf"], "base64"),
    },
  };

  // Toute la bibliothèque de polices, embarquée en TTF (src/lib/export/fonts) et
  // pilotée par le registre unique (fontRegistry). Chaque famille du sélecteur
  // de l'éditeur est ainsi réellement rendue à l'export ; si un fichier manque,
  // on saute la famille (pdfmake retombe sur Roboto) sans casser l'export.
  const fontsDir = path.join(process.cwd(), "src", "lib", "export", "fonts");
  for (const fam of PDF_FONT_KEYS) {
    if (fonts[fam]) continue; // Roboto déjà chargé via vfs
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

/**
 * Récupère l'image de couverture et la renvoie en data URL base64 (que pdfmake
 * sait embarquer). Accepte déjà un data: URL (renvoyé tel quel) ou une URL http
 * (téléchargée puis inlinée). Renvoie null en cas d'échec — la couverture est
 * alors simplement omise, jamais bloquante.
 */
async function inlineCover(url: string | undefined | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:image/")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    let ct = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8_000_000) return null;
    if (!/image\/(png|jpe?g)/i.test(ct)) {
      // Certaines URL ne renvoient pas de content-type fiable : on suppose JPEG.
      ct = "image/jpeg";
    }
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildDocDefinition(
  title: string,
  subtitle: string | undefined,
  chapters: ChapterData[],
  coverImage: string | null,
  category: string | undefined,
  format: "digital" | "print" = "digital"
): any {
  // Palette typographique riche, choisie selon le STYLE du livre (roman,
  // jeunesse, thriller, business, académique…) — pas seulement fiction/non-fiction.
  const { body: bodyFont, display: displayFont } = bookFontPairing(category);
  // Dimensions de page selon le format (impression 6×9" ou A4 numérique).
  const pageW = format === "print" ? 432 : 595;
  const pageH = format === "print" ? 648 : 842;
  const content: any[] = [];

  // Page de couverture pleine page. L'image est posée en absolu pour occuper
  // toute la page (sans marges), aux dimensions du format choisi, puis saut.
  if (coverImage) {
    content.push({
      image: coverImage,
      width: pageW,
      height: pageH,
      absolutePosition: { x: 0, y: 0 },
      pageBreak: "after",
    });
  }

  // Page de titre intérieure
  content.push({ text: (title || "Sans titre").toUpperCase(), style: "coverTitle", margin: [0, 200, 0, 10] });
  if (subtitle) content.push({ text: subtitle, style: "coverSubtitle" });
  content.push({ text: "❦", alignment: "center", color: "#b08d57", fontSize: 18, margin: [0, 30, 0, 0], pageBreak: "after" });

  // Page de copyright (mentions légales minimales d'un vrai livre).
  const year = new Date().getFullYear();
  content.push({ text: title || "Sans titre", style: "copyrightTitle", margin: [0, 320, 0, 0] });
  content.push({
    text: `© ${year}. Tous droits réservés.\n\nAucune partie de cet ouvrage ne peut être reproduite ou transmise sous quelque forme que ce soit sans l'autorisation écrite de l'auteur.`,
    style: "copyright",
    margin: [0, 12, 0, 0],
  });
  content.push({ text: "Composé avec Iris", style: "copyright", italics: true, margin: [0, 24, 0, 0], pageBreak: "after" });

  // Détecte si l'auteur a demandé un sommaire : en mode « avec sommaire »,
  // generate-plan crée un chapitre « Sommaire » / « Table des matières ». Sa
  // présence = l'utilisateur veut une table des matières. En mode « sans
  // sommaire », il n'y en a pas → on n'ajoute AUCUNE table des matières
  // (avant, une TOC apparaissait à tort même quand l'auteur l'avait désactivée).
  const hasSummary = chapters.some((ch) => isSummaryChapter(ch.title, ch.content));

  // Corps du livre : on écarte (a) le chapitre-sommaire lui-même (remplacé par
  // une vraie TOC paginée), et (b) les chapitres « fantômes » sans contenu réel
  // — des placeholders titre-seul hérités du plan qui produisaient des
  // pages-titres en double avant chaque chapitre.
  const realChapters = chapters.filter((ch) => {
    if (isSummaryChapter(ch.title, ch.content)) return false;
    const { rest } = extractLeadingHeading(ch.content || "");
    const bodyText = (rest || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return bodyText.length >= 20;
  });

  // Table des matières native (numéros de page résolus par pdfmake en 2 passes)
  // UNIQUEMENT en mode « avec sommaire ». Pas de pageBreak:"after" : le premier
  // chapitre force déjà son propre saut de page.
  if (hasSummary) {
    content.push({
      toc: {
        title: { text: "Table des matières", style: "tocTitle", margin: [0, 40, 0, 24] },
      },
    });
  }

  // Chapitres. Chaque chapitre commence sur une nouvelle page. Quand le corps
  // commence déjà par son propre <h1>, on en extrait le titre (et on supprime
  // le doublon + son saut de page redondant) pour n'avoir qu'un seul titre.
  realChapters.forEach((ch, idx) => {
    const { title: leadTitle, rest } = extractLeadingHeading(ch.content);
    const effectiveTitle = leadTitle || ch.title || `Chapitre ${ch.number || idx + 1}`;
    content.push({
      text: effectiveTitle,
      style: "chapterTitle",
      tocItem: true,
      tocStyle: { fontSize: 12, font: bodyFont, color: "#333333" },
      tocMargin: [0, 6, 0, 0],
      pageBreak: "before",
      margin: [0, 60, 0, 6],
    });
    content.push({ text: "❦", alignment: "center", color: "#b08d57", fontSize: 14, margin: [0, 0, 0, 24] });
    content.push(...htmlToPdfmakeContent(rest));
  });

  // Page de FIN — clôt le livre comme un ouvrage édité.
  content.push({ text: "Fin", style: "endMark", pageBreak: "before", margin: [0, 260, 0, 0] });
  content.push({ text: "❦", alignment: "center", color: "#b08d57", fontSize: 16, margin: [0, 18, 0, 0] });

  // Nombre de pages liminaires (front matter) à NE PAS numéroter ni coiffer
  // d'un en-tête courant : couverture (si image) + titre + copyright + TOC.
  const frontMatterCount = (coverImage ? 1 : 0) + 2 + (hasSummary ? 1 : 0);
  const runningTitle = (title || "").toUpperCase();

  // Format d'impression : "print" = trim 6×9 pouces (432×648 pt) avec des
  // marges compatibles KDP (gouttière intérieure généreuse) ; "digital" = A4.
  const isPrint = format === "print";
  const pageSize = isPrint ? { width: 432, height: 648 } : "A4";
  const pageMargins: [number, number, number, number] = isPrint
    ? [58, 64, 54, 64] // [intérieur/gouttière, haut, extérieur, bas] ~0.75"/0.9"/0.75"/0.9"
    : [72, 80, 72, 80];

  return {
    pageSize,
    pageMargins,
    info: { title, subject: `Livre composé avec Iris - ${title}` },
    content,
    // En-tête courant : titre du livre en petites capitales grises, sur les
    // pages de contenu uniquement (ni sur le front matter, ni sur la page de fin).
    header: (currentPage: number, pageCount: number) => {
      if (currentPage <= frontMatterCount || currentPage >= pageCount) return null;
      return {
        text: runningTitle,
        alignment: "center",
        font: displayFont,
        fontSize: 8,
        characterSpacing: 2,
        color: "#b0b0b0",
        margin: [0, 34, 0, 0],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      // Pas de numéro sur le front matter ni la page de fin.
      if (currentPage <= frontMatterCount || currentPage >= pageCount) return null;
      // En impression : numéro à l'extérieur (gauche sur page paire, droite sur
      // page impaire) ; en numérique : centré.
      const alignment = isPrint ? (currentPage % 2 === 0 ? "left" : "right") : "center";
      const margin: [number, number, number, number] = isPrint
        ? [54, 16, 54, 0]
        : [0, 16, 0, 0];
      return {
        text: `${currentPage}`,
        alignment,
        font: bodyFont,
        fontSize: 10,
        color: "#999999",
        margin,
      };
    },
    styles: {
      coverTitle: { font: displayFont, fontSize: 30, bold: true, alignment: "center", color: "#1a1a1a", characterSpacing: 1 },
      coverSubtitle: { font: displayFont, fontSize: 15, italics: true, alignment: "center", color: "#666666", margin: [0, 10, 0, 0] },
      copyrightTitle: { font: displayFont, fontSize: 14, alignment: "center", color: "#333333" },
      copyright: { font: bodyFont, fontSize: 9, alignment: "center", color: "#888888", lineHeight: 1.4 },
      tocTitle: { font: displayFont, fontSize: 22, bold: true, alignment: "center", color: "#1a1a1a" },
      chapterTitle: { font: displayFont, fontSize: 24, bold: true, alignment: "center", color: "#1a1a1a" },
      h1: { font: displayFont, fontSize: 17, bold: true, color: "#1a1a1a", margin: [0, 16, 0, 8] },
      h2: { font: displayFont, fontSize: 14, bold: true, color: "#333333", margin: [0, 14, 0, 6] },
      h3: { font: displayFont, fontSize: 12.5, bold: true, color: "#333333", margin: [0, 10, 0, 4] },
      paragraph: { fontSize: 11.5, alignment: "justify", margin: [0, 0, 0, 9] },
      blockquote: { fontSize: 11.5, italics: true, color: "#555555" },
      endMark: { font: displayFont, fontSize: 20, italics: true, alignment: "center", color: "#1a1a1a" },
    },
    // LA correction clé : police par défaut = serif de livre, plus Roboto.
    defaultStyle: { font: bodyFont, fontSize: 11.5, lineHeight: 1.45 },
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

    const { title, subtitle, category, chapters, coverUrl, format } = await req.json();
    const exportFormat: "digital" | "print" = format === "print" ? "print" : "digital";
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

    const coverImage = await inlineCover(coverUrl);

    const printer = await getPrinter();
    const docDefinition = buildDocDefinition(title || "Mon Livre Iris", subtitle, preparedChapters, coverImage, category, exportFormat);
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
