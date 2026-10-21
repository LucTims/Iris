import { describe, it, expect, vi, afterEach } from "vitest";
import { htmlToPdfmakeContent } from "@/lib/export/htmlToPdfmake";
import { generateDocx } from "@/lib/export/generateDocx";
import { generateEpub } from "@/lib/export/generateEpub";
import { generateMarkdown } from "@/lib/export/generateMarkdown";
import JSZip from "jszip";

// PNG 1x1 transparent
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PNG_DATA_URI = `data:image/png;base64,${PNG_BASE64}`;

afterEach(() => vi.unstubAllGlobals());

describe("PDF Export Formatting (htmlToPdfmake)", () => {
  it("prend en compte la taille de police (font-size) en px sur un span", () => {
    const html = `<p><span style="font-size: 24px;">Texte agrandi</span> et texte normal</p>`;
    const nodes = htmlToPdfmakeContent(html);
    expect(nodes).toHaveLength(1);
    const runs = nodes[0].text;
    expect(runs).toHaveLength(2);
    expect(runs[0].text).toBe("Texte agrandi");
    expect(runs[0].fontSize).toBe(18); // 24px * 0.75 = 18pt
    expect(runs[1].text).toBe(" et texte normal");
    expect(runs[1].fontSize).toBeUndefined();
  });

  it("prend en compte la taille de police en pt et em", () => {
    const html = `<p><span style="font-size: 16pt;">Texte en pt</span> <span style="font-size: 1.5em;">Texte en em</span></p>`;
    const nodes = htmlToPdfmakeContent(html);
    const runs = nodes[0].text;
    expect(runs[0].fontSize).toBe(16);
    expect(runs[2].fontSize).toBe(17.3); // 1.5 * 11.5
  });

  it("prend en compte la taille de police définie au niveau du paragraphe", () => {
    const html = `<p style="font-size: 20px;">Tout le paragraphe est agrandi</p>`;
    const nodes = htmlToPdfmakeContent(html);
    const runs = nodes[0].text;
    expect(runs[0].fontSize).toBe(15); // 20 * 0.75 = 15pt
  });

  it("prend en compte l'alignement et l'interligne du paragraphe", () => {
    const html = `<p style="text-align: center; line-height: 1.8;">Texte centré avec interligne</p>`;
    const nodes = htmlToPdfmakeContent(html);
    expect(nodes[0].alignment).toBe("center");
    expect(nodes[0].lineHeight).toBe(1.8);
  });

  it("prend en compte le soulignement, le barré et le surlignage", () => {
    const html = `<p><u>Souligné</u> <s>Barré</s> <mark data-color="#ff0000">Surligné</mark></p>`;
    const nodes = htmlToPdfmakeContent(html);
    const runs = nodes[0].text;
    expect(runs[0].text).toBe("Souligné");
    expect(runs[0].decoration).toBe("underline");
    expect(runs[1].text).toBe(" ");
    expect(runs[2].text).toBe("Barré");
    expect(runs[2].decoration).toBe("lineThrough");
    expect(runs[4].text).toBe("Surligné");
    expect(runs[4].background).toBe("#ff0000");
  });

  it("respecte la largeur et l'alignement personnalisés des images", () => {
    const html = `<p><img src="${PNG_DATA_URI}" width="280" data-align="left" /></p>`;
    const nodes = htmlToPdfmakeContent(html);
    expect(nodes[0].image).toBe(PNG_DATA_URI);
    expect(nodes[0].width).toBe(280);
    expect(nodes[0].alignment).toBe("left");
  });
});

describe("Word (DOCX) Export Formatting (generateDocx)", () => {
  it("applique la taille de police personnalisée et l'alignement dans le DOCX", async () => {
    const html = `<p style="text-align: center;"><span style="font-size: 24px;">Grand titre personnalisé</span></p>`;
    const blob = await generateDocx("Test Livre", undefined, [
      { title: "Chapitre 1", number: 1, content: html }
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")!.async("string");
    // 24px * 1.5 = 36 half-points in Word OOXML: <w:sz w:val="36"/>
    expect(xml).toContain('w:sz w:val="36"');
    // Alignement centré: <w:jc w:val="center"/>
    expect(xml).toContain('w:jc w:val="center"');
  });

  it("supporte le soulignement et le texte barré dans le DOCX", async () => {
    const html = `<p><u>Souligné</u> et <s>Barré</s></p>`;
    const blob = await generateDocx("Test Livre", undefined, [
      { title: "Chapitre 1", number: 1, content: html }
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("<w:u");
    expect(xml).toContain("<w:strike");
  });
});

describe("EPUB Export Formatting (generateEpub)", () => {
  it("préserve les styles de police et les classes dans le XHTML", async () => {
    const html = `<p style="font-size: 20px; color: #b91c1c;">Texte coloré</p><div class="callout callout-warning"><p>Attention</p></div>`;
    const blob = await generateEpub("Livre EPUB", undefined, "Auteur", [
      { title: "Chapitre 1", number: 1, content: html }
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const chapterXml = await zip.file("OEBPS/chapter1.xhtml")!.async("string");
    expect(chapterXml).toContain('style="font-size: 20px; color: #b91c1c;"');
    expect(chapterXml).toContain('class="callout callout-warning"');
  });

  it("embarque les images internes dans le dossier images/ et le manifest", async () => {
    const html = `<p>Image ci-dessous :</p><img src="${PNG_DATA_URI}" />`;
    const blob = await generateEpub("Livre EPUB", undefined, "Auteur", [
      { title: "Chapitre 1", number: 1, content: html }
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const imgFiles = Object.keys(zip.files).filter((k) => k.startsWith("OEBPS/images/") && !k.endsWith("/"));
    expect(imgFiles.length).toBe(1);
    const opf = await zip.file("OEBPS/content.opf")!.async("string");
    expect(opf).toContain('href="images/img_1.png"');
    const chapterXml = await zip.file("OEBPS/chapter1.xhtml")!.async("string");
    expect(chapterXml).toContain('src="images/img_1.png"');
  });
});

describe("Markdown Export Formatting (generateMarkdown)", () => {
  it("convertit correctement le gras avec attributs, le barré et les images", async () => {
    const html = `<p><strong style="font-size: 20px">Gras stylé</strong> et <s>Barré</s></p><img src="https://test.com/img.png" alt="Graphique">`;
    const blob = generateMarkdown("Titre", "Sous-titre", [
      { title: "Chapitre 1", number: 1, content: html }
    ]);
    const text = await blob.text();
    expect(text).toContain("**Gras stylé**");
    expect(text).toContain("~~Barré~~");
    expect(text).toContain("![Graphique](https://test.com/img.png)");
  });
});
