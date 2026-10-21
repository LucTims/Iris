import { describe, it, expect } from "vitest";
import {
  storybookPersona,
  storybookPageRules,
  buildStorybookPlanPrompt,
  buildStorybookChapterPrompt,
  resolveStorybookAge,
} from "../storybook-prompts";

// Ce fichier suit l'API actuelle du module (persona par tranche d'âge, prompts
// de plan et de chapitre construits à partir des analyses d'images en cache).
// L'ancienne API (STORYBOOK_SYSTEM_PERSONA, buildStorybookPagePrompt,
// buildImageAnalysisPrompt) a été retirée : l'analyse d'image vit désormais
// dans la route /api/project-assets.

const images = [
  {
    file_url: "https://cdn.test/piko-1.jpg",
    ai_analysis: "Un petit hérisson endormi sous des feuilles d'automne dorées.",
  },
  {
    file_url: "https://cdn.test/piko-2.jpg",
    ai_analysis: "Le hérisson regarde la carte d'une forêt magique avec des étoiles.",
  },
];

describe("storybook-prompts", () => {
  describe("storybookPersona", () => {
    it("définit un auteur d'albums jeunesse adapté à la tranche d'âge", () => {
      const persona = storybookPersona("3-5");
      expect(persona).toContain("auteur-illustrateur d'albums jeunesse");
      expect(persona).toContain("3 à 5 ans");
      expect(persona).toContain("écrire JUSTE");
      expect(persona).toContain("l'image raconte et le texte accompagne");
    });

    it("change de public selon l'âge", () => {
      expect(storybookPersona("9-12")).toContain("9 à 12 ans");
      expect(storybookPersona("6-8")).toContain("6 à 8 ans");
    });
  });

  describe("storybookPageRules", () => {
    it("impose la complémentarité texte-image et la lecture à voix haute", () => {
      const rules = storybookPageRules("6-8");
      expect(rules).toContain("Ne DÉCRIS PAS l'image");
      expect(rules).toContain("À VOIX HAUTE");
      expect(rules).toContain("Une page = une image + un moment de l'histoire");
      expect(rules).toContain('<div class="story-page"><img src="URL_EXACTE"');
    });
  });

  describe("buildStorybookPlanPrompt", () => {
    it("reprend le titre, l'intention et le public de l'auteur", () => {
      const prompt = buildStorybookPlanPrompt({
        title: "Le Petit Hérisson Courageux",
        synopsis: "Un hérisson part chercher une pomme d'or dans la forêt.",
        audience: "4-7 ans",
        instructions: "Le héros s'appelle Piko.",
        assets: images,
      });

      expect(prompt).toContain("Titre : Le Petit Hérisson Courageux");
      expect(prompt).toContain("Un hérisson part chercher une pomme d'or dans la forêt.");
      // « 4-7 ans » : le plus jeune lecteur a 4 ans → tranche 3-5.
      expect(resolveStorybookAge("4-7 ans")).toBe("3-5");
      expect(prompt).toContain("Lecteurs : 3 à 5 ans");
      expect(prompt).toContain("Consignes de l'auteur (priorité maximale) : Le héros s'appelle Piko.");
    });

    it("articule le plan autour des images fournies, dans l'ordre", () => {
      const prompt = buildStorybookPlanPrompt({ title: "Le Voyage de Piko", assets: images });

      expect(prompt).toContain("LES 2 IMAGES DE L'AUTEUR, DANS L'ORDRE DU LIVRE");
      expect(prompt).toContain("l'enchaînement des 2 images");
      expect(prompt.indexOf("IMAGE 1")).toBeLessThan(prompt.indexOf("IMAGE 2"));
      expect(prompt).toContain(images[0].ai_analysis);
      expect(prompt).toContain(images[1].ai_analysis);
      expect(prompt).toContain(images[0].file_url);
    });

    it("applique des valeurs par défaut sans synopsis ni ton", () => {
      const prompt = buildStorybookPlanPrompt({ title: "Sans détails", assets: images });
      expect(prompt).toContain("Intention de l'auteur : à déduire des images");
      expect(prompt).toContain("Ton souhaité : chaleureux et malicieux");
      expect(prompt).not.toContain("Consignes de l'auteur");
    });
  });

  describe("buildStorybookChapterPrompt", () => {
    it("assemble persona, règles de page et images du chapitre", () => {
      const prompt = buildStorybookChapterPrompt({ audience: "Enfants de 10 ans", assets: images });

      expect(prompt).toContain("9 à 12 ans");
      expect(prompt).toContain("80 à 140 mots");
      expect(prompt).toContain("EXACTEMENT 2 blocs");
      expect(prompt).toContain(images[1].file_url);
      expect(prompt).toContain("Reprends les URL telles quelles");
    });

    it("exige la continuité du personnage d'un chapitre à l'autre", () => {
      const prompt = buildStorybookChapterPrompt({ assets: images });
      expect(prompt).toContain("Le personnage garde le même nom");
    });
  });
});
