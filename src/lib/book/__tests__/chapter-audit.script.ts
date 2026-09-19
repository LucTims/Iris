import { auditChapter, overlapRatio, wordCount, buildRepairPrompt } from "../chapter-audit";

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
    toContain: (needle: string) => {
      if (!String(actual).includes(needle)) throw new Error(`Expected to contain "${needle}"`);
    },
    notToContain: (needle: string) => {
      if (String(actual).includes(needle)) throw new Error(`Expected NOT to contain "${needle}"`);
    },
    toBeGreaterThan: (n: number) => {
      if (!(actual > n)) throw new Error(`Expected > ${n}, got ${actual}`);
    },
  });
}

const kinds = (defects: { kind: string }[]) => defects.map((d) => d.kind).sort().join(",");

/** Fabrique un chapitre plausible de N mots, avec sous-titres. */
function chapterOf(words: number, opts: { subheads?: boolean } = {}): string {
  const body = Array.from({ length: words }, (_, i) => `mot${i % 50}`).join(" ");
  const h2 = opts.subheads === false ? "" : "<h2>Une idée</h2>";
  return `<hr data-page-break><h1>Chapitre 1 : Test</h1>${h2}<p>${body}.</p>`;
}

describe("Un bon chapitre ne déclenche aucune reprise", () => {
  test("longueur atteinte, structuré, sans chiffre : aucun défaut", () => {
    const defects = auditChapter({ html: chapterOf(1500), wordsTarget: 1500 });
    expect(kinds(defects)).toBe("");
  });

  test("une légère sous-longueur reste tolérée", () => {
    // 1200 mots pour un objectif de 1500 : acceptable, on ne relance pas.
    const defects = auditChapter({ html: chapterOf(1200), wordsTarget: 1500 });
    expect(kinds(defects)).toBe("");
  });

  test("un chapitre vide n'est pas audité (géré en amont)", () => {
    expect(kinds(auditChapter({ html: "", wordsTarget: 1500 }))).toBe("");
  });
});

describe("Détection des défauts objectifs", () => {
  test("chapitre nettement tronqué", () => {
    const defects = auditChapter({ html: chapterOf(400), wordsTarget: 1500 });
    expect(kinds(defects)).toContain("trop-court");
  });

  test("chapitre coupé au milieu d'une phrase", () => {
    const html = `<hr data-page-break><h1>Chapitre 1 : Test</h1><h2>x</h2><p>${"mot ".repeat(
      300
    )}et c'est alors que</p>`;
    expect(kinds(auditChapter({ html, wordsTarget: 300 }))).toContain("coupe-en-cours");
  });

  test("chiffres avancés sans aucune source", () => {
    const html = `<hr data-page-break><h1>C</h1><h2>x</h2><p>${"mot ".repeat(
      1000
    )} 70 % des dirigeants le confirment.</p>`;
    expect(kinds(auditChapter({ html, wordsTarget: 1000 }))).toContain("chiffres-non-sources");
  });

  test("les chiffres sourcés ne déclenchent rien", () => {
    const html = `<hr data-page-break><h1>C</h1><h2>x</h2><p>${"mot ".repeat(
      1000
    )} 70 % [Source: BRVM, 2025].</p>`;
    expect(kinds(auditChapter({ html, wordsTarget: 1000, searchContext: "données" }))).notToContain(
      "chiffres-non-sources"
    );
  });

  test("long chapitre sans aucune respiration", () => {
    const defects = auditChapter({
      html: chapterOf(1500, { subheads: false }),
      wordsTarget: 1500,
    });
    expect(kinds(defects)).toContain("sans-structure");
  });

  test("un récit n'a pas besoin de sous-titres", () => {
    const defects = auditChapter({
      html: chapterOf(1500, { subheads: false }),
      wordsTarget: 1500,
      isNarrativeBook: true,
    });
    expect(kinds(defects)).notToContain("sans-structure");
  });
});

describe("Détection des redites entre chapitres", () => {
  const summary =
    "Le chapitre expose la resilience psychologique, la mentalite de croissance, les objectifs flexibles, la pleine conscience et le reseau de soutien face aux echecs repetes.";

  test("un chapitre qui reprend le même contenu est signalé", () => {
    const html = `<h1>C</h1><h2>x</h2><p>La resilience psychologique repose sur une mentalite de croissance, des objectifs flexibles, la pleine conscience et un reseau de soutien face aux echecs repetes. ${"mot ".repeat(
      900
    )}</p>`;
    expect(kinds(auditChapter({ html, wordsTarget: 900, previousSummaries: [summary] }))).toContain("redite");
  });

  test("un chapitre sur un autre sujet ne l'est pas", () => {
    const html = `<h1>C</h1><h2>x</h2><p>La discipline quotidienne structure les journees autour de priorites claires. ${"mot ".repeat(
      900
    )}</p>`;
    expect(kinds(auditChapter({ html, wordsTarget: 900, previousSummaries: [summary] }))).notToContain("redite");
  });

  test("un résumé trop court ne permet aucune conclusion", () => {
    expect(overlapRatio("un texte quelconque", "trop court")).toBe(0);
  });
});

describe("Consigne de reprise", () => {
  test("elle demande une révision, pas une réécriture", () => {
    const prompt = buildRepairPrompt("<p>x</p>", [{ kind: "trop-court", instruction: "Développe." }], "Chapitre 1 : T");
    expect(prompt).toContain("Développe.");
    expect(prompt).toContain("tu ne réécris pas depuis zéro");
    expect(prompt).toContain("Chapitre 1 : T");
  });
});

describe("Comptage de mots", () => {
  test("ignore les balises", () => {
    expect(wordCount("<p>un deux trois</p>")).toBe(3);
  });
  test("gère le vide", () => {
    expect(wordCount("")).toBe(0);
  });
});
