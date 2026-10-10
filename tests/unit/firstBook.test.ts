import { describe, it, expect } from "vitest";
import {
  computeFirstBookProgress,
  pickFocusProject,
  welcomeChaptersCovered,
  FIRST_CHAPTER_MAX_COINS,
  REFERENCE_CHAPTER_WORDS,
} from "@/lib/onboarding/firstBook";
import {
  DEFAULT_WRITING_MODEL,
  OUTLINE_MAX_COINS,
  PLAN_MAX_COINS,
  WELCOME_COINS,
  estimateChapterCoins,
  maxChargeForQuote,
} from "@/lib/ai/pricing";

const fresh = { id: "p1", title: "Livre", total_words: 0, completion: { written: 0, total: 0 }, cover_url: null };

describe("parcours « Mon premier livre » — étapes déduites des données", () => {
  it("sans projet : seule l'étape 1 est proposée, vers /projects/new", () => {
    const p = computeFirstBookProgress([]);
    expect(p.completed).toBe(0);
    expect(p.focusProjectId).toBeNull();
    expect(p.steps[0]).toMatchObject({ id: "create", done: false, href: "/projects/new" });
    expect(p.steps.slice(1).every((s) => s.href === null && !s.done)).toBe(true);
  });

  it("projet créé sans plan : CTA vers l'éditeur avec génération du plan", () => {
    const p = computeFirstBookProgress([fresh]);
    expect(p.steps.map((s) => s.done)).toEqual([true, false, false, false]);
    expect(p.steps[1].href).toBe("/redaction?projectId=p1&new=true");
    expect(p.steps[2].href).toBeNull();
  });

  it("un sommaire rédigé (mots > 0) compte comme plan généré", () => {
    const p = computeFirstBookProgress([{ ...fresh, total_words: 420 }]);
    expect(p.steps[1].done).toBe(true);
    expect(p.steps[2].href).toBe("/redaction?projectId=p1");
  });

  it("un chapitre rédigé valide l'étape 3, la couverture l'étape 4", () => {
    const withChapter = { ...fresh, total_words: 1200, completion: { written: 1, total: 8 } };
    const p = computeFirstBookProgress([withChapter]);
    expect(p.steps.map((s) => s.done)).toEqual([true, true, true, false]);
    expect(p.steps[3].href).toBe("/cover-studio/p1");

    const done = computeFirstBookProgress([{ ...withChapter, cover_url: "https://x/cover.png" }]);
    expect(done.isComplete).toBe(true);
    expect(done.percent).toBe(100);
  });

  it("suit le projet le plus avancé, le plus récent à égalité", () => {
    const advanced = { ...fresh, id: "p2", completion: { written: 2, total: 5 } };
    expect(pickFocusProject([fresh, advanced])?.id).toBe("p2");
    expect(pickFocusProject([fresh, { ...fresh, id: "p3" }])?.id).toBe("p1");
  });
});

describe("coûts affichés — issus des exports de tarification", () => {
  it("le chapitre de référence coûte le plafond du devis par défaut", () => {
    expect(FIRST_CHAPTER_MAX_COINS).toBe(
      maxChargeForQuote(estimateChapterCoins(REFERENCE_CHAPTER_WORDS, DEFAULT_WRITING_MODEL))
    );
    const steps = computeFirstBookProgress([]).steps;
    expect(steps.find((s) => s.id === "plan")?.maxCoins).toBe(PLAN_MAX_COINS);
    expect(steps.find((s) => s.id === "chapter")?.maxCoins).toBe(FIRST_CHAPTER_MAX_COINS);
  });

  it("les pièces offertes couvrent le plan et au moins deux chapitres", () => {
    const n = welcomeChaptersCovered();
    expect(n).toBeGreaterThanOrEqual(2);
    expect(PLAN_MAX_COINS + OUTLINE_MAX_COINS + n * FIRST_CHAPTER_MAX_COINS).toBeLessThanOrEqual(WELCOME_COINS);
    expect(welcomeChaptersCovered(0)).toBe(0);
  });
});
