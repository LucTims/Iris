import fs from "fs";
import path from "path";
import {
  htmlToPdfmakeContent,
  extractLeadingHeading,
} from "@/lib/export/htmlToPdfmake";
import { bookFontPairing, detectGenre } from "@/lib/ai/book-style";
import { resolveWorkType, workTypeLayout } from "@/lib/book/work-type";
import { PDF_FONT_KEYS } from "@/lib/export/fontRegistry";
import { pageFormatDef, tocKey, type ExportStyle, type PageFormatKey } from "@/lib/export/exportStyle";
import { copyrightNotice, printableChapters, resolveIncludeToc, splitChapterHeading, tocHeading } from "@/lib/export/bookStructure";

export { splitChapterHeading };

/**
 * Moteur d'export PDF (pdfmake), commun à la route /api/export/pdf (export
 * depuis l'application) et à l'outil MCP `export_pdf`. Le MCP appelait
 * auparavant la route en HTTP, sans session utilisateur : il recevait un 401
 * et aucun export n'aboutissait jamais.
 *
 * Serveur uniquement (Node) : lit les polices TTF sur disque. Toute route qui
 * l'importe doit figurer dans `outputFileTracingIncludes` (next.config.ts).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ChapterData {
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

function plainTextOf(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(plainTextOf).join("");
  if (typeof node.text !== "undefined") return plainTextOf(node.text);
  return "";
}

interface TocEntry {
  id: string;
  label: string | null;
  title: string;
  sections: { id: string; title: string }[];
}

export interface BookLayoutSummary {
  pageCount: number;
  pageFormat: PageFormatKey;
  hasToc: boolean;
  /** Première page numérotée (après couverture, titre, mentions, sommaire). */
  firstBodyPage: number | null;
  chapters: {
    title: string;
    startPage: number | null;
    endPage: number | null;
    sections: { title: string; page: number | null }[];
  }[];
}

interface BuildOptions {
  title: string;
  subtitle?: string;
  author?: string;
  chapters: ChapterData[];
  coverImage: string | null;
  category?: string;
  format: "digital" | "print";
  workType?: string | null;
  style: ExportStyle;
  /** Page du premier chapitre, connue après une première mise en page. */
  firstBodyPage?: number;
}

interface BuiltDoc {
  docDefinition: any;
  chapterNodes: { title: string; node: any; sections: { title: string; node: any }[] }[];
  hasToc: boolean;
  pageFormat: PageFormatKey;
  firstBodyPage: number;
}

