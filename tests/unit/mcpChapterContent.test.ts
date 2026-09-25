import { describe, it, expect } from "vitest";
import {
  normalizeLlmChapterContent,
  countWordsInHtml,
  stripDangerousHtml,
  SCENE_BREAK_HTML,
} from "@/lib/mcp/chapterContent";
import { htmlToPdfmakeContent } from "@/lib/export/htmlToPdfmake";

// Extrait fidèle du livre écrit via MCP le 22/09 : texte brut, paragraphes
// séparés par des retours, liste « - ». Il était stocké tel quel et s'affichait
// en UN seul paragraphe dans l'éditeur et dans le PDF.
const PLAIN = `Chaque juillet, dans les grandes villes comme dans les petites, la même scène se répète.
Trois ans plus tard, la même famille se retrouve autour d'un repas.

Ce qu'il faut retenir :
- 47 500 diplômés du supérieur sortent chaque année.
- Le nombre de diplômés a augmenté de 15,6 % en trois ans.

Retenez ce chiffre : 47 500.`;

const norm = (content: string, title = "47 500 diplômés, et après ?", startsOnNewPage = true) =>
  normalizeLlmChapterContent(content, { title, startsOnNewPage });

describe("normalizeLlmChapterContent — texte brut", () => {
  it("fait de chaque ligne un paragraphe et des « - » une vraie liste", () => {
    const { html } = norm(PLAIN);
    expect(html.match(/<p>/g)).toHaveLength(6); // 4 paragraphes + 2 items de liste
    expect(html).toContain("<ul><li><p>47 500 diplômés du supérieur sortent chaque année.</p></li>");
    expect(html).toContain("<p>Retenez ce chiffre : 47 500.</p>");
  });

  it("ouvre le chapitre comme la rédaction intégrée : saut de page puis titre", () => {
    expect(norm(PLAIN).html.startsWith("<hr data-page-break><h1>47 500 diplômés, et après ?</h1>\n<p>Chaque juillet")).toBe(true);
    expect(norm(PLAIN, "Introduction", false).html.startsWith("<h1>Introduction</h1>")).toBe(true);
  });

  it("l'export PDF rend des paragraphes et une liste distincts, plus un bloc unique", () => {
    const blocks = htmlToPdfmakeContent(norm(PLAIN).html);
    const bullets = blocks.filter((b: { text?: unknown[] }) => Array.isArray(b.text) && (b.text[0] as { text?: string })?.text === "•  ");
    expect(bullets).toHaveLength(2);
    expect(blocks.filter((b: { style?: string }) => b.style === "paragraph").length).toBeGreaterThanOrEqual(4);
  });

  it("échappe le HTML parasite mais garde les balises inline simples", () => {
    const { html } = norm("Un <em>vrai</em> test avec 3 < 5 & <script>alert(1)</script>");
    expect(html).toContain("<p>Un <em>vrai</em> test avec 3 &lt; 5 &amp; &lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
});

describe("normalizeLlmChapterContent — Markdown", () => {
  const MD = `# Chapitre 2 : Le culte du diplôme

D'où vient cette **conviction**, presque *sacrée* ?

## Un héritage

> Fais médecine, c'est sûr.

---

1. Premier point
2. Second point

# Une section écrite en « # »`;

  it("remplace le titre Markdown par le titre du chapitre, sans doublon", () => {
    const { html } = norm(MD, "Chapitre 2 : Le culte du diplôme");
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain("<h1>Chapitre 2 : Le culte du diplôme</h1>");
  });

  it("convertit gras, italique, intertitres, citation et liste numérotée", () => {
    const { html } = norm(MD, "Chapitre 2");
    expect(html).toContain("<strong>conviction</strong>");
    expect(html).toContain("<em>sacrée</em>");
    expect(html).toContain("<h2>Un héritage</h2>");
    expect(html).toContain("<blockquote><p>Fais médecine, c'est sûr.</p></blockquote>");
    expect(html).toContain("<ol><li><p>Premier point</p></li><li><p>Second point</p></li></ol>");
  });

  it("un « # » en milieu de chapitre devient un intertitre (pas de nouvelle page à l'export)", () => {
    expect(norm(MD, "Chapitre 2").html).toContain("<h2>Une section écrite en « # »</h2>");
  });

  it("« --- » devient un séparateur de scène, jamais un <hr> (qui vaut saut de page)", () => {
    const { html } = norm(MD, "Chapitre 2");
    expect(html).toContain(SCENE_BREAK_HTML);
    expect(html.match(/<hr/g)).toHaveLength(1); // seulement le saut de page d'ouverture
  });

  it("ne transforme pas les répliques de dialogue (tiret long) en liste", () => {
    const { html } = norm("— Bonjour, dit-il.\n— Bonsoir, répondit-elle.", "Scène");
    expect(html).not.toContain("<ul>");
    expect(html).toContain("<p>— Bonjour, dit-il.</p>");
  });
});

describe("normalizeLlmChapterContent — HTML", () => {
  it("conserve le HTML propre et sépare le texte laissé hors balise", () => {
    const { html } = norm("<h2>Section</h2>\nPremier paragraphe nu.\nSecond paragraphe <strong>nu</strong>.\n<p>Déjà balisé.</p>", "Titre");
    expect(html).toContain("<h2>Section</h2>");
    expect(html).toContain("<p>Premier paragraphe nu.</p>");
    expect(html).toContain("<p>Second paragraphe <strong>nu</strong>.</p>");
    expect(html).toContain("<p>Déjà balisé.</p>");
  });

  it("retire le titre <h1> fourni par le LLM et les blocs de code Markdown", () => {
    const { html } = norm("```html\n<h1>Chapitre 3</h1><p>Texte.</p>\n```", "Chapitre 3 : Titre canonique");
    expect(html).toBe("<hr data-page-break><h1>Chapitre 3 : Titre canonique</h1>\n<p>Texte.</p>");
  });

  it("neutralise scripts, gestionnaires d'événements et URL javascript:", () => {
    const dirty = `<p onclick="steal()">Texte online = connecté</p><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert('x')">lien</a>`;
    const clean = stripDangerousHtml(dirty);
    expect(clean).not.toMatch(/onclick|onerror|<script|javascript:/i);
    // Le texte « online = … » n'est pas un attribut : il reste intact.
    expect(clean).toContain("Texte online = connecté");
  });
});

describe("comptage", () => {
  it("compte les mots hors balises, le corps séparément du titre", () => {
    const result = norm("Un deux trois.\n\nQuatre cinq.", "Mon titre");
    expect(result.bodyWordCount).toBe(5);
    expect(result.wordCount).toBe(7);
    expect(countWordsInHtml("<p>Un&nbsp;deux</p>")).toBe(2);
  });

  it("un chapitre vide ne contient que son titre", () => {
    const result = norm("   ", "Chapitre vide", false);
    expect(result.html).toBe("<h1>Chapitre vide</h1>");
    expect(result.bodyWordCount).toBe(0);
  });
});
