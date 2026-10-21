import { describe, it, expect } from "vitest";
import {
  bookChargeCeiling,
  chapterChargeCoins,
  estimateChapterCoins,
  maxChargeForQuote,
  WORDS_PER_PAGE,
} from "@/lib/ai/pricing";

// Texte de `pages` pages pleines (WORDS_PER_PAGE mots chacune).
const textOfPages = (pages: number) => Array.from({ length: pages * WORDS_PER_PAGE }, () => "mot").join(" ");

describe("Coût maximal d'un livre (exigé avant de lancer la rédaction)", () => {
  it("cas réel : 9 chapitres courts sur Claude = 9 × 188 pièces", () => {
    // Le livre de démonstration : annoncé ~1 150 pièces, débité 9 × 188.
    expect(estimateChapterCoins(700, "claude-sonnet-5")).toBe(150);
    expect(bookChargeCeiling(9, 700, "claude-sonnet-5")).toBe(9 * 188);
  });

  it("couvre tout ce que le débit peut prélever, chapitre par chapitre", () => {
    for (const model of ["gemini-3.6-flash", "gpt-4o-mini", "claude-sonnet-5"]) {
      for (const words of [700, 1500, 2600]) {
        const quote = estimateChapterCoins(words, model);
        // Pire cas : l'IA écrit bien plus long que la cible.
        const { amount } = chapterChargeCoins(model, undefined, textOfPages(40), quote);
        expect(amount).toBeLessThanOrEqual(maxChargeForQuote(quote));
        expect(bookChargeCeiling(7, words, model)).toBe(7 * maxChargeForQuote(quote));
      }
    }
  });

  it("ne descend jamais sous un chapitre", () => {
    expect(bookChargeCeiling(0, 700, "gemini-3.6-flash")).toBe(bookChargeCeiling(1, 700, "gemini-3.6-flash"));
  });
});