function buildDocDefinition(opts: BuildOptions): BuiltDoc {
  const { title, subtitle, author, chapters, coverImage, category, format, workType: workTypeInput, style } = opts;
  // MISE EN PAGE PAR FORME D'OUVRAGE. Un livre s'habille comme un livre
  // (titre centré haut de page, fleuron, texte justifié, page de fin) ; un
  // guide se compose comme un manuel ; un ebook reste compact.
  const genre = detectGenre(category);
  const workType = resolveWorkType({ explicit: workTypeInput, category, title });
  const layout = workTypeLayout(workType, genre);
  // Police : choix de l'auteur à l'export, sinon palette selon le style du livre.
  const pairing = bookFontPairing(category);
  const bodyFont = style.bodyFont || pairing.body;
  const displayFont = style.headingFont || pairing.display;
  const accent = style.accentColor || "#b08d57";

  // Format de page : choix explicite, sinon « impression » = 6×9 po, « numérique » = A4.
  const pageFormat: PageFormatKey = style.pageFormat || (format === "print" ? "6x9" : "a4");
  const page = pageFormatDef(pageFormat);
  const pageW = page.width;
  const pageH = page.height;
  const isTrim = page.trim;
  const compact = pageW <= 420;
  const bodySize = compact ? 10.5 : 11.5;
  const content: any[] = [];

  if (coverImage) {
    content.push({
      image: coverImage,
      width: pageW,
      height: pageH,
      absolutePosition: { x: 0, y: 0 },
      pageBreak: "after",
    });
  }

  // Page de titre intérieure : titre, sous-titre, auteur.
  content.push({ text: (title || "Sans titre").toUpperCase(), style: "coverTitle", margin: [0, Math.round(pageH * 0.24), 0, 10] });
  if (subtitle) content.push({ text: subtitle, style: "coverSubtitle" });
  if (layout.ornaments) {
    content.push({ text: "❦", alignment: "center", color: accent, fontSize: 18, margin: [0, 30, 0, 0] });
  }
  if (author) {
    content.push({ text: author, style: "coverAuthor", margin: [0, layout.ornaments ? 40 : 60, 0, 0] });
  }
  content.push({ text: "", pageBreak: "after" });

  const year = new Date().getFullYear();
  if (layout.copyrightPage) {
    content.push({ text: title || "Sans titre", style: "copyrightTitle", margin: [0, Math.round(pageH * 0.45), 0, 0] });
    content.push({
      text: copyrightNotice(author, year),
      style: "copyright",
      margin: [0, 12, 0, 0],
      pageBreak: "after",
    });
  }


  // Corps du livre : sans le chapitre-sommaire (plan de travail remplacé par
  // le sommaire paginé) ni les chapitres encore vides.
  const realChapters = printableChapters(chapters, workType);

  // Sommaire : choix de l'auteur (enregistré avec le livre), oui par défaut.
  const hasToc = realChapters.length > 0 && resolveIncludeToc(style, workType, chapters);

  // Chapitres composés d'abord : le sommaire a besoin de leurs intertitres.
  const tocEntries: TocEntry[] = [];
  const chapterNodes: BuiltDoc["chapterNodes"] = [];
  const body: any[] = [];
  realChapters.forEach((ch, idx) => {
    const { title: leadTitle, rest } = extractLeadingHeading(ch.content);
    const effectiveTitle = leadTitle || ch.title || `Chapitre ${ch.number || idx + 1}`;
    const { label, title: shortTitle } = splitChapterHeading(effectiveTitle);
    const id = `iris-ch-${idx}`;
    const breakBefore = idx === 0 && !hasToc ? undefined : "before";

    // L'ancre (id) doit être portée par un nœud texte : pdfmake ignore les
    // id des conteneurs pour les renvois de page.
    const titleNode: any = { text: shortTitle, style: "chapterTitle", id };
    if (label) {
      body.push({
        stack: [{ text: label.toUpperCase(), style: "chapterLabel" }, titleNode],
        pageBreak: breakBefore,
        margin: [0, layout.chapterTitleTopMargin, 0, 6],
      });
    } else {
      titleNode.pageBreak = breakBefore;
      titleNode.margin = [0, layout.chapterTitleTopMargin, 0, 6];
      body.push(titleNode);
    }
    if (layout.ornaments) {
      body.push({ text: "❦", alignment: "center", color: accent, fontSize: 14, margin: [0, 0, 0, 24] });
    } else {
      const lineX = layout.chapterTitleAlignment === "center" ? (pageW - 120) / 2 - 72 : 0;
      body.push({
        canvas: [{ type: "line", x1: Math.max(0, lineX), y1: 0, x2: Math.max(0, lineX) + 120, y2: 0, lineWidth: 2, lineColor: accent }],
        margin: [0, 6, 0, 20],
      });
    }

    const nodes = htmlToPdfmakeContent(rest, { onePageEach: workType === "storybook" });
    const sections: TocEntry["sections"] = [];
    const sectionNodes: { title: string; node: any }[] = [];
    nodes.forEach((n: any, k: number) => {
      if (n && n.style === "h2") {
        const t = plainTextOf(n.text).replace(/\s+/g, " ").trim();
        if (!t) return;
        n.id = `${id}-s${k}`;
        sections.push({ id: n.id, title: t });
        sectionNodes.push({ title: t, node: n });
      }
    });
    body.push(...nodes);
    tocEntries.push({ id, label, title: shortTitle, sections });
    chapterNodes.push({ title: effectiveTitle, node: titleNode, sections: sectionNodes });
  });

  if (hasToc) {
    // Sommaire de livre édité : étiquette « CHAPITRE N » en petites capitales,
    // titre en gras, intertitres en retrait, numéros de page alignés à droite.
    const tocTitle = tocHeading(chapters);
    content.push({ text: tocTitle, style: "tocTitle", margin: [0, 30, 0, 26] });
    const maxSections = tocEntries.length > 14 ? 0 : 8;
    // Corrections de l'auteur (titre, étiquette, numéro de page) : un champ
    // corrigé remplace la valeur calculée, les autres restent automatiques.
    const overrides = style.tocOverrides || {};
    const pageCell = (id: string, page: number | undefined) => (page ? `${page}` : [{ pageReference: id }]);
    tocEntries.forEach((e, ci) => {
      const o = overrides[tocKey(ci)] || {};
      const label = o.label !== undefined ? o.label || null : e.label;
      const rows: any[] = [];
      if (label) rows.push({ text: label.toUpperCase(), style: "tocLabel" });
      rows.push({
        columns: [
          { width: "*", text: o.title || e.title, style: "tocItem", linkToDestination: e.id },
          { width: 44, text: pageCell(e.id, o.page), style: "tocItem", alignment: "right" },
        ],
        columnGap: 8,
      });
      e.sections.slice(0, maxSections).forEach((s, si) => {
        const so = overrides[tocKey(ci, si)] || {};
        rows.push({
          columns: [
            { width: "*", text: so.title || s.title, style: "tocSection", linkToDestination: s.id },
            { width: 44, text: pageCell(s.id, so.page), style: "tocSection", alignment: "right" },
          ],
          columnGap: 8,
          margin: [16, 2, 0, 0],
        });
      });
      content.push({ stack: rows, margin: [0, 0, 0, 12], unbreakable: e.sections.length <= 8 });
    });
  }

  content.push(...body);

  if (layout.endPage) {
    content.push({ text: "Fin", style: "endMark", pageBreak: "before", margin: [0, Math.round(pageH * 0.3), 0, 0] });
    content.push({ text: "❦", alignment: "center", color: accent, fontSize: 16, margin: [0, 18, 0, 0] });
  }

  // Pages liminaires sans numéro ni titre courant. Estimation au premier
  // passage ; la vraie valeur (sommaire sur plusieurs pages) est fournie au second.
  const estimatedFront = (coverImage ? 1 : 0) + 1 + (layout.copyrightPage ? 1 : 0) + (hasToc ? 1 : 0) + 1;
  const firstBodyPage = opts.firstBodyPage ?? estimatedFront;
  const runningTitle = (title || "").toUpperCase();

  const pageMargins: [number, number, number, number] = isTrim
    ? compact ? [50, 58, 46, 58] : [58, 64, 54, 64]
    : [72, 80, 72, 80];

  const docDefinition = {
    pageSize: { width: pageW, height: pageH },
    pageMargins,
    info: { title, subject: title, ...(author ? { author } : {}) },
    content,
    header: (currentPage: number, pageCount: number) => {
      if (!layout.runningHead) return null;
      if (currentPage < firstBodyPage) return null;
      if (layout.endPage && currentPage >= pageCount) return null;
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
      if (currentPage < firstBodyPage) return null;
      if (layout.endPage && currentPage >= pageCount) return null;
      const alignment = isTrim ? (currentPage % 2 === 0 ? "left" : "right") : "center";
      const margin: [number, number, number, number] = isTrim ? [54, 16, 54, 0] : [0, 16, 0, 0];
      return { text: `${currentPage}`, alignment, font: bodyFont, fontSize: 10, color: "#999999", margin };
    },
    styles: {
      coverTitle: { font: displayFont, fontSize: compact ? 24 : 30, bold: true, alignment: "center", color: "#1a1a1a", characterSpacing: 1 },
      coverSubtitle: { font: displayFont, fontSize: compact ? 13 : 15, italics: true, alignment: "center", color: "#666666", margin: [0, 10, 0, 0] },
      coverAuthor: { font: displayFont, fontSize: compact ? 12 : 14, alignment: "center", color: "#333333", characterSpacing: 1.5 },
      copyrightTitle: { font: displayFont, fontSize: 14, alignment: "center", color: "#333333" },
      copyright: { font: bodyFont, fontSize: 9, alignment: "center", color: "#888888", lineHeight: 1.4 },
      tocTitle: { font: displayFont, fontSize: compact ? 18 : 22, bold: true, alignment: "center", color: "#1a1a1a" },
      tocLabel: { font: displayFont, fontSize: 8, bold: true, characterSpacing: 1.6, color: accent, margin: [0, 0, 0, 1] },
      tocItem: { font: displayFont, fontSize: compact ? 11 : 12, bold: true, color: "#1a1a1a" },
      tocSection: { font: bodyFont, fontSize: compact ? 9.5 : 10.5, color: "#555555" },
      chapterLabel: { font: displayFont, fontSize: compact ? 9 : 10, bold: true, characterSpacing: 2.5, color: accent, alignment: layout.chapterTitleAlignment, margin: [0, 0, 0, 6] },
      chapterTitle: { font: displayFont, fontSize: compact ? 20 : 24, bold: true, alignment: layout.chapterTitleAlignment, color: "#1a1a1a" },
      h1: { font: displayFont, fontSize: compact ? 15 : 17, bold: true, color: "#1a1a1a", margin: [0, 16, 0, 8] },
      h2: { font: displayFont, fontSize: compact ? 13 : 14, bold: true, color: "#333333", margin: [0, 14, 0, 6] },
      h3: { font: displayFont, fontSize: compact ? 11.5 : 12.5, bold: true, color: "#333333", margin: [0, 10, 0, 4] },
      paragraph: { fontSize: bodySize, alignment: layout.bodyAlignment, margin: [0, 0, 0, 9] },
      blockquote: { fontSize: bodySize, italics: true, color: "#555555" },
      endMark: { font: displayFont, fontSize: 20, italics: true, alignment: "center", color: "#1a1a1a" },
    },
    defaultStyle: { font: bodyFont, fontSize: bodySize, lineHeight: layout.lineHeight },
  };

  return { docDefinition, chapterNodes, hasToc, pageFormat, firstBodyPage };
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

export interface BookPdfInput {
  title?: string | null;
  subtitle?: string | null;
  author?: string | null;
  category?: string | null;
  chapters: ChapterData[];
  coverUrl?: string | null;
  format?: "digital" | "print";
  workType?: string | null;
  style?: ExportStyle;
}

function firstPageOf(node: any): number | null {
  return node?.positions?.[0]?.pageNumber ?? null;
}

function summarize(built: BuiltDoc, pdfDoc: any): BookLayoutSummary {
  const pageCount: number = pdfDoc?._pdfMakePages?.length ?? 0;
  const starts = built.chapterNodes.map((c) => firstPageOf(c.node));
  return {
    pageCount,
    pageFormat: built.pageFormat,
    hasToc: built.hasToc,
    firstBodyPage: starts.find((p) => p !== null) ?? null,
    chapters: built.chapterNodes.map((c, i) => {
      const next = starts.slice(i + 1).find((p) => p !== null);
      const start = starts[i];
      return {
        title: c.title,
        startPage: start,
        endPage: start === null ? null : next ? Math.max(start, next - 1) : pageCount,
        sections: c.sections.map((sec) => ({ title: sec.title, page: firstPageOf(sec.node) })),
      };
    }),
  };
}

/** Compose le livre et renvoie le PDF ET la carte de sa mise en page (pages de chaque chapitre). */
export async function renderBookPdfWithLayout(
  input: BookPdfInput
): Promise<{ buffer: Buffer; layout: BookLayoutSummary }> {
  const preparedChapters: ChapterData[] = [];
  for (const ch of input.chapters) {
    preparedChapters.push({
      title: ch.title,
      number: ch.number,
      content: await embedExternalImages(ch.content || ""),
    });
  }

  const coverImage = await inlineCover(input.coverUrl);
  const printer = await getPrinter();
  const baseOptions: BuildOptions = {
    title: input.title || "Mon Livre",
    subtitle: input.subtitle || undefined,
    author: (input.author || "").trim() || undefined,
    chapters: preparedChapters,
    coverImage,
    category: input.category || undefined,
    format: input.format === "print" ? "print" : "digital",
    workType: input.workType,
    style: input.style || {},
  };

  let built = buildDocDefinition(baseOptions);
  let pdfDoc = printer.createPdfKitDocument(built.docDefinition);
  let layout = summarize(built, pdfDoc);

  // Un sommaire long occupe plusieurs pages : en-têtes et numéros de page
  // doivent démarrer au premier chapitre réel, connu après la mise en page.
  if (layout.firstBodyPage && layout.firstBodyPage !== built.firstBodyPage) {
    built = buildDocDefinition({ ...baseOptions, firstBodyPage: layout.firstBodyPage });
    pdfDoc = printer.createPdfKitDocument(built.docDefinition);
    layout = summarize(built, pdfDoc);
  }

  return { buffer: await streamToBuffer(pdfDoc), layout };
}

export async function renderBookPdf(input: BookPdfInput): Promise<Buffer> {
  return (await renderBookPdfWithLayout(input)).buffer;
}
