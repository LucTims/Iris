import { describe, it, expect } from "vitest";
import { buildCoverPrompt, pollinationsUrl, COVER_WIDTH, COVER_HEIGHT } from "@/lib/ai/cover";

describe("buildCoverPrompt", () => {
  it("always instructs the image model to produce NO text (title is added separately)", () => {
    const p = buildCoverPrompt({ title: "Le Voyage d'Éric", category: "Roman jeunesse" });
    expect(p).toMatch(/aucun mot|aucune lettre|aucun texte/i);
  });

  it("uses the author's free prompt when provided", () => {
    const p = buildCoverPrompt({ userPrompt: "un dragon rouge sur une montagne enneigée" });
    expect(p).toMatch(/dragon rouge/);
  });

  it("derives a description from book metadata in auto mode", () => {
    const p = buildCoverPrompt({ synopsis: "un orphelin fait le tour du monde", category: "Aventure" });
    expect(p).toMatch(/orphelin fait le tour du monde/);
    expect(p).toMatch(/Aventure/);
  });
});

describe("pollinationsUrl", () => {
  it("encodes the prompt and requests portrait cover dimensions with a seed", () => {
    const url = pollinationsUrl("a fantasy castle", 42);
    expect(url).toMatch(/^https:\/\/image\.pollinations\.ai\/prompt\/a%20fantasy%20castle\?/);
    expect(url).toContain(`width=${COVER_WIDTH}`);
    expect(url).toContain(`height=${COVER_HEIGHT}`);
    expect(url).toContain("seed=42");
    expect(url).toContain("nologo=true");
  });
});
