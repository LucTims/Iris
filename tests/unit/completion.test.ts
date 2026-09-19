import { describe, it, expect } from "vitest";
import {
  evaluateCompletion,
  isChapterWritten,
  isSummaryChapter,
  resolveBookStatus,
  MIN_CHAPTER_CHARS,
} from "@/lib/book/completion";

const body = (words: number) => `<p>${"mot ".repeat(words).trim()}</p>`;

describe("détection d'un chapitre rédigé", () => {
  it("considère un chapitre avec du texte comme rédigé", () => {
    expect(isChapterWritten({ title: "Chapitre 1", content: body(50) })).toBe(true);
  });

  it("ne compte PAS le titre comme du corps de texte", () => {
    // Régression visée : un chapitre réduit à son seul <h1> a déjà plus de 40
    // caractères. Sans retrait du titre, il passait pour rédigé.
    const titleOnly = "<h1>Chapitre 5 : Les Effets Cumulatifs du Temps</h1>";
    expect(titleOnly.length).toBeGreaterThan(MIN_CHAPTER_CHARS);
    expect(isChapterWritten({ title: "Chapitre 5", content: titleOnly })).toBe(false);
  });

  it("traite un contenu vide ou absent comme non rédigé", () => {
    expect(isChapterWritten({ title: "Chapitre 2", content: "" })).toBe(false);
    expect(isChapterWritten({ title: "Chapitre 2", content: null })).toBe(false);
    expect(isChapterWritten({ title: "Chapitre 2" })).toBe(false);
  });

  it("fait confiance au compteur de mots quand il est renseigné", () => {
    // Le job de génération enregistre word_count : on évite de relire le HTML.
    expect(isChapterWritten({ title: "Chapitre 3", content: "", word_count: 1200 })).toBe(true);
  });

  it("ignore les balises et entités HTML pour mesurer le texte réel", () => {
    const onlyMarkup = "<h1>T</h1><p>&nbsp;</p><div></div>";
    expect(isChapterWritten({ title: "T", content: onlyMarkup })).toBe(false);
  });
});

describe("exclusion du sommaire", () => {
  it("reconnaît les intitulés de sommaire", () => {
    expect(isSummaryChapter({ title: "Sommaire" })).toBe(true);
    expect(isSummaryChapter({ title: "Table des matières" })).toBe(true);
    expect(isSummaryChapter({ title: "Prototype du livre" })).toBe(true);
    expect(isSummaryChapter({ title: "Chapitre 1 : Le départ" })).toBe(false);
  });

  it("n'empêche pas un livre avec sommaire d'être déclaré terminé", () => {
    // Régression visée : compter le sommaire comme chapitre à rédiger rendait
    // tout livre avec sommaire définitivement incomplet.
    const report = evaluateCompletion([
      { title: "Sommaire", content: "<ul><li>Chapitre 1</li></ul>" },
      { title: "Chapitre 1", content: body(300) },
      { title: "Chapitre 2", content: body(300) },
    ]);
    expect(report.total).toBe(2);
    expect(report.isComplete).toBe(true);
    expect(report.status).toBe("Terminé");
  });
});

describe("évaluation de l'avancement", () => {
  it("déclare terminé un livre dont tous les chapitres sont écrits", () => {
    const report = evaluateCompletion([
      { title: "Chapitre 1", content: body(400) },
      { title: "Chapitre 2", content: body(400) },
      { title: "Chapitre 3", content: body(400) },
    ]);
    expect(report).toMatchObject({ written: 3, total: 3, percent: 100, isComplete: true });
    expect(report.missing).toEqual([]);
  });

  it("liste les chapitres restants quand le livre est partiel", () => {
    const report = evaluateCompletion([
      { title: "Chapitre 1", content: body(400) },
      { title: "Chapitre 2", content: "<h1>Chapitre 2 : Un Passé à Corriger</h1>" },
      { title: "Chapitre 3", content: "" },
    ]);
    expect(report.written).toBe(1);
    expect(report.total).toBe(3);
    expect(report.percent).toBe(33);
    expect(report.isComplete).toBe(false);
    expect(report.missing).toEqual(["Chapitre 2", "Chapitre 3"]);
    expect(report.status).toBe("En rédaction");
  });

  it("ne déclare JAMAIS terminé un livre sans chapitre", () => {
    // Le pire faux positif possible : un livre vide affiché comme abouti.
    for (const input of [[], null, undefined, [{ title: "Sommaire", content: "<ul></ul>" }]]) {
      const report = evaluateCompletion(input as never);
      expect(report.isComplete).toBe(false);
      expect(report.status).toBe("Brouillon");
      expect(report.percent).toBe(0);
    }
  });

  it("qualifie de brouillon un livre dont aucun chapitre n'est écrit", () => {
    const report = evaluateCompletion([
      { title: "Chapitre 1", content: "" },
      { title: "Chapitre 2", content: "" },
    ]);
    expect(report.status).toBe("Brouillon");
    expect(report.written).toBe(0);
  });
});

describe("statut affiché", () => {
  const complete = evaluateCompletion([{ title: "Chapitre 1", content: body(400) }]);
  const partial = evaluateCompletion([
    { title: "Chapitre 1", content: body(400) },
    { title: "Chapitre 2", content: "" },
  ]);

  it("respecte le choix explicite de l'auteur", () => {
    // L'auteur a marqué son livre terminé : on ne le rétrograde pas parce
    // qu'il a rouvert un chapitre pour le retravailler.
    expect(resolveBookStatus("Terminé", partial)).toBe("Terminé");
  });

  it("calcule le statut des projets jamais marqués", () => {
    expect(resolveBookStatus("En cours", complete)).toBe("Terminé");
    expect(resolveBookStatus(null, partial)).toBe("En rédaction");
    expect(resolveBookStatus(undefined, partial)).toBe("En rédaction");
  });

  it("ramène l'état intermédiaire « Mise en page » à « En rédaction »", () => {
    expect(resolveBookStatus("Mise en page", partial)).toBe("En rédaction");
  });
});
