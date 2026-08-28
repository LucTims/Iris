import { describe, it, expect } from "vitest";
import { bookFontPairing } from "@/lib/ai/book-style";
import { PDF_FONT_KEYS } from "@/lib/export/fontRegistry";

describe("bookFontPairing", () => {
  it("returns pdf font keys that exist in the embedded library (so they render at export)", () => {
    const cats = ["Roman", "Jeunesse", "Thriller", "Romance", "Poésie", "Business", "Développement personnel", "Essai", "", undefined];
    for (const c of cats) {
      const { body, display } = bookFontPairing(c as string);
      expect(PDF_FONT_KEYS).toContain(body);
      expect(PDF_FONT_KEYS).toContain(display);
    }
  });

  it("gives distinct, style-appropriate pairings", () => {
    expect(bookFontPairing("Roman")).toEqual({ body: "Lora", display: "PlayfairDisplay" });
    expect(bookFontPairing("Littérature jeunesse")).toEqual({ body: "Nunito", display: "Poppins" });
    expect(bookFontPairing("Thriller")).toEqual({ body: "PTSerif", display: "Montserrat" });
    expect(bookFontPairing("Business")).toEqual({ body: "Merriweather", display: "Montserrat" });
    // défaut non-fiction
    expect(bookFontPairing("Catégorie inconnue")).toEqual({ body: "Merriweather", display: "Montserrat" });
  });
});
