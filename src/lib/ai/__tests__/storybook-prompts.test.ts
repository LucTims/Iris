import { describe, it, expect } from "vitest";
import {
  STORYBOOK_SYSTEM_PERSONA,
  buildStorybookPlanPrompt,
  buildStorybookPagePrompt,
  buildImageAnalysisPrompt,
} from "../storybook-prompts";

describe("storybook-prompts", () => {
  describe("STORYBOOK_SYSTEM_PERSONA", () => {
    it("should define a persona for children's storybook author", () => {
      expect(STORYBOOK_SYSTEM_PERSONA).toContain("auteur professionnel de livres pour enfants");
      expect(STORYBOOK_SYSTEM_PERSONA).toContain("30 et 150 mots par page");
      expect(STORYBOOK_SYSTEM_PERSONA).toContain("COMPLÉMENTARITÉ TEXTE-IMAGE");
      expect(STORYBOOK_SYSTEM_PERSONA).toContain("guillemets français (« … »)");
      expect(STORYBOOK_SYSTEM_PERSONA).toContain("ARC NARRATIF");
    });
  });

  describe("buildStorybookPlanPrompt", () => {
    it("should build a standard plan prompt when no images are provided", () => {
      const prompt = buildStorybookPlanPrompt({
        title: "Le Petit Hérisson Courageux",
        synopsis: "Un hérisson part chercher une pomme d'or dans la forêt.",
        audience: "4-7 ans",
        characters: "Piko le hérisson",
        pageCount: 8,
      });

      expect(prompt).toContain("Le Petit Hérisson Courageux");
      expect(prompt).toContain("4-7 ans");
      expect(prompt).toContain("Piko le hérisson");
      expect(prompt).toContain("8");
      expect(prompt).toContain("SANS ILLUSTRATION PRÉALABLE");
    });

    it("should build an image-centered plan prompt when imageDescriptions are provided", () => {
      const images = [
        "Un petit hérisson endormi sous des feuilles d'automne dorées.",
        "Le hérisson regarde la carte d'une forêt magique avec des étoiles.",
      ];
      const prompt = buildStorybookPlanPrompt({
        title: "Le Voyage de Piko",
        pageCount: 2,
        imageDescriptions: images,
      });

      expect(prompt).toContain("ILLUSTRATIONS FOURNIES PAR L'AUTEUR");
      expect(prompt).toContain("PLAN ARTICULÉ AUTOUR DES IMAGES");
      expect(prompt).toContain("Page 1 (Illustration existante) :");
      expect(prompt).toContain(images[0]);
      expect(prompt).toContain("Page 2 (Illustration existante) :");
      expect(prompt).toContain(images[1]);
    });
  });

  describe("buildStorybookPagePrompt", () => {
    it("should include first-page directives for page 1", () => {
      const prompt = buildStorybookPagePrompt({
        title: "Amina et le Caméléon",
        pageNumber: 1,
        totalPages: 10,
        pageOutline: "Amina découvre un caméléon turquoise caché dans le flamboyant.",
        characters: "Amina, 6 ans",
      });

      expect(prompt).toContain("PAGE 1 sur un total de 10");
      expect(prompt).toContain("PREMIÈRE PAGE DU LIVRE");
      expect(prompt).toContain("2 et 5 phrases");
      expect(prompt).toContain("guillemets français");
    });

    it("should include continuity rules and image complementarity for middle pages with images", () => {
      const prompt = buildStorybookPagePrompt({
        title: "Amina et le Caméléon",
        pageNumber: 4,
        totalPages: 10,
        pageOutline: "Le caméléon change de couleur pour se fondre dans les fleurs jaunes.",
        previousPages: "Amina a salué le caméléon et ils sont devenus amis.",
        imageDescription: "Gros plan sur un caméléon jaune éclatant perché sur une fleur de tournesol.",
      });

      expect(prompt).toContain("CONTINUITÉ STRICTE (Page 4 sur 10)");
      expect(prompt).toContain("Ne recommence JAMAIS l'histoire au début");
      expect(prompt).toContain("Gros plan sur un caméléon jaune éclatant");
      expect(prompt).toContain("Le texte DOIT COMPLÉTER l'illustration et NON la paraphraser");
      expect(prompt).toContain("Ne dis JAMAIS « Sur cette image… »");
    });

    it("should include final page resolution instructions for the last page", () => {
      const prompt = buildStorybookPagePrompt({
        title: "Amina et le Caméléon",
        pageNumber: 10,
        totalPages: 10,
        pageOutline: "Amina et le caméléon s'endorment sous les étoiles en souriant.",
      });

      expect(prompt).toContain("DERNIÈRE PAGE DE L'ALBUM");
      expect(prompt).toContain("fin satisfaisante, réconfortante ou joyeuse");
    });
  });

  describe("buildImageAnalysisPrompt", () => {
    it("should build an analysis prompt for Gemini Vision", () => {
      const prompt = buildImageAnalysisPrompt({
        title: "Kofi et la Rivière enchantée",
        audience: "5-9 ans",
        imageIndex: 2,
        totalImages: 6,
      });

      expect(prompt).toContain("illustration n°2 sur un total de 6");
      expect(prompt).toContain("Kofi et la Rivière enchantée");
      expect(prompt).toContain("5-9 ans");
      expect(prompt).toContain("Sujets principaux et personnages");
      expect(prompt).toContain("Action et dynamique");
      expect(prompt).toContain("Décor et environnement");
      expect(prompt).toContain("Couleurs et ambiance visuelle");
      expect(prompt).toContain("Détails narratifs remarquables");
    });
  });
});
