import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPrintHtml } from "@/lib/export/buildPrintHtml";

export const runtime = "nodejs";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Launch a headless browser that works in both environments:
 * - On Vercel / production: puppeteer-core + @sparticuz/chromium (a slim
 *   Chromium that fits inside the serverless function size limit).
 * - In local dev: the full `puppeteer` package with its bundled Chromium,
 *   so no local Chrome path configuration is needed.
 */
async function launchBrowser(): Promise<any> {
  const isServerless = !!process.env.VERCEL;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local development: full puppeteer ships its own Chromium.
  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function POST(req: Request) {
  let browser: any = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Accès non autorisé. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const { title, subtitle, chapters } = await req.json();

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json(
        { error: "Aucun chapitre à exporter." },
        { status: 400 }
      );
    }

    const html = buildPrintHtml(title || "Mon Livre Iris", subtitle, chapters);

    browser = await launchBrowser();
    const page = await browser.newPage();

    // Load the document and wait for network (Google Fonts) to settle.
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 45000 });
    // Extra safety: make sure web fonts are fully ready before printing.
    try {
      await page.evaluate(() => (document as any).fonts?.ready);
    } catch {}

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "2.5cm", bottom: "2.5cm", left: "2cm", right: "2cm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="width:100%; text-align:center; font-size:9px; color:#999999; font-family: sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`,
    });

    await browser.close();
    browser = null;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="livre.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF (Puppeteer):", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la génération du PDF." },
      { status: 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
