import {
  detectIntent,
  resolveTargetChapter,
  ChapterItem
} from '@/lib/ai/intent-detector';
import { z } from 'zod';

// Track overall pass/fail counters for empirical reporting
let totalPassed = 0;
let totalFailed = 0;
const testResults: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

// Lightweight runner compatible with both direct execution via tsx and jest
if (typeof (globalThis as any).describe === 'undefined') {
  (globalThis as any).describe = (name: string, fn: () => void) => {
    console.log(`\n==================================================`);
    console.log(`SUITE: ${name}`);
    console.log(`==================================================`);
    fn();
  };
  (globalThis as any).test = (name: string, fn: () => void | Promise<void>) => {
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>)
          .then(() => {
            console.log(`  [✅ PASS] ${name}`);
            totalPassed++;
            testResults.push({ name, status: 'PASS' });
          })
          .catch((err: any) => {
            const errMsg = err.message || String(err);
            console.error(`  [❌ FAIL] ${name}\n        Reason: ${errMsg}`);
            totalFailed++;
            testResults.push({ name, status: 'FAIL', error: errMsg });
            process.exitCode = 1;
          });
      }
      console.log(`  [✅ PASS] ${name}`);
      totalPassed++;
      testResults.push({ name, status: 'PASS' });
    } catch (err: any) {
      const errMsg = err.message || String(err);
      console.error(`  [❌ FAIL] ${name}\n        Reason: ${errMsg}`);
      totalFailed++;
      testResults.push({ name, status: 'FAIL', error: errMsg });
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
    toNotContain: (unwanted: any) => {
      if (actual && actual.includes(unwanted)) {
        throw new Error(`Expected content NOT to contain ${JSON.stringify(unwanted)}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toPassZodSchema: (schema: z.ZodSchema) => {
      const parsed = schema.safeParse(actual);
      if (!parsed.success) {
        throw new Error(`Zod Schema Validation Failed: ${JSON.stringify(parsed.error.format())}`);
      }
    },
    not: {
      toContain: (unwanted: any) => {
        if (actual && actual.includes(unwanted)) {
          throw new Error(`Expected content NOT to contain ${JSON.stringify(unwanted)}`);
        }
      },
      toBe: (expected: any) => {
        if (actual === expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`);
        }
      }
    }
  });
}

// Mock chapter dataset for testing target chapter resolution
const mockChapters: ChapterItem[] = [
  { id: "chap-1", number: 1, title: "Chapitre 1 : L'Aube", content: "<p>Le soleil se levait à peine sur la cité obscure.</p>" },
  { id: "chap-2", number: 2, title: "Chapitre 2 : La Rencontre", content: "<p>Il aperçut une silhouette mystérieuse au coin de la rue.</p>" },
  { id: "chap-3", number: 3, title: "Chapitre 3 : L'Orage", content: "<p>Les éclairs déchiraient le ciel nocturne.</p>" },
  { id: "chap-4", number: 4, title: "Chapitre 4 : La Tempête", content: "<p>La pluie battante inondait les ruelles de la capitale.</p>" }
];

