import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { COVER_IMAGE_COINS, COVER_STANDARD_COINS } from "@/lib/ai/pricing";
import { sha256Hex } from "@/lib/mcp/hash";
import { createFakeSupabase, IRIS_TABLES } from "./helpers/fakeSupabase";

/**
 * Outil MCP `generate_cover`, à travers la vraie route /api/mcp.
 *
 * Bug corrigé : l'outil appelait /api/generate-cover par un fetch serveur sans
 * cookies, et cette route (qui exige une session) répondait 401 à chaque fois.
 * L'outil appelle désormais directement la logique partagée, avec l'identité
 * de la clé API — facturation et contrôle de propriété compris.
 */

let fake = createFakeSupabase({ tables: IRIS_TABLES });
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => new Proxy({}, { get: (_target, prop) => fake.client[prop as keyof typeof fake.client] }),
}));

// Direction artistique Gemini (SDK IA) : réponse déterministe, aucun appel réseau.
const generateText = vi.fn();
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: (...args: unknown[]) => generateText(...args),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: async () => ({ success: true, count: 1, resetTime: Date.now() + 60_000 }),
}));

const API_KEY = "iris_test_mcp_cover_key";
const USER = "bed73319-dfca-4606-b81e-aac1d70db9d5";
const STRANGER = "fa9b95b4-5d42-4e3a-b60d-c6e7d9e4f695";
const BOOK = "09072ffb-50d0-493a-8e66-cfe0468a4bf6";
const FOREIGN_BOOK = "11111111-2222-4333-8444-555555555555";
const IMAGE = Buffer.alloc(2048, 7);

let rpcId = 0;
const fetchMock = vi.fn();

async function callTool(name: string, args: Record<string, unknown>) {
  const { POST } = await import("@/app/api/mcp/route");
  const res = await POST(
    new Request("https://iris.test/api/mcp", {
      method: "POST",
      headers: {
        authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } }),
    })
  );
  const json = await res.json();
  const text: string = json?.result?.content?.[0]?.text ?? JSON.stringify(json);
  return { status: res.status, text, isError: !!json?.result?.isError };
}

