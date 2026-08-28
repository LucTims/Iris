import { describe, it, expect } from "vitest";
import {
  detectGenre,
  shouldGroundWithWebSearch,
  bodyFormattingRules,
  buildChapterSystemPrompt,
  continuityDirective,
} from "@/lib/ai/book-style";

describe("detectGenre", () => {
  it("classifies novels and narrative categories as fiction", () => {
    expect(detectGenre("Roman")).toBe("fiction");
    expect(detectGenre("Science-fiction")).toBe("fiction");
    expect(detectGenre("Littérature jeunesse")).toBe("fiction");
    expect(detectGenre("Thriller / Policier")).toBe("fiction");
    expect(detectGenre("Biographie")).toBe("fiction");
  });

  it("is accent-insensitive", () => {
    expect(detectGenre("recit d'aventure")).toBe("fiction");
    expect(detectGenre("POÉSIE")).toBe("fiction");
  });

  it("defaults practical categories to non-fiction", () => {
    expect(detectGenre("Développement personnel")).toBe("nonfiction");
    expect(detectGenre("Business")).toBe("nonfiction");
    expect(detectGenre("Guide pratique")).toBe("nonfiction");
    expect(detectGenre(undefined)).toBe("nonfiction");
    expect(detectGenre("")).toBe("nonfiction");
  });

  it("falls back to tone when category is empty", () => {
    expect(detectGenre("", "roman fantastique")).toBe("fiction");
  });
});

describe("shouldGroundWithWebSearch", () => {
  it("never grounds fiction, whatever the request", () => {
    expect(shouldGroundWithWebSearch("fiction", true)).toBe(false);
    expect(shouldGroundWithWebSearch("fiction", undefined)).toBe(false);
  });
  it("grounds non-fiction unless explicitly disabled", () => {
    expect(shouldGroundWithWebSearch("nonfiction", true)).toBe(true);
    expect(shouldGroundWithWebSearch("nonfiction", undefined)).toBe(true);
    expect(shouldGroundWithWebSearch("nonfiction", false)).toBe(false);
  });
});

describe("bodyFormattingRules", () => {
  it("forbids callouts, stats and sources in fiction", () => {
    const rules = bodyFormattingRules("fiction");
    expect(rules).toMatch(/INTERDIT ABSOLU/i);
    expect(rules).toMatch(/callout/i); // named as forbidden
    expect(rules).toMatch(/\[Source/i); // sources named as forbidden
  });
  it("allows callouts and tables in non-fiction", () => {
    const rules = bodyFormattingRules("nonfiction");
    expect(rules).toMatch(/callout-info/);
    expect(rules).toMatch(/<table>/);
  });
});

describe("continuityDirective", () => {
  it("forbids restarting the story for a later fiction chapter", () => {
    const d = continuityDirective("fiction", 3, true);
    expect(d).toMatch(/Ne recommence JAMAIS l'histoire/i);
    expect(d).toMatch(/chapitre 3/i);
  });
  it("treats the first chapter as an opening, not a continuation", () => {
    const d = continuityDirective("fiction", 1, false);
    expect(d).toMatch(/PREMIER chapitre/i);
    expect(d).not.toMatch(/Ne recommence JAMAIS/i);
  });
});

describe("buildChapterSystemPrompt", () => {
  it("injects the strong continuity rule and the character bible for a fiction sequel chapter", () => {
    const prompt = buildChapterSystemPrompt({
      genre: "fiction",
      title: "Le Voyage d'Éric",
      chapterNumber: 3,
      chapterTitle: "Londres",
      characters: "Éric, 12 ans, orphelin.",
      previousSummary: "Chapitre 2 : Éric s'échappe et embarque sur un cargo.",
    });
    expect(prompt).toMatch(/Ne recommence JAMAIS l'histoire/i);
    expect(prompt).toMatch(/Bible des personnages/i);
    expect(prompt).toMatch(/Éric s'échappe/);
    expect(prompt).toMatch(/INTERDIT ABSOLU/i); // fiction body rules applied
  });

  it("keeps callouts available for non-fiction", () => {
    const prompt = buildChapterSystemPrompt({
      genre: "nonfiction",
      title: "Investir en bourse",
      chapterNumber: 1,
      chapterTitle: "Les bases",
    });
    expect(prompt).toMatch(/callout-info/);
    expect(prompt).toMatch(/PREMIER chapitre/i);
  });
});
