import { describe, it, expect } from "vitest";
import {
  resolveStorybookAge,
  storybookPersona,
  storybookPageRules,
  renderAssetAnalyses,
  buildStorybookPlanPrompt,
  buildStorybookChapterPrompt,
  isStorybookBlueprint,
} from "@/lib/ai/storybook-prompts";
import { buildChapterSystemPrompt } from "@/lib/ai/book-style";

const asset = (n: number, analysis?: string | null) => ({
  file_url: `https://cdn.test/img-${n}.jpg`,
  ai_analysis: analysis === undefined ? `Un renard roux devant une porte bleue (image ${n}).` : analysis,
});

describe("tranche d'âge", () => {
  it("lit un âge explicite dans le public saisi", () => {
    expect(resolveStorybookAge("Enfants de 4 ans")).toBe("3-5");
    expect(resolveStorybookAge("7-9 ans")).toBe("6-8");
    expect(resolveStorybookAge("dès 10 ans")).toBe("9-12");
  });

  it("reconnaît les formulations sans chiffre", () => {
    expect(resolveStorybookAge("maternelle")).toBe("3-5");
    expect(resolveStorybookAge("collège")).toBe("9-12");
  });

  it("retombe sur 6-8 ans quand rien n'est précisé", () => {
    expect(resolveStorybookAge("")).toBe("6-8");
    expect(resolveStorybookAge(null)).toBe("6-8");
    expect(resolveStorybookAge("un public familial")).toBe("6-8");
  });

  it("adapte la longueur de page à l'âge", () => {
    expect(storybookPageRules("3-5")).toContain("25 à 50 mots");
    expect(storybookPageRules("6-8")).toContain("40 à 80 mots");
    expect(storybookPageRules("9-12")).toContain("80 à 140 mots");
  });
});

describe("persona d'album", () => {
  it("n'est pas le persona « best-seller » du prompt générique", () => {
    const persona = storybookPersona("6-8");
    expect(persona).toContain("albums jeunesse");
    expect(persona).not.toContain("best-sellers");
  });

  it("interdit explicitement l'appareil éditorial du guide", () => {
    const rules = storybookPageRules("6-8");
    for (const banned of ["encadré", "tableau", "liste à puces"]) {
      expect(rules.toLowerCase()).toContain(banned);
    }
    expect(rules).toContain("INTERDIT");
  });
});

describe("rendu des analyses d'images", () => {
  it("est vide sans image", () => {
    expect(renderAssetAnalyses([])).toBe("");
  });

  it("numérote les images et reprend leur URL exacte", () => {
    const text = renderAssetAnalyses([asset(1), asset(2)]);
    expect(text).toContain("IMAGE 1");
    expect(text).toContain("IMAGE 2");
    expect(text).toContain("https://cdn.test/img-1.jpg");
    expect(text).toContain("renard roux");
  });

  it("reste exploitable quand une analyse manque", () => {
    // Une analyse peut échouer à l'import : le prompt ne doit ni planter ni
    // laisser une ligne vide qui ferait croire à une image sans contenu.
    const text = renderAssetAnalyses([asset(1, null), asset(2, "")]);
    expect(text).toContain("IMAGE 1");
    expect(text).toContain("analyse indisponible");
    expect(text).not.toContain("Ce que l'on y voit : \n");
  });
});

describe("prompt de plan", () => {
  const plan = (count: number) =>
    buildStorybookPlanPrompt({
      title: "Le Renard et la Porte Bleue",
      synopsis: "Un renard cherche une clé",
      audience: "5 ans",
      assets: Array.from({ length: count }, (_, i) => asset(i + 1)),
    });

  it("borne le nombre de chapitres selon le nombre d'images", () => {
    expect(plan(4)).toContain("3 chapitres au maximum");
    expect(plan(10)).toContain("4 chapitres au maximum");
    expect(plan(20)).toContain("5 chapitres au maximum");
  });

  it("interdit d'oublier ou de dupliquer une image", () => {
    const text = plan(6);
    expect(text).toContain("JAMAIS une image dans deux chapitres");
    expect(text).toContain("JAMAIS d'image oubliée");
  });

  it("demande un sommaire, pas le texte de l'album", () => {
    const text = plan(6);
    expect(text).toContain("<h1>Sommaire</h1>");
    expect(text).toContain("N'écris AUCUN texte d'album");
  });
});

describe("prompt de chapitre", () => {
  it("impose un bloc par image", () => {
    const text = buildStorybookChapterPrompt({ audience: "6 ans", assets: [asset(1), asset(2), asset(3)] });
    expect(text).toContain("EXACTEMENT 3 blocs");
    expect(text).toContain('<div class="story-page">');
  });

  it("accorde le singulier pour une seule image", () => {
    const text = buildStorybookChapterPrompt({ audience: "6 ans", assets: [asset(1)] });
    expect(text).toContain("EXACTEMENT 1 bloc <div");
  });
});

describe("bascule du prompt système de chapitre", () => {
  const base = {
    genre: "fiction" as const,
    title: "Le Renard",
    chapterNumber: 1,
    chapterTitle: "Le départ",
    chapterHeading: "Chapitre 1 : Le départ",
    workType: "storybook" as const,
    audience: "5 ans",
  };

  it("remplace le persona générique quand des visuels analysés existent", () => {
    // Régression visée : empiler le prompt d'album sur « auteur de
    // best-sellers » + « vise 800 à 1500 mots » faisait produire un chapitre
    // de roman, la consigne la plus insistante l'emportant.
    const prompt = buildChapterSystemPrompt({
      ...base,
      storybookAssets: [asset(1), asset(2)],
      wordsTarget: 1500,
    });

    expect(prompt).toContain("albums jeunesse");
    expect(prompt).not.toContain("best-sellers");
    expect(prompt).not.toContain("1500 mots");
    expect(prompt).toContain("EXACTEMENT 2 blocs");
  });

  it("conserve le prompt générique sans visuel", () => {
    const prompt = buildChapterSystemPrompt({ ...base, wordsTarget: 1500 });
    expect(prompt).toContain("best-sellers");
    expect(prompt).toContain("1500 mots");
  });

  it("conserve le prompt générique pour les autres formats", () => {
    const prompt = buildChapterSystemPrompt({
      ...base,
      workType: "livre",
      storybookAssets: [asset(1)],
      wordsTarget: 1500,
    });
    expect(prompt).toContain("best-sellers");
  });

  it("reprend le titre canonique du chapitre", () => {
    const prompt = buildChapterSystemPrompt({ ...base, storybookAssets: [asset(1)] });
    expect(prompt).toContain("<h1>Chapitre 1 : Le départ</h1>");
  });
});

describe("identification du blueprint", () => {
  it("ne reconnaît que storybook", () => {
    expect(isStorybookBlueprint("storybook")).toBe(true);
    for (const other of ["livre", "guide", "ebook", "", null, undefined]) {
      expect(isStorybookBlueprint(other)).toBe(false);
    }
  });
});
