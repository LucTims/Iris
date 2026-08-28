import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  FONT_LIBRARY,
  CSS_TO_PDF_FONT,
  PDF_FONT_KEYS,
  fontsByCategory,
  FONT_CATEGORY_ORDER,
} from "@/lib/export/fontRegistry";

const FONTS_DIR = path.join(process.cwd(), "src", "lib", "export", "fonts");
const FACES = ["normal", "bold", "italics", "bolditalics"];

describe("font registry ↔ bundled TTF files", () => {
  it("ships all 4 faces for every font offered in the editor (no silent fallback to Roboto at export)", () => {
    const missing: string[] = [];
    for (const font of FONT_LIBRARY) {
      for (const face of FACES) {
        const file = path.join(FONTS_DIR, `${font.pdf}-${face}.ttf`);
        if (!fs.existsSync(file)) missing.push(`${font.pdf}-${face}.ttf`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("has unique css names and pdf keys", () => {
    const css = FONT_LIBRARY.map((f) => f.css.toLowerCase());
    const pdf = FONT_LIBRARY.map((f) => f.pdf);
    expect(new Set(css).size).toBe(css.length);
    expect(new Set(pdf).size).toBe(pdf.length);
  });

  it("maps every css family to its pdf key", () => {
    for (const f of FONT_LIBRARY) {
      expect(CSS_TO_PDF_FONT[f.css.toLowerCase()]).toBe(f.pdf);
    }
    expect(PDF_FONT_KEYS.length).toBe(FONT_LIBRARY.length);
  });

  it("groups every font under a known category", () => {
    const grouped = fontsByCategory();
    const totalGrouped = FONT_CATEGORY_ORDER.reduce((n, c) => n + grouped[c].length, 0);
    expect(totalGrouped).toBe(FONT_LIBRARY.length);
  });

  it("offers a genuinely broad library (serif, sans, display, script, mono)", () => {
    const grouped = fontsByCategory();
    expect(grouped["Serif"].length).toBeGreaterThanOrEqual(5);
    expect(grouped["Sans-serif"].length).toBeGreaterThanOrEqual(5);
    expect(grouped["Display"].length).toBeGreaterThanOrEqual(1);
    expect(grouped["Manuscrite"].length).toBeGreaterThanOrEqual(1);
    expect(grouped["Monospace"].length).toBeGreaterThanOrEqual(1);
  });
});
