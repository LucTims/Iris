import { providerOf, fallbackChain } from '../model-fallback';

// Runner léger pour exécution directe en Node (même convention que les autres tests).
if (typeof (globalThis as any).describe === 'undefined') {
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
  });
}

describe('Repli automatique entre fournisseurs IA', () => {
  describe('providerOf', () => {
    test('reconnaît Gemini, OpenAI et Anthropic', () => {
      expect(providerOf('gemini-2.5-flash')).toBe('google');
      expect(providerOf('gpt-4o-mini')).toBe('openai');
      expect(providerOf('claude-3-5-sonnet-20241022')).toBe('anthropic');
    });

    test('retombe sur Google pour un identifiant inconnu', () => {
      expect(providerOf('modele-inconnu')).toBe('google');
    });
  });

  describe('fallbackChain', () => {
    test('garde le modèle demandé en premier', () => {
      expect(fallbackChain('gpt-4o-mini')[0]).toBe('gpt-4o-mini');
      expect(fallbackChain('gemini-2.5-flash')[0]).toBe('gemini-2.5-flash');
    });

    test('couvre les TROIS fournisseurs (une clé morte n\'en touche qu\'un)', () => {
      for (const model of ['gemini-2.5-flash', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022']) {
        const providers = fallbackChain(model).map(providerOf);
        expect(providers.length).toBe(3);
        expect([...new Set(providers)].sort().join(',')).toBe('anthropic,google,openai');
      }
    });

    test('ne répète jamais deux fois le même modèle', () => {
      const chain = fallbackChain('gemini-2.5-flash');
      expect(chain.length).toBe(new Set(chain).size);
    });
  });
});
