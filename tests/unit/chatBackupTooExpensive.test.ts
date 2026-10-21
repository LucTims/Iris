import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Assistant de l'éditeur, quand le modèle choisi est en panne (crédit épuisé).
 *
 * Bug corrigé : si le modèle de secours coûtait plus que le solde, il était
 * ignoré et l'auteur lisait « Iris n'arrive pas à joindre ses modèles d'IA »,
 * comme si tout était en panne. On dit maintenant ce qui bloque vraiment : le
 * coût du secours face au solde.
 */

let balance = 0;
const streamText = vi.fn();
const generateObject = vi.fn();

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  streamText: (...args: unknown[]) => streamText(...args),
  generateObject: (...args: unknown[]) => generateObject(...args),
}));

vi.mock("@/lib/ai/search-context", () => ({
  getAiModel: (modelId: string) => modelId,
  fetchSearchContext: async () => "",
}));

vi.mock("@/lib/ai/cost-engine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/cost-engine")>()),
  getWalletBalance: async () => balance,
  deductGenerationCost: vi.fn(async () => true),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: async () => ({ success: true, count: 1, resetTime: Date.now() + 60_000 }),
}));

/** Requête Supabase factice : chaînable, résout sans données. */
const query = (): any => {
  const result = { data: null, count: 0, error: null };
  const builder: any = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "then") return (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(result).then(ok, ko);
        if (prop === "single") return async () => ({ data: { role: "user", plan: "free" }, error: null });
        return () => builder;
      },
    }
  );
  return builder;
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "bed73319-dfca-4606-b81e-aac1d70db9d5" } } }) },
    from: () => query(),
  }),
}));

const depleted = () => ({
  stream: (async function* () {
    yield { type: "error", error: new Error("Your prepayment credits are depleted") };
  })(),
});

const CHAPTERS = [{ id: "c1", title: "Chapitre 1", content: "<h1>Chapitre 1</h1><p>Le poulailler.</p>", number: 1 }];

async function ask(text: string) {
  const { POST } = await import("@/app/api/chat/route");
  const res = await POST(
    new Request("https://iris.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ sender: "user", text }],
        chapters: CHAPTERS,
        activeChapterIndex: 0,
        model: "gemini-3.6-flash",
        useWebSearch: false,
      }),
    })
  );
  return { status: res.status, json: await res.json() };
}

describe("Assistant : modèle choisi en panne", () => {
  beforeEach(() => {
    streamText.mockReset();
    streamText.mockImplementation(depleted);
    generateObject.mockReset();
    generateObject.mockRejectedValue(new Error("Your prepayment credits are depleted"));
  });

  it("conversation : secours trop cher pour le solde → 402 avec le coût du secours", async () => {
    balance = 150;
    const { status, json } = await ask("Bonjour, as-tu une idée de titre pour mon livre ?");

    expect(status).toBe(402);
    expect(json.error).toContain("Le modèle d'IA habituel ne répond pas");
    expect(json.error).toContain("150 pièces");
    expect(json.balance).toBe(150);
    expect(json.required).toBeGreaterThan(150);
    // Le secours trop cher n'est jamais appelé.
    expect(streamText.mock.calls.map(([o]) => o.model)).not.toContain("claude-sonnet-5");
  });

  it("conversation : solde suffisant mais tous les fournisseurs en panne → 503 « réessayez »", async () => {
    balance = 100_000;
    const { status, json } = await ask("Bonjour, as-tu une idée de titre pour mon livre ?");

    expect(status).toBe(503);
    expect(json.error).toContain("n'arrive pas à joindre ses modèles");
    expect(streamText).toHaveBeenCalledTimes(3);
  });

  it("modification de chapitre : même message quand le secours dépasse le solde", async () => {
    balance = 150;
    const { status, json } = await ask("Réécris le chapitre 1 avec un ton plus vivant");

    expect(status).toBe(402);
    expect(json.error).toContain("modèle de secours coûterait jusqu'à");
    expect(json.required).toBeGreaterThan(150);
    expect(generateObject.mock.calls.map(([o]) => o.model)).not.toContain("claude-sonnet-5");
  });
});
