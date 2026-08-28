import { describe, it, expect } from "vitest";
import { htmlToPdfmakeContent, extractLeadingHeading } from "@/lib/export/htmlToPdfmake";

type PdfNode = { pageBreak?: string; style?: string };
const hasBreak = (nodes: PdfNode[]) => nodes.some((n) => n && n.pageBreak === "before");

describe("chapter page breaks in PDF export", () => {
  it("treats a plain <hr> (TipTap stripped the data attribute) as a page break", () => {
    const html = `<p>Fin du chapitre 1.</p><hr><h1>Chapitre 2</h1><p>Suite.</p>`;
    const nodes = htmlToPdfmakeContent(html) as PdfNode[];
    expect(hasBreak(nodes)).toBe(true);
  });

  it("still works with the explicit data-page-break marker", () => {
    const html = `<p>Fin.</p><hr data-page-break><h1>Chapitre 2</h1><p>Suite.</p>`;
    expect(hasBreak(htmlToPdfmakeContent(html) as PdfNode[])).toBe(true);
  });

  it("forces a new page before every chapter <h1> even with NO <hr> at all", () => {
    const html = `<h1>Chapitre 1</h1><p>Texte.</p><h1>Chapitre 2</h1><p>Texte.</p><h1>Chapitre 3</h1><p>Texte.</p>`;
    const nodes = htmlToPdfmakeContent(html) as PdfNode[];
    // Les h1 des chapitres 2 et 3 doivent porter un saut de page ; le 1er non.
    const h1Nodes = nodes.filter((n) => n.style === "h1");
    expect(h1Nodes.length).toBe(3);
    expect(h1Nodes[0].pageBreak).toBeUndefined();
    expect(h1Nodes[1].pageBreak).toBe("before");
    expect(h1Nodes[2].pageBreak).toBe("before");
  });
});

describe("extractLeadingHeading dedup", () => {
  it("strips a leading plain <hr> and returns the chapter title (no duplicate title)", () => {
    const { title, rest } = extractLeadingHeading(`<hr><h1>Chapitre 2 : La rencontre</h1><p>Moussa...</p>`);
    expect(title).toBe("Chapitre 2 : La rencontre");
    expect(rest).not.toMatch(/<h1/i);
  });

  it("still handles the data-page-break form", () => {
    const { title } = extractLeadingHeading(`<hr data-page-break><h1>Chapitre 1</h1><p>x</p>`);
    expect(title).toBe("Chapitre 1");
  });
});
