import { DOMParser, Element } from '@xmldom/xmldom';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

// --- DOM POLYFILL FOR TIPTAP IN NODE ENVIRONMENT ---
Element.prototype.matches = Element.prototype.matches || function () { return false; };
Element.prototype.addEventListener = Element.prototype.addEventListener || function () {};
Element.prototype.removeEventListener = Element.prototype.removeEventListener || function () {};
Element.prototype.getBoundingClientRect = Element.prototype.getBoundingClientRect || function () {
  return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0 };
};

Object.defineProperty(Element.prototype, 'style', {
  get() {
    if (!this._style) this._style = {};
    return this._style;
  },
  configurable: true,
});

Object.defineProperty(Element.prototype, 'classList', {
  get() {
    const el = this;
    return {
      add: (...classes: string[]) => {
        const current = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
        for (const c of classes) {
          if (!current.includes(c)) current.push(c);
        }
        el.setAttribute('class', current.join(' '));
      },
      remove: (...classes: string[]) => {
        const current = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
        const filtered = current.filter((c: string) => !classes.includes(c));
        el.setAttribute('class', filtered.join(' '));
      },
      contains: (c: string) => (el.getAttribute('class') || '').split(/\s+/).includes(c),
    };
  },
  configurable: true,
});

class CustomDOMParser extends DOMParser {
  parseFromString(str: string, type: any) {
    const doc = super.parseFromString(str, type) as any;
    if (!doc.body) {
      doc.body = doc.getElementsByTagName('body')[0] || doc.documentElement;
    }
    if (!doc.head) {
      doc.head = doc.getElementsByTagName('head')[0] || doc.documentElement;
    }
    return doc;
  }
}

const dummyDoc = new CustomDOMParser().parseFromString('<html><head></head><body></body></html>', 'text/html');
const DocConstructor = (dummyDoc as any).constructor;
DocConstructor.prototype.addEventListener = DocConstructor.prototype.addEventListener || function () {};
DocConstructor.prototype.removeEventListener = DocConstructor.prototype.removeEventListener || function () {};
DocConstructor.prototype.querySelector = DocConstructor.prototype.querySelector || function () { return null; };
DocConstructor.prototype.head = (dummyDoc as any).getElementsByTagName('head')[0] || dummyDoc.documentElement;

globalThis.DOMParser = CustomDOMParser as any;
globalThis.Element = Element as any;
globalThis.document = dummyDoc as any;
globalThis.innerHeight = 1000;
globalThis.innerWidth = 1000;
globalThis.window = {
  DOMParser: CustomDOMParser,
  Element: Element,
  document: dummyDoc,
  innerHeight: 1000,
  innerWidth: 1000,
  addEventListener: () => {},
  removeEventListener: () => {},
  getComputedStyle: () => ({}),
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  requestAnimationFrame: (cb: any) => globalThis.setTimeout(cb, 0),
  cancelAnimationFrame: (id: any) => globalThis.clearTimeout(id),
} as any;


// --- TEST HARNESS UTILITIES ---
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults: { suite: string; name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

function suite(suiteName: string, fn: () => void) {
  console.log(`\n======================================================`);
  console.log(`SUITE: ${suiteName}`);
  console.log(`======================================================`);
  fn();
}

function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>)
        .then(() => {
          passedTests++;
          console.log(`  [✅ PASS] ${name}`);
          testResults.push({ suite: 'Current', name, status: 'PASS' });
        })
        .catch((err: any) => {
          failedTests++;
          const msg = err?.message || String(err);
          console.error(`  [❌ FAIL] ${name}: ${msg}`);
          testResults.push({ suite: 'Current', name, status: 'FAIL', error: msg });
          process.exitCode = 1;
        });
    }
    passedTests++;
    console.log(`  [✅ PASS] ${name}`);
    testResults.push({ suite: 'Current', name, status: 'PASS' });
  } catch (err: any) {
    failedTests++;
    const msg = err?.message || String(err);
    console.error(`  [❌ FAIL] ${name}: ${msg}`);
    testResults.push({ suite: 'Current', name, status: 'FAIL', error: msg });
    process.exitCode = 1;
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expected: any) {
      if (!actual || !actual.includes(expected)) {
        throw new Error(`Expected content to contain ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toNotContain(expected: any) {
      if (actual && actual.includes(expected)) {
        throw new Error(`Expected content NOT to contain ${JSON.stringify(expected)}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    }
  };
}

