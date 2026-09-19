import { stripChapterPrefix, detectChapterRole, assignChapterLabels } from "../chapter-heading";
import { resolveWorkType } from "../work-type";
import { sanitizeGeneratedHtml } from "../../ai/sanitize-html";

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
      if (!String(actual).includes(needle)) throw new Error(`Expected to contain ${needle}, got ${actual}`);
    },
    notToContain: (needle: string) => {
      if (String(actual).includes(needle)) throw new Error(`Expected NOT to contain ${needle}, got ${actual}`);
    },
  });
}

describe("Nettoyage des préfixes de chapitre", () => {
  test("retire « Chapitre 3 : »", () => {
    expect(stripChapterPrefix("Chapitre 3 : Réappropriation de son Ambition")).toBe(
      "Réappropriation de son Ambition"
    );
  });

  test("retire un double préfixe (le bug observé en production)", () => {
    expect(stripChapterPrefix("Chapitre 5 : Chapitre 3 : Réappropriation de son Ambition")).toBe(
      "Réappropriation de son Ambition"
    );
  });

  test("gère « Étape 2 - », « Partie I : » et « 4. »", () => {
    expect(stripChapterPrefix("Étape 2 - Préparer le terrain")).toBe("Préparer le terrain");
    expect(stripChapterPrefix("Partie II : Les fondations")).toBe("Les fondations");
    expect(stripChapterPrefix("4. Aller plus loin")).toBe("Aller plus loin");
  });

  test("laisse intact un titre sans numérotation", () => {
    expect(stripChapterPrefix("L'Avenir Appartient aux Audacieux")).toBe(
      "L'Avenir Appartient aux Audacieux"
    );
  });

  test("ne vide jamais un titre réduit à sa numérotation", () => {
    expect(stripChapterPrefix("Chapitre 3")).toBe("Chapitre 3");
  });
});

describe("Rôle d'un chapitre", () => {
  test("« Introduction : … » est un liminaire", () => {
    expect(detectChapterRole("Introduction : L'Avenir Appartient aux Audacieux")).toBe("front");
  });
  test("« Conclusion : … » est une fin d'ouvrage", () => {
    expect(detectChapterRole("Conclusion : L'Audace comme Mode de Vie")).toBe("back");
  });
  test("un chapitre ordinaire reste un chapitre", () => {
    expect(detectChapterRole("Forger une Résilience Psychologique")).toBe("chapter");
  });
});

describe("Numérotation d'un livre complet (cas réel « L'Audace de Réussir »)", () => {
  // La structure exacte qui produisait, en production, des titres comme
  // « Chapitre 2 : Introduction » et « Chapitre 5 : Chapitre 3 : … ».
  const plan = [
    { title: "Introduction : L'Avenir Appartient aux Audacieux" },
    { title: "Chapitre 1 : Forger une Résilience Psychologique" },
    { title: "Chapitre 2 : Discipline de Fer et Routine Quotidienne" },
    { title: "Chapitre 3 : Réappropriation de son Ambition" },
    { title: "Chapitre 4 : Figures Inspirantes et Modèles de Réussite" },
    { title: "Chapitre 5 : Vaincre le Syndrome de l'Imposteur" },
    { title: "Chapitre 6 : Surmonter les Défis Économiques et Professionnels" },
    { title: "Conclusion : L'Audace comme Mode de Vie" },
  ];

  test("l'introduction n'est pas numérotée", () => {
    expect(assignChapterLabels(plan)[0].heading).toBe("Introduction : L'Avenir Appartient aux Audacieux");
  });

  test("le premier vrai chapitre est le chapitre 1, pas le chapitre 2", () => {
    expect(assignChapterLabels(plan)[1].heading).toBe("Chapitre 1 : Forger une Résilience Psychologique");
  });

  test("aucun double préfixe sur toute la structure", () => {
    const headings = assignChapterLabels(plan).map((l) => l.heading);
    const doubled = headings.filter((h) => /Chapitre\s+\d+\s*:\s*Chapitre/i.test(h));
    expect(doubled.length).toBe(0);
  });

  test("la numérotation suit la position dans le corps, sans trou ni doublon", () => {
    const numbers = assignChapterLabels(plan)
      .filter((l) => l.displayNumber !== null)
      .map((l) => l.displayNumber);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("la conclusion garde son nom", () => {
    const labels = assignChapterLabels(plan);
    expect(labels[labels.length - 1].heading).toBe("Conclusion : L'Audace comme Mode de Vie");
  });

  test("un guide numérote en « Étape »", () => {
    expect(assignChapterLabels([{ title: "Préparer le terrain" }], "Étape")[0].heading).toBe(
      "Étape 1 : Préparer le terrain"
    );
  });
});

describe("Forme de l'ouvrage", () => {
  test("le choix explicite de l'auteur prime", () => {
    expect(resolveWorkType({ explicit: "guide", category: "Roman / Fiction" })).toBe("guide");
  });
  test("le développement personnel est un LIVRE par défaut (bug corrigé)", () => {
    expect(resolveWorkType({ category: "Développement Personnel" })).toBe("livre");
  });
  test("un titre annonçant un guide est détecté", () => {
    expect(resolveWorkType({ title: "Guide ultime de l'auditeur" })).toBe("guide");
  });
  test("un lead magnet est un ebook", () => {
    expect(resolveWorkType({ length: "Court (Nouvelle / Lead Magnet)" })).toBe("ebook");
  });
});

describe("Nettoyage du HTML généré (défauts relevés dans le livre réel)", () => {
  test("supprime les blocs ```html laissés par le modèle", () => {
    const out = sanitizeGeneratedHtml("```html\n<p>Bonjour</p>\n```");
    expect(out).notToContain("```");
    expect(out).toContain("<p>Bonjour</p>");
  });

  test("répare la lettrine cassée <p class=\"drop-cap\">L</p>e monde…", () => {
    const out = sanitizeGeneratedHtml('<p class="drop-cap">L</p>e monde dans lequel nous vivons.');
    expect(out).toContain('<p class="drop-cap">Le monde dans lequel nous vivons.</p>');
  });

  test("convertit les titres Markdown résiduels", () => {
    expect(sanitizeGeneratedHtml("### Techniques\n<p>Texte</p>")).toContain("<h3>Techniques</h3>");
  });

  test("convertit le gras Markdown résiduel", () => {
    expect(sanitizeGeneratedHtml("<p>Prenons **Nelson Mandela** comme exemple.</p>")).toContain(
      "<strong>Nelson Mandela</strong>"
    );
  });

  test("sort un encadré posé au milieu d'une phrase", () => {
    const out = sanitizeGeneratedHtml(
      '<p>Ce phénomène touche environ <div class="key-figure">70% de la population</div> à un moment.</p>'
    );
    expect(out).notToContain("key-figure");
    expect(out).toContain("70% de la population");
  });

  test("impose un titre unique et supprime le doublon", () => {
    const raw =
      '<h1>Introduction : L\'Avenir</h1>\n<hr data-page-break><h1>Chapitre 2 : Introduction : L\'Avenir</h1>\n<p>Texte.</p>';
    const out = sanitizeGeneratedHtml(raw, { expectedHeading: "Introduction : L'Avenir" });
    const h1Count = (out.match(/<h1[^>]*>/gi) || []).length;
    expect(h1Count).toBe(1);
    expect(out).notToContain("Chapitre 2");
  });

  test("une entrée vide ressort vide, sans exception", () => {
    expect(sanitizeGeneratedHtml("")).toBe("");
  });
});
