import { describe, it, expect } from "vitest";
import {
  buildCoverPrompt,
  pollinationsUrl,
  truncatePrompt,
  COVER_WIDTH,
  COVER_HEIGHT,
  MAX_URL_PROMPT_CHARS,
} from "@/lib/ai/cover";

describe("buildCoverPrompt", () => {
  it("generates a prompt based on the book metadata", () => {
    const p = buildCoverPrompt({ title: "Le Voyage d'Éric", category: "Roman jeunesse" });
    expect(p).toMatch(/Title theme: Le Voyage d'Éric/i);
    expect(p).toMatch(/Genre: Roman jeunesse/i);
  });

  it("uses the author's free prompt when provided", () => {
    const p = buildCoverPrompt({ userPrompt: "un dragon rouge sur une montagne enneigée" });
    expect(p).toMatch(/dragon rouge/);
  });

  it("derives a description from book metadata in auto mode", () => {
    const p = buildCoverPrompt({ synopsis: "un orphelin fait le tour du monde", category: "Aventure" });
    expect(p).toMatch(/Story premise: un orphelin fait le tour du monde/i);
    expect(p).toMatch(/Genre: Aventure/i);
  });
});

describe("truncatePrompt", () => {
  it("leaves a short prompt untouched apart from whitespace", () => {
    expect(truncatePrompt("a   fantasy\ncastle")).toBe("a fantasy castle");
  });

  it("caps a long prompt on a word boundary", () => {
    const long = "majestic regal lion ".repeat(200);
    const cut = truncatePrompt(long);
    expect(cut.length).toBeLessThanOrEqual(MAX_URL_PROMPT_CHARS);
    expect(cut.endsWith(" ")).toBe(false);
    // Aucun mot coupé en deux.
    expect(/(majestic|regal|lion)$/.test(cut)).toBe(true);
  });
});

describe("pollinationsUrl", () => {
  it("encodes the prompt and requests portrait cover dimensions with a seed", () => {
    const url = pollinationsUrl("a fantasy castle", { seed: 42 });
    expect(url).toMatch(/^https:\/\/image\.pollinations\.ai\/prompt\/a%20fantasy%20castle\?/);
    expect(url).toContain(`width=${COVER_WIDTH}`);
    expect(url).toContain(`height=${COVER_HEIGHT}`);
    expect(url).toContain("seed=42");
    expect(url).toContain("model=flux");
    expect(url).toContain("referrer=");
  });

  it("omits nologo when no Pollinations token is configured", () => {
    // `nologo` est réservé aux comptes authentifiés : l'envoyer sans jeton
    // faisait rejeter la requête et cassait tout le mode gratuit.
    expect(pollinationsUrl("a castle")).not.toContain("nologo");
  });

  it("asks for nologo only once authenticated, and honours the model override", () => {
    const url = pollinationsUrl("a castle", { authenticated: true, model: "turbo" });
    expect(url).toContain("nologo=true");
    expect(url).toContain("model=turbo");
  });

  it("keeps the URL short even for a verbose art-direction prompt", () => {
    const url = pollinationsUrl("majestic regal lion surrounded by gold coins ".repeat(60));
    expect(url.length).toBeLessThan(2000);
  });
});
