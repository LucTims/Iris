import { describe, it, expect } from "vitest";
import { findCliches, CLICHE_REPAIR_THRESHOLD, craftCharter } from "@/lib/ai/writing-craft";
import { enforceEnrichment, defaultEnrichment } from "@/lib/book/enrichment";
import { parseBible, renderBible } from "@/lib/book/book-bible";
import { auditChapter } from "@/lib/book/chapter-audit";
import { writingProfileFromProject, readStyleSettings } from "@/lib/book/writing-profile";
import { bookFontPairing } from "@/lib/ai/book-style";
import { TYPOGRAPHY_PRESETS } from "@/lib/book/typography";
import { PDF_FONT_KEYS } from "@/lib/export/fontRegistry";

describe("formules toutes faites", () => {
  // Extrait réel d'un livre généré par Iris (capture de l'auteur).
  const generic = `<p>Imaginez un instant un monde où vos aspirations ne sont pas entravées.</p>
<p>Considérez-le comme un phare qui illumine votre chemin vers la réussite.</p>
<p>Dans un monde en constante évolution, il est important de noter que la clé du succès est la discipline.</p>`;

  it("repère les clichés relevés sur les livres réels", () => {
    const labels = findCliches(generic).map((h) => h.label);
    expect(labels).toContain("« Imaginez un instant… »");
    expect(labels).toContain("la métaphore du phare");
    expect(labels).toContain("« la clé du succès »");
  });

  it("déclenche une reprise du chapitre au-delà du seuil", () => {
    expect(findCliches(generic).length).toBeGreaterThanOrEqual(CLICHE_REPAIR_THRESHOLD);
    const defects = auditChapter({ html: `<h1>Intro</h1>${generic}`, wordsTarget: 0 });
    expect(defects.map((d) => d.kind)).toContain("cliches");
  });

  it("laisse tranquille un texte concret", () => {
    const concrete = "<p>Le lundi où Aminata a envoyé son quarantième CV, elle a changé de méthode.</p>";
    expect(findCliches(concrete)).toHaveLength(0);
  });

  it("la charte n'offre aucune statistique d'exemple au modèle", () => {
    expect(/\d+\s*%/.test(craftCharter("nonfiction", "livre"))).toBe(false);
    expect(/\d+\s*%/.test(craftCharter("fiction", "livre"))).toBe(false);
  });
});

describe("mise en forme contrôlée", () => {
  const html = `<h1>Chapitre</h1><p>A</p>
<div class="callout callout-info"><strong>Information</strong><p>Pendez votre tableau de vision.</p></div>
<div class="pull-quote">Une phrase forte.</div>
<div class="section-divider section-divider-stars"></div>
<p><span style="color: #2563eb">Texte bleu</span></p>`;

  it("prose pure : les encadrés redeviennent des paragraphes, sans perte de texte ni couleur", () => {
    const out = enforceEnrichment(html, "aucune", "nonfiction");
    expect(out).not.toMatch(/callout|pull-quote|section-divider|style=/);
    expect(out).toContain("<p>Pendez votre tableau de vision.</p>");
    expect(out).toContain("<p>Une phrase forte.</p>");
    expect(out).not.toContain("Information");
  });

  it("sobre : un seul élément mis en valeur est conservé", () => {
    const out = enforceEnrichment(html, "sobre", "nonfiction");
    expect((out.match(/class="callout|class="pull-quote/g) || []).length).toBe(1);
  });

  it("en récit, un changement de scène devient un simple filet, jamais des étoiles", () => {
    const out = enforceEnrichment(html, "aucune", "fiction");
    expect(out).toContain("section-divider-line");
    expect(out).not.toContain("section-divider-stars");
  });

  it("niveaux par défaut : prose pour un roman, sobre pour un livre, pratique pour un guide", () => {
    expect(defaultEnrichment("fiction", "livre")).toBe("aucune");
    expect(defaultEnrichment("nonfiction", "livre")).toBe("sobre");
    expect(defaultEnrichment("nonfiction", "guide")).toBe("riche");
  });
});

describe("plume du livre", () => {
  it("la fiche de référence porte une plume propre au livre", () => {
    const bible = parseBible(`THESE: Le premier emploi se gagne avant l'entretien.
PLUME_NARRATEUR: une recruteuse de Dakar qui a lu des milliers de CV
PLUME_IMAGES: le marché, la couture, les files d'attente
PLUME_SIGNATURE: chaque chapitre s'ouvre sur un candidat réel | une pointe d'humour sec
PLUME_A_EVITER: les injonctions | le jargon RH`);
    expect(bible.pen?.narrator).toMatch(/recruteuse/);
    const rendered = renderBible(bible);
    expect(rendered).toMatch(/LA PLUME DE CE LIVRE/);
    expect(rendered).toMatch(/humour sec/);
  });

  it("le document « style » de l'auteur devient sa plume, un autre document reste une référence", () => {
    expect(
      writingProfileFromProject({ reference_analysis: "Phrases courtes.", reference_meta: { purpose: "style" } }).authorStyle
    ).toBe("Phrases courtes.");
    const ref = writingProfileFromProject({ reference_analysis: "Faits utiles.", reference_meta: { purpose: "learn" } });
    expect(ref.authorStyle).toBeUndefined();
    expect(ref.referenceNotes).toBe("Faits utiles.");
  });

  it("ignore les réglages inconnus", () => {
    expect(readStyleSettings({ enrichment: "extravagant", typography: "essai" })).toEqual({ typography: "essai" });
  });
});

describe("typographie", () => {
  it("chaque preset utilise des polices embarquées (rendues à l'export)", () => {
    for (const p of TYPOGRAPHY_PRESETS) {
      expect(PDF_FONT_KEYS).toContain(p.body);
      expect(PDF_FONT_KEYS).toContain(p.display);
    }
  });

  it("le choix de l'auteur prime sur la catégorie", () => {
    expect(bookFontPairing("Business", undefined, "classique")).toEqual({ body: "EBGaramond", display: "EBGaramond" });
    expect(bookFontPairing("Développement personnel")).toEqual({ body: "SourceSerif4", display: "LibreBaskerville" });
  });
});
