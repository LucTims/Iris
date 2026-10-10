import { describe, it, expect } from "vitest";
import {
  chapterChargeCoins,
  estimateChapterCoins,
  maxChargeForQuote,
  DEFAULT_WRITING_MODEL,
  PLAN_MAX_COINS,
  OUTLINE_MAX_COINS,
  WORDS_PER_PAGE,
} from "@/lib/ai/pricing";

const WELCOME_COINS = 500;

// Texte de `pages` pages pleines (WORDS_PER_PAGE mots chacune).
const textOfPages = (pages: number) => Array.from({ length: pages * WORDS_PER_PAGE }, () => "mot").join(" ");

describe("Option A — prix plafonné au devis + 25 %", () => {
  it("maxChargeForQuote arrondit au supérieur", () => {
    expect(maxChargeForQuote(60)).toBe(75);
    expect(maxChargeForQuote(61)).toBe(77);
    expect(maxChargeForQuote(0)).toBe(1);
  });

  it("un chapitre trop long n'est jamais facturé au-delà du plafond", () => {
    const quote = estimateChapterCoins(800, DEFAULT_WRITING_MODEL); // 3 pages × 20
    const { amount, pageCoins } = chapterChargeCoins(DEFAULT_WRITING_MODEL, undefined, textOfPages(9), quote);
    expect(pageCoins).toBe(180);
    expect(amount).toBe(maxChargeForQuote(quote));
  });

  it("un chapitre plus court que le devis est facturé à sa longueur réelle", () => {
    const quote = estimateChapterCoins(800, DEFAULT_WRITING_MODEL);
    const { amount } = chapterChargeCoins(DEFAULT_WRITING_MODEL, undefined, textOfPages(2), quote);
    expect(amount).toBe(40);
  });

  it("sans devis, le comportement historique est conservé", () => {
    const { amount } = chapterChargeCoins(DEFAULT_WRITING_MODEL, undefined, textOfPages(9));
    expect(amount).toBe(180);
  });
});

describe("Pièces de bienvenue", () => {
  it("500 pièces couvrent la structure, le plan et deux chapitres au pire cas", () => {
    const chapterMax = maxChargeForQuote(estimateChapterCoins(800, DEFAULT_WRITING_MODEL));
    expect(OUTLINE_MAX_COINS + PLAN_MAX_COINS + 2 * chapterMax).toBeLessThanOrEqual(WELCOME_COINS);
  });
});
