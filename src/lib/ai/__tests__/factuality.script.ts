import {
  factualityRules,
  keyFigureRule,
  hasGroundedData,
  analyzeFactuality,
  demoteUnsourcedKeyFigures,
} from "../factuality";
import { bodyFormattingRules, buildChapterSystemPrompt } from "../book-style";
import { parseBible, renderBible, renderChapterScope, isUsefulBible } from "../../book/book-bible";

// Runner léger pour exécution directe en Node (même convention que les autres tests).
if (typeof (globalThis as any).describe === "undefined") {
  (globalThis as any).describe = (name: string, fn: () => void) => {
    console.log(`\n--- ${name} ---`);
    fn();
  };
  (globalThis as any).test = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`  [✅ PASS] ${name}`);
    } catch (err: any) {
      console.error(`  [❌ FAIL] ${name}:`, err.message || err);
      process.exitCode = 1;
    }
  };
  (globalThis as any).expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain: (needle: string) => {
      if (!String(actual).includes(needle)) throw new Error(`Expected to contain "${needle}"`);
    },
    notToContain: (needle: string) => {
      if (String(actual).includes(needle)) throw new Error(`Expected NOT to contain "${needle}"`);
    },
  });
}

const GROUNDED = "\n--- DONNÉES FACTUELLES ---\nLa BRVM pèse 9 200 Md FCFA [brvm.org]\n--- FIN ---\n";

describe("Aucun prompt ne contient plus d'exemple chiffré", () => {
  // LA régression à ne jamais réintroduire : le prompt montrait
  // `<div class="key-figure">85% des entreprises…</div>` et en demandait 1 à 2
  // par chapitre. Le livre réel a produit sept statistiques fabriquées, dont
  // « 85 % des entreprises mondiales » — une recopie de l'exemple.
  const variants = [
    bodyFormattingRules("nonfiction", "livre"),
    bodyFormattingRules("nonfiction", "guide"),
    bodyFormattingRules("nonfiction", "ebook"),
    bodyFormattingRules("fiction", "livre"),
    bodyFormattingRules("nonfiction", "guide", GROUNDED),
  ];

  test("aucune variante ne montre de pourcentage en exemple", () => {
    const withPercent = variants.filter((v) => /\d+\s*%/.test(v));
    expect(withPercent.length).toBe(0);
  });

  test("le prompt d'un chapitre complet ne contient aucun pourcentage", () => {
    const prompt = buildChapterSystemPrompt({
      genre: "nonfiction",
      workType: "livre",
      title: "L'Audace de Réussir",
      chapterNumber: 1,
      chapterTitle: "Forger une Résilience",
      chapterHeading: "Chapitre 1 : Forger une Résilience",
    });
    expect(/\d+\s*%/.test(prompt)).toBe(false);
  });
});

describe("Les règles de factualité dépendent des données réelles", () => {
  test("sans données, l'écriture chiffrée est interdite", () => {
    const rules = factualityRules("");
    expect(rules).toContain("SANS AUCUN CHIFFRE");
    expect(rules).toContain("INTERDIT");
  });

  test("sans données, on ne mentionne même pas key-figure", () => {
    expect(keyFigureRule("")).toBe("");
    expect(keyFigureRule(null)).toBe("");
  });

  test("avec données, citer ses sources est exigé", () => {
    const rules = factualityRules(GROUNDED);
    expect(rules).toContain("[Source:");
    expect(rules).notToContain("SANS AUCUN CHIFFRE");
  });

  test("avec données, un seul chiffre marquant est autorisé", () => {
    expect(keyFigureRule(GROUNDED)).toContain("key-figure");
  });

  test("hasGroundedData distingue vide et rempli", () => {
    expect(hasGroundedData("")).toBe(false);
    expect(hasGroundedData("   ")).toBe(false);
    expect(hasGroundedData(GROUNDED)).toBe(true);
  });
});

describe("Garde-fou après génération", () => {
  test("détecte des chiffres avancés sans aucune source", () => {
    const report = analyzeFactuality("<p>70 % des leaders réussissent.</p>");
    expect(report.suspicious).toBe(true);
    expect(report.figures.length).toBe(1);
  });

  test("ne signale rien quand les sources sont citées", () => {
    const report = analyzeFactuality("<p>70 % des leaders [Source: BRVM, 2025].</p>");
    expect(report.suspicious).toBe(false);
  });

  test("rétrograde un chiffre mis en exergue sans source", () => {
    const out = demoteUnsourcedKeyFigures('<div class="key-figure">85% des entreprises</div>', "");
    expect(out).notToContain("key-figure");
    expect(out).toContain("85% des entreprises");
  });

  test("conserve l'encadré quand les données sont réelles", () => {
    const html = '<div class="key-figure">9 200 Md FCFA</div>';
    expect(demoteUnsourcedKeyFigures(html, GROUNDED)).toContain("key-figure");
  });
});

describe("Fiche de référence de l'ouvrage", () => {
  const raw = `THESE: L'audace se travaille comme un muscle.
PROMESSE: Le lecteur saura décider malgré le doute.
LECTEUR: Un entrepreneur de 30 ans qui repousse ses décisions.
VOIX: Vous, direct et chaleureux.
GLOSSAIRE: audace lucide = risque calculé | seuil de bascule = moment de la décision
EXEMPLES: le premier appel client | la démission de Mariam
HORS-SUJET: promesses de gain rapide | jargon de coaching`;

  test("parse chaque section", () => {
    const b = parseBible(raw);
    expect(b.thesis).toBe("L'audace se travaille comme un muscle.");
    expect(b.glossary.length).toBe(2);
    expect(b.outOfScope.length).toBe(2);
  });

  test("une réponse vide ne casse rien", () => {
    expect(isUsefulBible(parseBible(""))).toBe(false);
  });

  test("une fiche inutile n'est pas injectée dans le prompt", () => {
    expect(renderBible(parseBible(""))).toBe("");
  });

  test("la fiche rendue porte le vocabulaire et les interdits", () => {
    const rendered = renderBible(parseBible(raw));
    expect(rendered).toContain("audace lucide");
    expect(rendered).toContain("jargon de coaching");
  });

  test("le périmètre distingue l'écrit, l'en-cours et l'à-venir", () => {
    const scope = renderChapterScope(
      ["Introduction", "Chapitre 1 : Résilience", "Chapitre 2 : Discipline"],
      1
    );
    expect(scope).toContain("déjà écrit");
    expect(scope).toContain("À ÉCRIRE MAINTENANT");
    expect(scope).toContain("à venir");
    expect(scope).toContain("N'empiète pas");
  });

  test("le premier chapitre n'hérite pas d'une consigne « déjà écrit »", () => {
    const scope = renderChapterScope(["Chapitre 1 : Résilience", "Chapitre 2 : Discipline"], 0);
    expect(scope).notToContain("sont ACQUIS");
  });

  test("la fiche est bien présente dans le prompt du chapitre", () => {
    const prompt = buildChapterSystemPrompt({
      genre: "nonfiction",
      workType: "livre",
      title: "L'Audace de Réussir",
      chapterNumber: 2,
      chapterTitle: "Discipline",
      chapterHeading: "Chapitre 2 : Discipline",
      bible: parseBible(raw),
      allHeadings: ["Chapitre 1 : Résilience", "Chapitre 2 : Discipline"],
      chapterIndex: 1,
    });
    expect(prompt).toContain("FICHE DE RÉFÉRENCE");
    expect(prompt).toContain("seuil de bascule");
    expect(prompt).toContain("PLAN COMPLET DU LIVRE");
  });
});
