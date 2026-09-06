import {
  findUnwrittenSections,
  canResume,
  isUnwrittenSection,
  isSummarySection,
  sectionBody,
  resumeLabel,
} from "../unwritten";

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
  });
}

const written = (title: string) => ({
  title,
  content: `<h1>${title}</h1><p>${"Un paragraphe de contenu réel. ".repeat(30)}</p>`,
});
const bare = (title: string) => ({ title, content: `<h1>${title}</h1>` });

describe("Le cas signalé : génération interrompue sur « Livre complet »", () => {
  // Reproduit exactement la capture de l'auteur : quatre chapitres rédigés,
  // puis les chapitres 5 à 9 réduits à leur seul titre dans le même document.
  const sections = [
    { title: "Sommaire", content: "<h1>Sommaire</h1><ul><li>Chapitre 1</li></ul>" },
    written("Chapitre 1 : L'Atelier"),
    written("Chapitre 2 : La Découverte"),
    written("Chapitre 3 : Le Choix"),
    written("Chapitre 4 : Les Conséquences"),
    bare("Chapitre 5 : Les Effets Cumulatifs"),
    bare("Chapitre 6 : Un Passé à Corriger"),
    bare("Chapitre 7 : La Marche du Temps"),
    bare("Chapitre 8 : Les Mémoires Évaporées"),
    bare("Chapitre 9 : L'Héritage de l'Horloger"),
  ];

  const report = findUnwrittenSections(sections);

  test("les cinq chapitres non rédigés sont détectés", () => {
    expect(report.unwritten.length).toBe(5);
  });

  test("ce sont bien les chapitres 5 à 9", () => {
    expect(report.unwritten.map((u) => u.title)).toEqual([
      "Chapitre 5 : Les Effets Cumulatifs",
      "Chapitre 6 : Un Passé à Corriger",
      "Chapitre 7 : La Marche du Temps",
      "Chapitre 8 : Les Mémoires Évaporées",
      "Chapitre 9 : L'Héritage de l'Horloger",
    ]);
  });

  test("les quatre chapitres écrits sont préservés du recomptage", () => {
    expect(report.writtenCount).toBe(4);
    expect(report.totalCount).toBe(9);
  });

  test("le bouton « Continuer » doit s'afficher", () => {
    expect(canResume(report)).toBe(true);
  });

  test("le sommaire n'est jamais compté comme un chapitre à écrire", () => {
    expect(report.unwritten.some((u) => /sommaire/i.test(u.title))).toBe(false);
  });

  test("l'auteur voit combien de chapitres seront relancés", () => {
    expect(resumeLabel(report)).toContain("5 chapitres restants");
  });
});

describe("Quand la reprise n'a pas de sens", () => {
  test("un livre entièrement rédigé ne propose pas de reprise", () => {
    const report = findUnwrittenSections([written("Chapitre 1"), written("Chapitre 2")]);
    expect(canResume(report)).toBe(false);
    expect(report.unwritten.length).toBe(0);
  });

  test("un livre entièrement vierge relève de « Générer tout le livre »", () => {
    // Aucun chapitre écrit : proposer « Continuer » induirait en erreur.
    const report = findUnwrittenSections([bare("Chapitre 1"), bare("Chapitre 2")]);
    expect(canResume(report)).toBe(false);
  });

  test("un document sans section ne casse rien", () => {
    const report = findUnwrittenSections([]);
    expect(canResume(report)).toBe(false);
    expect(resumeLabel(report)).toContain("déjà rédigés");
  });
});

describe("Ce qui compte comme « écrit »", () => {
  test("un titre seul n'est pas écrit", () => {
    expect(isUnwrittenSection(bare("Chapitre 5 : Les Effets Cumulatifs"))).toBe(true);
  });

  test("un chapitre rédigé est écrit", () => {
    expect(isUnwrittenSection(written("Chapitre 1"))).toBe(false);
  });

  test("une phrase de transition laissée par l'auteur suffit", () => {
    const section = {
      title: "Chapitre 5",
      content: "<h1>Chapitre 5</h1><p>Ici je veux parler du temps qui passe et de ses effets.</p>",
    };
    expect(isUnwrittenSection(section)).toBe(false);
  });

  test("le corps exclut bien le titre du chapitre", () => {
    // Sans cette exclusion, un titre très long ferait passer un chapitre vide
    // pour un chapitre rédigé.
    const section = bare("Chapitre 5 : Un titre particulièrement long et détaillé pour ce chapitre");
    expect(sectionBody(section)).toBe("");
    expect(isUnwrittenSection(section)).toBe(true);
  });

  test("le sommaire est reconnu, quelle qu'en soit la forme", () => {
    expect(isSummarySection({ title: "Sommaire", content: "" })).toBe(true);
    expect(isSummarySection({ title: "Table des matières", content: "" })).toBe(true);
    expect(isSummarySection({ title: "Chapitre 1", content: "" })).toBe(false);
  });
});

describe("Reproduction fidèle du projet « L'Horloger » (sans sommaire)", () => {
  // Structure exacte relevée en base : quatre chapitres rédigés, puis cinq
  // titres nus séparés par des sauts de page, et AUCUN chapitre-sommaire.
  const sections = [
    written("Chapitre 1 : L'Arrivée du Mystère"),
    written("Chapitre 2 : Les Premiers Réglages"),
    written("Chapitre 3 : L'Étrange Effet"),
    written("Chapitre 4 : Les Conséquences Inattendues"),
    { title: "Chapitre 5 : Les Effets Cumulatifs", content: '<hr data-page-break=""><h1>Chapitre 5 : Les Effets Cumulatifs</h1>' },
    { title: "Chapitre 6 : Un Passé à Corriger", content: '<hr data-page-break=""><h1>Chapitre 6 : Un Passé à Corriger</h1>' },
    { title: "Chapitre 7 : La Marche du Temps", content: '<hr data-page-break=""><h1>Chapitre 7 : La Marche du Temps</h1>' },
    { title: "Chapitre 8 : Les Mémoires Évaporées", content: '<hr data-page-break=""><h1>Chapitre 8 : Les Mémoires Évaporées</h1>' },
    { title: "Chapitre 9 : L'Héritage de l'Horloger", content: '<hr data-page-break=""><h1>Chapitre 9 : L\'Héritage de l\'Horloger</h1>' },
  ];
  const report = findUnwrittenSections(sections);

  test("un livre sans sommaire est traité correctement", () => {
    expect(report.totalCount).toBe(9);
    expect(report.writtenCount).toBe(4);
  });

  test("le bouton s'affiche avec cinq chapitres à écrire", () => {
    expect(canResume(report)).toBe(true);
    expect(report.unwritten.length).toBe(5);
  });

  test("le saut de page devant le titre ne le fait pas passer pour du contenu", () => {
    expect(report.unwritten[0].title).toBe("Chapitre 5 : Les Effets Cumulatifs");
  });
});