describe("MCP generate_cover", () => {
  beforeEach(async () => {
    fake = createFakeSupabase({ tables: IRIS_TABLES });
    fake.table("api_keys").push({ id: "key1", user_id: USER, is_active: true, key_hash: await sha256Hex(API_KEY) });
    fake.table("wallets").push({ id: "w1", user_id: USER, balance: 1000 });
    fake.table("projects").push({ id: BOOK, user_id: USER, title: "Le chat aux pièces d'or", category: "Conte" });
    fake.table("projects").push({ id: FOREIGN_BOOK, user_id: STRANGER, title: "Livre d'un autre", cover_url: null });
    fake.table("ai_models").push({ model_id: "gemini-3.6-flash", input_cost_per_1m: 0.3, output_cost_per_1m: 2.5 });

    generateText.mockReset();
    generateText.mockResolvedValue({
      text: "A regal cat surrounded by glittering antique gold coins, golden hour lighting.",
      usage: { inputTokens: 400, outputTokens: 60 },
    });

    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes("generativelanguage.googleapis.com") && url.includes(":generateContent")) {
        return Response.json({
          candidates: [{ content: { parts: [{ inlineData: { data: IMAGE.toString("base64"), mimeType: "image/png" } }] } }],
        });
      }
      if (url.includes("pollinations")) {
        return new Response(IMAGE, { status: 200, headers: { "content-type": "image/jpeg" } });
      }
      return new Response("inattendu", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-google-key");
    vi.stubEnv("GOOGLE_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("POLLINATIONS_TOKEN", "");
    vi.stubEnv("HUGGINGFACE_API_KEY", "");
    vi.stubEnv("HF_TOKEN", "");
    vi.stubEnv("HUGGING_FACE_TOKEN", "");
    vi.stubEnv("HUGGINGFACE_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const calledUrls = () => fetchMock.mock.calls.map(([input]) => String(input instanceof Request ? input.url : input));

  it("standard : génère sans passer par /api/generate-cover, applique la couverture et débite le tarif standard", async () => {
    const result = await callTool("generate_cover", { book_id: BOOK });

    expect(result.isError).toBe(false);
    expect(result.text).toContain("Couverture générée et appliquée avec succès");
    expect(calledUrls().some((u) => u.includes("/api/generate-cover"))).toBe(false);

    const [storedPath] = Object.keys(fake.storage);
    expect(storedPath.startsWith(`covers/${USER}/${BOOK}-`)).toBe(true);
    expect(fake.table("projects").find((p) => p.id === BOOK)?.cover_url).toBe(`https://storage.test/${storedPath}`);

    // Plus de mode gratuit : forfait standard (direction artistique comprise).
    expect(fake.debits()).toHaveLength(1);
    expect(fake.debits()[0].description).toBe("Couverture standard (pollinations/flux)");
    expect(fake.balanceOf(USER)).toBe(1000 - COVER_STANDARD_COINS);
    expect(fake.table("ai_usage")).toContainEqual(
      expect.objectContaining({ user_id: USER, project_id: BOOK, action: "generate_cover_free" })
    );
  });

  it("crédit Gemini épuisé : la direction artistique passe par un autre fournisseur, pas la consigne brute en français", async () => {
    generateText.mockReset();
    generateText
      .mockRejectedValueOnce(new Error("Your prepayment credits are depleted"))
      .mockResolvedValueOnce({ text: "Healthy broiler chicks in a clean Cameroonian poultry house, warm morning light.", usage: {} });

    const result = await callTool("generate_cover", {
      book_id: BOOK,
      prompt: "Des poussins de poulets de chair dans un poulailler propre au Cameroun",
    });

    expect(result.isError).toBe(false);
    expect(generateText).toHaveBeenCalledTimes(2);
    const imageUrl = calledUrls().find((u) => u.includes("pollinations")) || "";
    expect(decodeURIComponent(imageUrl)).toContain("Healthy broiler chicks");
    expect(decodeURIComponent(imageUrl)).not.toContain("Des poussins");
  });

  it("premium : débite le forfait couverture au compte de la clé API", async () => {
    const result = await callTool("generate_cover", { book_id: BOOK, engine: "premium", prompt: "Un chat royal" });

    expect(result.isError).toBe(false);
    expect(result.text).toContain(`${COVER_IMAGE_COINS} pièces débitées`);
    expect(fake.balanceOf(USER)).toBe(1000 - COVER_IMAGE_COINS);
    expect(fake.debits()).toHaveLength(1);
    expect(fake.debits()[0].metadata).toMatchObject({ project_id: BOOK, flat_rate: true });
    expect(fake.table("projects").find((p) => p.id === BOOK)?.cover_url).toMatch(/^https:\/\/storage\.test\/covers\//);
  });

  it("premium avec solde insuffisant : rien n'est généré ni débité", async () => {
    fake.table("wallets")[0].balance = COVER_IMAGE_COINS - 1;
    const result = await callTool("generate_cover", { book_id: BOOK, engine: "premium" });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("Fonds insuffisants");
    expect(result.text).toContain("/pricing");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.debits()).toHaveLength(0);
    expect(fake.table("projects").find((p) => p.id === BOOK)?.cover_url).toBeUndefined();
  });

  it("standard avec solde insuffisant : rien n'est généré ni débité", async () => {
    fake.table("wallets")[0].balance = COVER_STANDARD_COINS - 1;
    const result = await callTool("generate_cover", { book_id: BOOK });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("Fonds insuffisants");
    expect(generateText).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.debits()).toHaveLength(0);
  });

  it("refuse le livre d'un autre compte, avant toute génération ou facturation", async () => {
    const result = await callTool("generate_cover", { book_id: FOREIGN_BOOK, engine: "premium" });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("Projet introuvable");
    expect(generateText).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.debits()).toHaveLength(0);
    expect(Object.keys(fake.storage)).toHaveLength(0);
    expect(fake.table("projects").find((p) => p.id === FOREIGN_BOOK)?.cover_url).toBeNull();
  });
});