function createTestEditor(initialContent: string = '') {
  return new Editor({
    extensions: [StarterKit],
    content: initialContent,
  });
}

// --- RUN VERIFICATION SUITES ---

async function runAllTests() {
  console.log("STARTING EMPIRICAL CHALLENGER 2 VERIFICATION SUITE");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // SUITE 1: TipTap Undo History Preservation Verification
  suite('1. TipTap Undo History Preservation & Content Replacement', () => {
    test('replaceContent via selectAll().insertContent() records edit in TipTap History stack', () => {
      const initialHtml = '<p>Chapitre 1 : Original text written by author.</p>';
      const editor = createTestEditor(initialHtml);

      expect(editor.getHTML()).toContain('Original text written by author');

      // AI Edit action (replicating RichManuscriptEditor.tsx replaceContent)
      const aiNewContent = '<p>Chapitre 1 : AI enhanced text with deeper narrative nuances.</p>';
      editor.chain().focus().selectAll().insertContent(aiNewContent).run();

      expect(editor.getHTML()).toContain('AI enhanced text with deeper narrative nuances');
      expect(editor.getHTML()).toNotContain('Original text written by author');

      editor.destroy();
    });

    test('editor.commands.undo() (Ctrl+Z) reverts AI edit back to exact pre-AI state when using insertContent transaction', () => {
      const initialHtml = '<p>Original paragraph before AI intervention.</p>';
      const editor = createTestEditor(initialHtml);

      // Perform AI replacement
      const aiContent = '<p>AI generated replacement paragraph.</p>';
      editor.chain().focus().selectAll().insertContent(aiContent).run();
      expect(editor.getHTML()).toContain('AI generated replacement paragraph');

      // Trigger Undo command
      const undoSuccess = editor.commands.undo();
      expect(undoSuccess).toBe(true);

      // Verify document reverted to state prior to AI edit
      const revertedHtml = editor.getHTML();
      expect(revertedHtml).toContain('Original paragraph before AI intervention');
      expect(revertedHtml).toNotContain('AI generated replacement paragraph');

      editor.destroy();
    });

    test('setContent() wipes undo stack while transaction insertContent() preserves it', () => {
      const initialHtml = '<p>Initial chapter text.</p>';
      
      // Case A: setContent() behavior
      const editorSetContent = createTestEditor(initialHtml);
      editorSetContent.commands.setContent('<p>New content set via setContent.</p>');
      expect(editorSetContent.getHTML()).toContain('New content set via setContent');
      
      const undoResultSetContent = editorSetContent.commands.undo();
      // setContent clears history, so undo returns false and content remains changed
      expect(undoResultSetContent).toBe(false);
      expect(editorSetContent.getHTML()).toContain('New content set via setContent');
      editorSetContent.destroy();

      // Case B: selectAll().insertContent() behavior
      const editorInsertContent = createTestEditor(initialHtml);
      editorInsertContent.chain().focus().selectAll().insertContent('<p>New content via insertContent.</p>').run();
      expect(editorInsertContent.getHTML()).toContain('New content via insertContent');

      const undoResultInsert = editorInsertContent.commands.undo();
      // insertContent preserves history, so undo succeeds and content reverts
      expect(undoResultInsert).toBe(true);
      expect(editorInsertContent.getHTML()).toContain('Initial chapter text');
      editorInsertContent.destroy();
    });
  });

  // SUITE 2: Active Chapter Index Auto-Switching & Out-of-Bounds Boundary Protection
  suite('2. UI Navigation & Chapter Index Boundary Protection', () => {

    interface Chapter {
      id: number | string;
      number: number;
      title: string;
      content: string;
      status: 'Brouillon' | 'En cours' | 'Terminé';
    }

    const initialChapters: Chapter[] = [
      { id: 1, number: 1, title: 'Chapitre 1', content: 'Contenu Ch1', status: 'En cours' },
      { id: 2, number: 2, title: 'Chapitre 2', content: 'Contenu Ch2', status: 'Brouillon' },
      { id: 3, number: 3, title: 'Chapitre 3', content: 'Contenu Ch3', status: 'Brouillon' },
    ];

    // Replicating page.tsx handleSendMessage modification payload processor
    function applyAiChapterModification(
      chapters: Chapter[],
      currentActiveIndex: number,
      targetIndex: number,
      newContent?: string
    ): { updatedChapters: Chapter[]; activeIndex: number; switchExecuted: boolean } {
      let activeIndex = currentActiveIndex;
      let switchExecuted = false;

      // Active chapter switch with boundary check (matching page.tsx lines 442-444)
      if (targetIndex >= 0 && targetIndex < chapters.length) {
        activeIndex = targetIndex;
        switchExecuted = true;
      }

      const updatedChapters = [...chapters];
      if (newContent !== undefined) {
        // Content update with boundary check (matching page.tsx lines 448-456)
        if (targetIndex >= 0 && targetIndex < updatedChapters.length) {
          updatedChapters[targetIndex] = {
            ...updatedChapters[targetIndex],
            content: newContent,
          };
        }
      }

      return { updatedChapters, activeIndex, switchExecuted };
    }

    test('Valid targetIndex auto-switches active chapter index and updates target chapter content', () => {
      const activeIdx = 0; // Currently on Chapter 1
      const targetIdx = 2; // AI modifies Chapter 3
      const newContent = '<p>Nouveau texte généré par l\'IA pour le Chapitre 3.</p>';

      const res = applyAiChapterModification(initialChapters, activeIdx, targetIdx, newContent);

      expect(res.switchExecuted).toBe(true);
      expect(res.activeIndex).toBe(2);
      expect(res.updatedChapters[2].content).toBe(newContent);
      expect(res.updatedChapters[0].content).toBe('Contenu Ch1'); // Chapter 1 untouched
    });

    test('Negative out-of-bounds index (-1) is rejected; active index remains unchanged and no state corruption occurs', () => {
      const activeIdx = 1; // Currently on Chapter 2
      const targetIdx = -1; // Out-of-bounds invalid index
      const newContent = '<p>Tentative de modification invalide.</p>';

      const res = applyAiChapterModification(initialChapters, activeIdx, targetIdx, newContent);

      expect(res.switchExecuted).toBe(false);
      expect(res.activeIndex).toBe(1); // Active index preserved safely
      expect(res.updatedChapters.length).toBe(3);
      expect(res.updatedChapters[0].content).toBe('Contenu Ch1');
      expect(res.updatedChapters[1].content).toBe('Contenu Ch2');
      expect(res.updatedChapters[2].content).toBe('Contenu Ch3');
    });

    test('Overflow out-of-bounds index (>= length) is rejected; active index remains unchanged and no state corruption occurs', () => {
      const activeIdx = 0;
      const targetIdx = 99; // Far out of bounds
      const newContent = '<p>Texte hors limites.</p>';

      const res = applyAiChapterModification(initialChapters, activeIdx, targetIdx, newContent);

      expect(res.switchExecuted).toBe(false);
      expect(res.activeIndex).toBe(0); // Active index preserved
      expect(res.updatedChapters.length).toBe(3);
      expect(res.updatedChapters[0].content).toBe('Contenu Ch1');
    });

    test('Active chapter fallback protects UI when current chapter is retrieved', () => {
      const chapters: Chapter[] = [
        { id: 1, number: 1, title: 'Chapitre Unique', content: 'Seul contenu', status: 'En cours' }
      ];
      const invalidActiveIndex = 5;

      // Replicating page.tsx line 377: const currentChapter = chapters[activeChapterIndex] || chapters[0];
      const currentChapter = chapters[invalidActiveIndex] || chapters[0];

      expect(currentChapter.title).toBe('Chapitre Unique');
      expect(currentChapter.content).toBe('Seul contenu');
    });
  });

  // SUMMARY & METRICS
  console.log(`\n======================================================`);
  console.log(`EMPIRICAL TEST SUMMARY METRICS`);
  console.log(`======================================================`);
  console.log(`Total Tests Executed: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.error(`\n❌ VERIFICATION SUITE FAILED WITH ${failedTests} FAILURE(S).`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL VERIFICATION SUITE TESTS PASSED SUCCESSFULLY.`);
  }
}

runAllTests().catch(err => {
  console.error("Unhandled error running tests:", err);
  process.exit(1);
});
