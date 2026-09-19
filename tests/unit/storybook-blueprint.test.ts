import { describe, it, expect } from "vitest";
import {
  getBlueprint,
  requiresUserImages,
  visionInstruction,
  BLUEPRINT_LIST,
} from "@/lib/book/book-blueprint";
import {
  resolveWorkType,
  workTypeWritingRules,
  workTypeLayout,
  workTypeOutlineRules,
  isImageDrivenWorkType,
  WORK_TYPES,
} from "@/lib/book/work-type";
import { imagesForChapter } from "@/lib/ai/book-job";

describe("registre des blueprints", () => {
  it("expose un blueprint par type d'ouvrage", () => {
    expect(BLUEPRINT_LIST.map((b) => b.id).sort()).toEqual([...WORK_TYPES].sort());
  });

  it("retombe sur « livre » pour un identifiant inconnu ou absent", () => {
    expect(getBlueprint(undefined).id).toBe("livre");
    expect(getBlueprint("recette-pas-encore-ouverte").id).toBe("livre");
  });

  it("ne demande des images QUE pour le storybook", () => {
    expect(requiresUserImages("storybook")).toBe(true);
    expect(requiresUserImages("livre")).toBe(false);
    expect(requiresUserImages("guide")).toBe(false);
    expect(requiresUserImages("ebook")).toBe(false);
  });
});

describe("storybook — type d'ouvrage", () => {
  it("est reconnu comme choix explicite", () => {
    expect(resolveWorkType({ explicit: "storybook" })).toBe("storybook");
  });

  it("n'est JAMAIS déduit par heuristique (choix explicite uniquement)", () => {
    // Un projet ancien sans work_type ne doit pas basculer en storybook sur un
    // simple mot du titre : ce serait une régression pour les livres existants.
    expect(resolveWorkType({ title: "Contes et histoires du soir" })).toBe("livre");
    expect(resolveWorkType({ category: "Roman / Fiction" })).toBe("livre");
  });

  it("impose la forme storybook même si le genre est de la fiction", () => {
    // Régression visée : la branche `genre === "fiction"` interceptait tout et
    // produisait des consignes de ROMAN pour un conte illustré.
    const rules = workTypeWritingRules("storybook", "fiction");
    expect(rules).toContain("STORYBOOK");
    expect(rules).toContain("story-page");
    expect(rules).toMatch(/40 à 80 MOTS/);
  });

  it("découpe le sommaire en moments d'histoire", () => {
    expect(workTypeOutlineRules("storybook", "fiction")).toContain("STORYBOOK");
  });

  it("n'utilise ni lettrine ni texte justifié à l'export", () => {
    const layout = workTypeLayout("storybook", "fiction");
    expect(layout.dropCaps).toBe(false);
    expect(layout.bodyAlignment).toBe("left");
    expect(layout.runningHead).toBe(false);
  });

  it("est le seul type piloté par l'image", () => {
    expect(isImageDrivenWorkType("storybook")).toBe(true);
    for (const wt of WORK_TYPES.filter((w) => w !== "storybook")) {
      expect(isImageDrivenWorkType(wt)).toBe(false);
    }
  });
});

describe("consigne de vision", () => {
  it("est vide quand aucune image n'est fournie", () => {
    expect(visionInstruction("storybook", 0)).toBe("");
  });

  it("exige l'ordre et l'exhaustivité des images pour un storybook", () => {
    const text = visionInstruction("storybook", 3);
    expect(text).toContain("3 image");
    expect(text).toContain("DANS L'ORDRE");
    expect(text).toContain("n'ignore aucune image");
  });
});

describe("répartition des images entre chapitres", () => {
  const urls = Array.from({ length: 7 }, (_, i) => `https://cdn.test/img-${i + 1}.jpg`);

  it("distribue toutes les images, sans doublon ni perte", () => {
    const total = 3;
    const all = [0, 1, 2].flatMap((i) => imagesForChapter(urls, i, total));
    expect(all).toEqual(urls);
    expect(new Set(all).size).toBe(urls.length);
  });

  it("donne une image de plus aux premiers chapitres quand le partage est inégal", () => {
    // 7 images sur 3 chapitres → 3 / 2 / 2.
    expect(imagesForChapter(urls, 0, 3)).toHaveLength(3);
    expect(imagesForChapter(urls, 1, 3)).toHaveLength(2);
    expect(imagesForChapter(urls, 2, 3)).toHaveLength(2);
  });

  it("préserve l'ordre chronologique du conte", () => {
    expect(imagesForChapter(urls, 0, 3)[0]).toBe(urls[0]);
    expect(imagesForChapter(urls, 2, 3).at(-1)).toBe(urls.at(-1));
  });

  it("renvoie un tableau vide quand il n'y a pas d'image", () => {
    expect(imagesForChapter(undefined, 0, 3)).toEqual([]);
    expect(imagesForChapter([], 0, 3)).toEqual([]);
  });

  it("ne renvoie rien au-delà du nombre de chapitres annoncé", () => {
    expect(imagesForChapter(urls, 5, 3)).toEqual([]);
  });

  it("donne toutes les images au chapitre unique", () => {
    expect(imagesForChapter(urls, 0, 1)).toEqual(urls);
  });

  it("laisse des chapitres sans image quand il y en a moins que de chapitres", () => {
    const few = ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"];
    expect(imagesForChapter(few, 0, 4)).toEqual([few[0]]);
    expect(imagesForChapter(few, 1, 4)).toEqual([few[1]]);
    expect(imagesForChapter(few, 2, 4)).toEqual([]);
    expect(imagesForChapter(few, 3, 4)).toEqual([]);
  });
});
