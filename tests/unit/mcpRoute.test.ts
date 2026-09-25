import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCP_COINS_PER_PAGE } from "@/lib/ai/pricing";
import { sha256Hex } from "@/lib/mcp/hash";
import { createFakeSupabase, IRIS_TABLES } from "./helpers/fakeSupabase";

/**
 * Parcours complet d'un LLM connecté en MCP, à travers la vraie route
 * /api/mcp (JSON-RPC) : création du livre, écriture de chapitres en texte
 * brut, puis export PDF réellement composé par pdfmake.
 */

let fake = createFakeSupabase({ tables: IRIS_TABLES });
// Délègue toujours au faux client COURANT : lib/mcp/auth garde en cache le
// premier client créé, qui doit suivre la réinitialisation entre les tests.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => new Proxy({}, { get: (_target, prop) => fake.client[prop as keyof typeof fake.client] }),
}));

const API_KEY = "iris_test_mcp_key";
const USER = "bed73319-dfca-4606-b81e-aac1d70db9d5";
let rpcId = 0;

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

describe("MCP de bout en bout : un LLM écrit puis exporte un livre", () => {
  beforeEach(async () => {
    fake = createFakeSupabase({ tables: IRIS_TABLES });
    fake.table("api_keys").push({ id: "key1", user_id: USER, is_active: true, key_hash: await sha256Hex(API_KEY) });
    fake.table("wallets").push({ id: "w1", user_id: USER, balance: 1000 });
  });

  it("les pièces sont débitées à l'écriture et l'export PDF contient ce qui a été écrit", async () => {
    const created = await callTool("create_book", {
      title: "Orientation des jeunes à l'ère de l'IA",
      category: "Guide pratique",
      work_type: "guide",
    });
    expect(created.isError).toBe(false);
    const bookId = created.text.match(/id: ([0-9a-f-]{36})/)?.[1];
    expect(bookId).toBeDefined();
    expect(fake.table("projects")[0]).toMatchObject({ work_type: "guide", blueprint_id: "guide" });

    const paragraph = "Chaque juillet, dans les grandes villes comme dans les petites, la même scène se répète. ".repeat(20);
    const chapter1 = await callTool("write_chapter", {
      book_id: bookId,
      chapter_number: 1,
      title: "Avant-propos",
      content: `${paragraph}\n\nCe qu'il faut retenir :\n- Un premier point.\n- Un second point.`,
    });
    expect(chapter1.isError).toBe(false);
    expect(chapter1.text).toMatch(/Chapitre 1 créé : \d+ mots/);
    expect(chapter1.text).toContain(`${2 * MCP_COINS_PER_PAGE} pièces débitées`);

    const chapter2 = await callTool("write_chapter", {
      book_id: bookId,
      chapter_number: 2,
      title: "47 500 diplômés, et après ?",
      content: `## Un constat\n\n${paragraph}`,
    });
    expect(chapter2.isError).toBe(false);
    expect(fake.balanceOf(USER)).toBe(1000 - 4 * MCP_COINS_PER_PAGE);

    const listing = await callTool("list_chapters", { book_id: bookId });
    expect(listing.text).toContain("Position 2 : 47 500 diplômés, et après ?");

    const exported = await callTool("export_pdf", { book_id: bookId });
    expect(exported.isError).toBe(false);
    expect(exported.text).toContain("PDF exporté avec succès");
    expect(exported.text).toContain("2 chapitre(s)");

    const [file] = Object.values(fake.storage);
    expect(file.contentType).toBe("application/pdf");
    expect(Buffer.from(file.body).subarray(0, 5).toString()).toBe("%PDF-");
  }, 60_000);

  it("solde insuffisant : l'outil l'explique au LLM et n'écrit rien", async () => {
    fake.table("wallets")[0].balance = 5;
    fake.table("projects").push({ id: "11111111-2222-4333-8444-555555555555", user_id: USER, title: "Livre" });

    const result = await callTool("write_chapter", {
      book_id: "11111111-2222-4333-8444-555555555555",
      chapter_number: 1,
      title: "Chapitre 1",
      content: "mot ".repeat(400),
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("Solde insuffisant");
    expect(result.text).toContain("/pricing");
    expect(fake.table("chapters")).toHaveLength(0);
  });

  it("une clé API inconnue est refusée", async () => {
    fake.table("api_keys").length = 0;
    const result = await callTool("list_projects", {});
    expect(result.status).toBe(401);
  });
});