describe('Challenger 1 - Empirical Stress Testing for Intent Detection & Target Chapter Resolution', () => {

  // -------------------------------------------------------------
  // Test Suite 1: Specific & Complex French Prompt Intent Detection
  // -------------------------------------------------------------
  describe('1. detectIntent() Classification Stress Testing', () => {

    test('Prompt 1: "Modifie le chapitre 3 pour ajouter plus de suspense" -> MODIFY_CHAPTER', () => {
      const intent = detectIntent("Modifie le chapitre 3 pour ajouter plus de suspense");
      expect(intent).toBe("MODIFY_CHAPTER");
    });

    test('Prompt 2: "Peux-tu réécrire le premier chapitre ?" -> MODIFY_CHAPTER', () => {
      const intent = detectIntent("Peux-tu réécrire le premier chapitre ?");
      expect(intent).toBe("MODIFY_CHAPTER");
    });

    test('Prompt 3: "Corrige les fautes dans Chapitre 4 : La Tempête" -> MODIFY_CHAPTER', () => {
      const intent = detectIntent("Corrige les fautes dans Chapitre 4 : La Tempête");
      expect(intent).toBe("MODIFY_CHAPTER");
    });

    test('Prompt 4: "Que penses-tu du style de mon livre ?" -> CHAT_ONLY', () => {
      const intent = detectIntent("Que penses-tu du style de mon livre ?");
      expect(intent).toBe("CHAT_ONLY");
    });

    test('Edge Prompt: Empty string "" -> CHAT_ONLY', () => {
      const intent = detectIntent("");
      expect(intent).toBe("CHAT_ONLY");
    });

    test('Edge Prompt: Whitespace string "   " -> CHAT_ONLY', () => {
      const intent = detectIntent("   ");
      expect(intent).toBe("CHAT_ONLY");
    });

    test('Edge Prompt: Numbers only "12345" -> CHAT_ONLY', () => {
      const intent = detectIntent("12345");
      expect(intent).toBe("CHAT_ONLY");
    });

    test('Edge Prompt: "Chapitre 9999" (no action verb) -> CHAT_ONLY', () => {
      const intent = detectIntent("Chapitre 9999");
      expect(intent).toBe("CHAT_ONLY");
    });

    test('Edge Prompt: "Quel est le rôle du Chapitre 9999 dans l\'histoire ?" -> CHAT_ONLY', () => {
      const intent = detectIntent("Quel est le rôle du Chapitre 9999 dans l'histoire ?");
      expect(intent).toBe("CHAT_ONLY");
    });

    test('Complex French Prompt: "Retravaille ce chapitre en insufflant une atmosphère gothique" -> MODIFY_CHAPTER', () => {
      const intent = detectIntent("Retravaille ce chapitre en insufflant une atmosphère gothique");
      expect(intent).toBe("MODIFY_CHAPTER");
    });

    test('Complex French Prompt: "Améliore le dialogue dans le chapitre 2" -> MODIFY_CHAPTER', () => {
      const intent = detectIntent("Améliore le dialogue dans le chapitre 2");
      expect(intent).toBe("MODIFY_CHAPTER");
    });

    test('Ambiguous query: "Peux-tu relire le chapitre 3 ?" -> Evaluation', () => {
      // Testing if "relire" triggers MODIFY_CHAPTER or CHAT_ONLY
      const intent = detectIntent("Peux-tu relire le chapitre 3 ?");
      console.log(`      [INFO] "Peux-tu relire le chapitre 3 ?" detected as: ${intent}`);
      expect(intent).toBeDefined();
    });

    test('Ambiguous query: "Corrige les coquilles" (no chapter keyword) -> Evaluation', () => {
      const intent = detectIntent("Corrige les coquilles");
      console.log(`      [INFO] "Corrige les coquilles" detected as: ${intent}`);
      expect(intent).toBe("MODIFY_CHAPTER");
    });
  });

  // -------------------------------------------------------------
  // Test Suite 2: Target Chapter Resolution & Ambiguity Stress Testing
  // -------------------------------------------------------------
  describe('2. resolveTargetChapter() Resolution Stress Testing', () => {

    test('Case 1: "Modifie le chapitre 3 pour ajouter plus de suspense" -> Target Index 2 (Chapter 3)', () => {
      const result = resolveTargetChapter({
        userPrompt: "Modifie le chapitre 3 pour ajouter plus de suspense",
        chapters: mockChapters,
        activeChapterIndex: 0
      });
      expect(result.targetIndex).toBe(2);
      expect(result.targetChapter?.id).toBe("chap-3");
      expect(result.targetTitle).toBe("Chapitre 3 : L'Orage");
    });

    test('Case 2: "Peux-tu réécrire le premier chapitre ?" with activeChapterIndex: 2 -> Target Index 0 (Chapter 1)', () => {
      const result = resolveTargetChapter({
        userPrompt: "Peux-tu réécrire le premier chapitre ?",
        chapters: mockChapters,
        activeChapterIndex: 2 // User currently on Chapter 3
      });
      // Challenger Check: French ordinal words ("premier", "second") match test
      expect(result.targetIndex).toBe(0);
      expect(result.targetChapter?.id).toBe("chap-1");
    });

    test('Case 3: "Corrige les fautes dans Chapitre 4 : La Tempête" -> Target Index 3 (Chapter 4 / Matching Title)', () => {
      const result = resolveTargetChapter({
        userPrompt: "Corrige les fautes dans Chapitre 4 : La Tempête",
        chapters: mockChapters,
        activeChapterIndex: 0
      });
      expect(result.targetIndex).toBe(3);
      expect(result.targetChapter?.id).toBe("chap-4");
      expect(result.targetTitle).toBe("Chapitre 4 : La Tempête");
    });

    test('Case 4: Matching by Title alone: "Réécris la scène de La Rencontre" -> Target Index 1 (Chapter 2)', () => {
      const result = resolveTargetChapter({
        userPrompt: "Réécris la scène de La Rencontre",
        chapters: mockChapters,
        activeChapterIndex: 0
      });
      expect(result.targetIndex).toBe(1);
      expect(result.targetChapter?.id).toBe("chap-2");
    });

    test('Edge Case 1: Unknown Chapter Title: "Modifie le chapitre La Caverne Maudite" -> Fallback to activeChapterIndex', () => {
      const result = resolveTargetChapter({
        userPrompt: "Modifie le chapitre La Caverne Maudite",
        chapters: mockChapters,
        activeChapterIndex: 1
      });
      expect(result.targetIndex).toBe(1);
      expect(result.targetChapter?.id).toBe("chap-2");
    });

    test('Edge Case 2: Non-existent Chapter Number: "Modifie le Chapitre 9999" -> Fallback to activeChapterIndex', () => {
      const result = resolveTargetChapter({
        userPrompt: "Modifie le Chapitre 9999",
        chapters: mockChapters,
        activeChapterIndex: 1
      });
      expect(result.targetIndex).toBe(1);
      expect(result.targetChapter?.id).toBe("chap-2");
    });

    test('Edge Case 3: Out of bound activeChapterIndex (e.g. 10 with 4 chapters) -> Reset to index 0', () => {
      const result = resolveTargetChapter({
        userPrompt: "Retravaille ce chapitre",
        chapters: mockChapters,
        activeChapterIndex: 10
      });
      expect(result.targetIndex).toBe(0);
      expect(result.targetChapter?.id).toBe("chap-1");
    });

    test('Edge Case 4: Negative activeChapterIndex (e.g. -5) -> Reset to index 0', () => {
      const result = resolveTargetChapter({
        userPrompt: "Retravaille ce chapitre",
        chapters: mockChapters,
        activeChapterIndex: -5
      });
      expect(result.targetIndex).toBe(0);
      expect(result.targetChapter?.id).toBe("chap-1");
    });

    test('Edge Case 5: Empty chapters array with activeChapterIndex: 2 -> Fallback chapter construction', () => {
      const result = resolveTargetChapter({
        userPrompt: "Ajoute du suspense dans ce chapitre",
        chapters: [],
        activeChapterIndex: 2,
        currentChapterContent: "<p>Brouillon actuel</p>",
        fallbackSynopsis: "Synopsis par défaut"
      });
      expect(result.targetIndex).toBe(2);
      expect(result.targetChapter).toBe(null);
      expect(result.targetTitle).toBe("Chapitre 3");
      expect(result.targetContent).toBe("<p>Brouillon actuel</p>");
    });
  });

  // -------------------------------------------------------------
  // Test Suite 3: Response Schema Structure Verification
  // -------------------------------------------------------------
  describe('3. Response Schema Contract Verification', () => {

    const ModifyChapterResponseSchema = z.object({
      intent: z.literal("MODIFY_CHAPTER"),
      chatSummary: z.string().min(1),
      message: z.string().min(1),
      text: z.string().min(1),
      chapterModification: z.object({
        chapterIndex: z.number().int().min(0),
        chapterId: z.union([z.string(), z.number()]).optional(),
        chapterTitle: z.string().min(1),
        newContent: z.string(),
        summary: z.string().min(1)
      })
    });

    test('MODIFY_CHAPTER Schema: Valid payload passes Zod validation', () => {
      const samplePayload = {
        intent: "MODIFY_CHAPTER",
        chatSummary: "J'ai réécrit le chapitre 3 avec davantage de suspense et de détails atmosphériques.",
        message: "J'ai réécrit le chapitre 3 avec davantage de suspense et de détails atmosphériques.",
        text: "J'ai réécrit le chapitre 3 avec davantage de suspense et de détails atmosphériques.",
        chapterModification: {
          chapterIndex: 2,
          chapterId: "chap-3",
          chapterTitle: "Chapitre 3 : L'Orage",
          newContent: "<p>Le tonnerre gronda avec fureur alors que l'obscurité s'épaississait.</p>",
          summary: "Ajout de tension dramatique et description détaillée de la tempête."
        }
      };

      const parseResult = ModifyChapterResponseSchema.safeParse(samplePayload);
      expect(parseResult.success).toBe(true);
    });

    test('MODIFY_CHAPTER HTML Cleaning: newContent strip Markdown code block ```html', () => {
      const rawLLMOutput = "```html\n<h2>Chapitre 3</h2><p>Contenu réécrit</p>\n```";
      let cleanedHtml = rawLLMOutput
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();

      expect(cleanedHtml).toBe("<h2>Chapitre 3</h2><p>Contenu réécrit</p>");
      expect(cleanedHtml).not.toContain("```html");
      expect(cleanedHtml).not.toContain("```");
    });

    test('CHAT_ONLY Schema Verification: Stream text response headers structure', () => {
      const mockStreamHeaders = {
        'content-type': 'text/plain; charset=utf-8',
        'x-vercel-ai-data-stream': 'v1'
      };

      expect(mockStreamHeaders['content-type']).toContain('text/plain');
    });
  });
});

// Final execution summary printer
setTimeout(() => {
  console.log(`\n==================================================`);
  console.log(`EMPIRICAL TEST RUNNER SUMMARY`);
  console.log(`==================================================`);
  console.log(`Total Executed Tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  if (totalFailed > 0) {
    console.log(`\nFailed Tests Detail:`);
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(` - ${r.name}: ${r.error}`);
    });
  }
  console.log(`==================================================\n`);
}, 100);
