import {
  detectIntent,
  resolveTargetChapter,
  ChapterItem
} from '@/lib/ai/intent-detector';

// Lightweight test framework runner fallback for direct Node execution
if (typeof (globalThis as any).describe === 'undefined') {
  (globalThis as any).describe = (name: string, fn: () => void) => {
    console.log(`\n--- ${name} ---`);
    fn();
  };
  (globalThis as any).test = (name: string, fn: () => void | Promise<void>) => {
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>)
          .then(() => console.log(`  [✅ PASS] ${name}`))
          .catch((err: any) => {
            console.error(`  [❌ FAIL] ${name}:`, err.message || err);
            process.exitCode = 1;
          });
      }
      console.log(`  [✅ PASS] ${name}`);
    } catch (err: any) {
      console.error(`  [❌ FAIL] ${name}:`, err.message || err);
      process.exitCode = 1;
    }
  };
  (globalThis as any).expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain: (expected: any) => {
      if (!actual || !actual.includes(expected)) {
        throw new Error(`Expected content to contain ${JSON.stringify(expected)}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    }
  });
}

describe('Milestone 2 - Chat Intent Detection & Target Chapter Resolution Tests', () => {

  describe('detectIntent() classification', () => {
    test('classifies direct manuscript edit requests as MODIFY_CHAPTER', () => {
      const editPrompts = [
        "Modifie le chapitre 3 pour ajouter de la tension dramatique",
        "Réécris le chapitre 1 du point de vue de Sogolon",
        "Enrichis le chapitre 2 avec des métaphores poétiques",
        "Retravaille ce chapitre pour accélérer le rythme",
        "Peux-tu corriger le chapitre 4 et corriger les fautes ?",
        "Ajoute une scène de confrontation dans le chapitre 5",
        "Reformule le chapitre 2 pour qu'il soit plus sombre",
        "Raccourcis le chapitre 3 de moitié"
      ];

      for (const prompt of editPrompts) {
        const intent = detectIntent(prompt);
        expect(intent).toBe("MODIFY_CHAPTER");
      }
    });

    test('classifies general conversation and questions as CHAT_ONLY', () => {
      const chatPrompts = [
        "Donne-moi 5 idées de titre pour mon roman fantastique",
        "Que penses-tu du rythme de mon synopsis ?",
        "Comment puis-je développer le passé de mon personnage principal ?",
        "Qui devrait être l'antagoniste principal selon toi ?",
        "Bonjour Iris ! Es-tu prête pour m'aider aujourd'hui ?",
        "Peux-tu me rappeler ce qu'est un cliffhanger ?"
      ];

      for (const prompt of chatPrompts) {
        const intent = detectIntent(prompt);
        expect(intent).toBe("CHAT_ONLY");
      }
    });

    test('handles empty or whitespace prompts gracefully as CHAT_ONLY', () => {
      expect(detectIntent("")).toBe("CHAT_ONLY");
      expect(detectIntent("   ")).toBe("CHAT_ONLY");
    });
  });

  describe('resolveTargetChapter() resolution logic', () => {
    const mockChapters: ChapterItem[] = [
      { id: "c1", number: 1, title: "Chapitre 1 : Le Début", content: "<p>Contenu du chapitre 1</p>" },
      { id: "c2", number: 2, title: "Chapitre 2 : La Rencontre", content: "<p>Contenu du chapitre 2</p>" },
      { id: "c3", number: 3, title: "Chapitre 3 : L'Orage", content: "<p>Contenu du chapitre 3</p>" },
      { id: "c4", number: 4, title: "L'affrontement final", content: "<p>Contenu du chapitre 4</p>" }
    ];

    test('resolves target chapter by explicit requested number (e.g., "chapitre 3")', () => {
      const result = resolveTargetChapter({
        userPrompt: "Modifie le chapitre 3 pour ajouter de la tension",
        chapters: mockChapters,
        activeChapterIndex: 0
      });

      expect(result.targetIndex).toBe(2); // 0-indexed index for chapter 3
      expect(result.targetChapter?.id).toBe("c3");
      expect(result.targetTitle).toBe("Chapitre 3 : L'Orage");
      expect(result.targetContent).toBe("<p>Contenu du chapitre 3</p>");
    });

    test('resolves target chapter by matching title in prompt', () => {
      const result = resolveTargetChapter({
        userPrompt: "Réécris la scène de L'affrontement final avec plus de détails",
        chapters: mockChapters,
        activeChapterIndex: 0
      });

      expect(result.targetIndex).toBe(3); // 0-indexed index for chapter 4
      expect(result.targetChapter?.id).toBe("c4");
      expect(result.targetTitle).toBe("L'affrontement final");
    });

    test('falls back to activeChapterIndex when no explicit number or title is found', () => {
      const result = resolveTargetChapter({
        userPrompt: "Enrichis ce chapitre avec des dialogues plus percutants",
        chapters: mockChapters,
        activeChapterIndex: 1
      });

      expect(result.targetIndex).toBe(1);
      expect(result.targetChapter?.id).toBe("c2");
      expect(result.targetTitle).toBe("Chapitre 2 : La Rencontre");
    });

    test('handles empty chapters array gracefully with fallback', () => {
      const result = resolveTargetChapter({
        userPrompt: "Modifie le chapitre 2 pour le rendre meilleur",
        chapters: [],
        activeChapterIndex: 1,
        currentChapterContent: "<p>Mon brouillon</p>",
        fallbackSynopsis: "Synopsis de test"
      });

      expect(result.targetIndex).toBe(1);
      expect(result.targetChapter).toBe(null);
      expect(result.targetTitle).toBe("Chapitre 2");
      expect(result.targetContent).toBe("<p>Mon brouillon</p>");
    });
  });

  describe('Structured Payload Contract Validation', () => {
    test('constructs valid chapterModification payload object adhering to interface contract', () => {
      const mockResolved = {
        targetIndex: 2,
        targetChapter: { id: "c-123", number: 3, title: "L'orage" },
        targetTitle: "L'orage",
        targetContent: "<p>Ancien texte</p>"
      };

      const mockNewHtmlContent = "<h2>L'orage</h2><p>Le tonnerre grondait lourdement dans le ciel noir.</p>";
      const mockSummary = "Récriture complète de la scène d'orage avec ambiance dramatique.";

      const chapterModificationPayload = {
        chapterIndex: mockResolved.targetIndex,
        ...(mockResolved.targetChapter?.id !== undefined && { chapterId: mockResolved.targetChapter.id }),
        chapterTitle: mockResolved.targetTitle,
        newContent: mockNewHtmlContent,
        summary: mockSummary
      };

      expect(chapterModificationPayload.chapterIndex).toBe(2);
      expect(chapterModificationPayload.chapterId).toBe("c-123");
      expect(chapterModificationPayload.chapterTitle).toBe("L'orage");
      expect(chapterModificationPayload.newContent).toContain("<h2>L'orage</h2>");
      expect(chapterModificationPayload.summary).toBe(mockSummary);
    });
  });
});
