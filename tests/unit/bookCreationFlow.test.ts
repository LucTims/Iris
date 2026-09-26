import { describe, it, expect } from "vitest";
import { chapterChargeCoins, coinsPerPage, WORDS_PER_PAGE } from "@/lib/ai/pricing";
import { parseIdeaAnalysis, parseIdeaQuestions, isCategoryMismatch } from "@/lib/book/ideaAnalysis";
import { mergeChaptersHtml, isOutlineTitle } from "@/lib/book/mergeBook";
import { lengthToSizeKey, LENGTH_OPTIONS, SIZE_PRESETS } from "@/lib/book/generationPresets";

/** HTML d'un chapitre de `words` mots. */
const chapterHtml = (words: number) =>
  `<h1>Chapitre</h1><p>${Array.from({ length: words - 1 }, (_, i) => `mot${i}`).join(" ")}</p>`;

describe("facturation d'un chapitre — prix annoncé = prix débité", () => {
  it("un chapitre Gemini de 3 pages coûte 3 × 20 pièces (l'ancien plancher en facturait ~165)", () => {
    // Usage réaliste d'un chapitre : gros contexte (sommaire, résumés, web).
    const usage = { inputTokens: 12_000, outputTokens: 1_100 };
    const charge = chapterChargeCoins("gemini-3.6-flash", usage, chapterHtml(3 * WORDS_PER_PAGE));

    expect(charge.pages).toBe(3);
    expect(charge.amount).toBe(3 * coinsPerPage("gemini-3.6-flash"));
  });

  it("le garde-fou coût réel ne joue que dans un cas pathologique (contexte énorme, texte minuscule)", () => {
    const charge = chapterChargeCoins("claude-sonnet-5", { inputTokens: 900_000, outputTokens: 50 }, "<p>Court.</p>");
    expect(charge.amount).toBe(charge.costFloorCoins);
    expect(charge.amount).toBeGreaterThan(charge.pageCoins);
  });
});

describe("analyse de l'idée par Iris", () => {
  it("lit un JSON entouré de texte et ramène catégorie et ton sur les options connues", () => {
    const a = parseIdeaAnalysis(
      'Voici :\n```json\n{"category":"guide pratique","tone":"familier & accessible","audience":"Jeunes diplômés","style":"Phrases courtes","reason":"Sujet concret"}\n```'
    );
    expect(a.category).toBe("Guide Pratique");
    expect(a.tone).toBe("Familier et Accessible");
    expect(a.audience).toBe("Jeunes diplômés");
  });

  it("une réponse inexploitable donne une analyse vide, sans lever", () => {
    expect(parseIdeaAnalysis("désolé").category).toBe("");
    expect(parseIdeaAnalysis("{pas du json}").tone).toBe("");
  });

  it("extrait les questions numérotées et ignore le reste", () => {
    const q = parseIdeaQuestions("1. À qui s'adresse ce livre ?\n2) Que doit retenir le lecteur ?\nMerci !");
    expect(q).toEqual(["À qui s'adresse ce livre ?", "Que doit retenir le lecteur ?"]);
  });

  it("signale une catégorie différente de celle proposée", () => {
    expect(isCategoryMismatch("Roman / Fiction", "Guide Pratique")).toBe(true);
    expect(isCategoryMismatch("Guide Pratique", "guide pratique")).toBe(false);
  });
});

describe("livre affiché d'un seul tenant", () => {
  const chapters = [
    { title: "Sommaire", content: "<h1>Sommaire</h1><ul><li>Intro</li></ul>" },
    { title: "Introduction", content: "<hr data-page-break><h1>Introduction</h1><p>A</p>" },
    { title: "Chapitre 1 : Départ", content: "<p>B</p>" },
  ];

  it("retire le sommaire (le plan), ne re-titre pas et sépare les chapitres par un saut de page", () => {
    const html = mergeChaptersHtml(chapters, { skipOutline: true });
    expect(html).not.toContain("Sommaire");
    expect(html.startsWith("<h1>Introduction</h1>")).toBe(true); // pas de page blanche en tête
    expect(html.match(/<h1>Introduction<\/h1>/g)).toHaveLength(1);
    expect(html).toContain("<hr data-page-break><h1>Chapitre 1 : Départ</h1>");
  });

  it("reconnaît le chapitre-sommaire", () => {
    expect(isOutlineTitle("Table des matières")).toBe(true);
    expect(isOutlineTitle("Livre complet")).toBe(false);
  });
});

describe("longueur choisie à la création = longueur rédigée", () => {
  it("chaque option de l'assistant correspond à un preset de génération", () => {
    for (const opt of LENGTH_OPTIONS) {
      expect(lengthToSizeKey(opt.value)).toBe(opt.sizeKey);
      expect(opt.value).toContain(SIZE_PRESETS[opt.sizeKey].pages);
    }
    // Anciens projets
    expect(lengthToSizeKey("Court (Nouvelle / Lead Magnet)")).toBe("court");
    expect(lengthToSizeKey(null)).toBe("moyen");
  });
});
