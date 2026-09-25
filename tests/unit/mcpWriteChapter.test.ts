import { describe, it, expect, beforeEach } from "vitest";
import { MCP_COINS_PER_PAGE, WORDS_PER_PAGE, pagesFromWords } from "@/lib/ai/pricing";
import { writeChapterWithBilling } from "@/lib/mcp/writeChapter";
import { createFakeSupabase, IRIS_TABLES } from "./helpers/fakeSupabase";

const USER = "fa9b95b4-5d42-4e3a-b60d-c6e7d9e4f695";
const STRANGER = "bed73319-dfca-4606-b81e-aac1d70db9d5";
const BOOK = "09072ffb-50d0-493a-8e66-cfe0468a4bf6";

/** Texte brut de `words` mots, en paragraphes de 50 mots séparés par des retours. */
function prose(words: number): string {
  const lines: string[] = [];
  for (let i = 0; i < words; i += 50) {
    lines.push(Array.from({ length: Math.min(50, words - i) }, (_, k) => `mot${i + k}`).join(" "));
  }
  return lines.join("\n");
}

let fake = createFakeSupabase({ tables: IRIS_TABLES });

function setup(balance: number, options: Parameters<typeof createFakeSupabase>[0] = {}) {
  fake = createFakeSupabase({ tables: IRIS_TABLES, ...options });
  fake.table("projects").push({ id: BOOK, user_id: USER, title: "Orientation des jeunes à l'ère de l'IA", updated_at: "2026-09-22T11:36:49.000Z" });
  fake.table("wallets").push({ id: "w1", user_id: USER, balance });
}

const write = (content: string, chapterNumber = 2, userId = USER) =>
  writeChapterWithBilling(fake.client, userId, { bookId: BOOK, chapterNumber, title: "47 500 diplômés, et après ?", content });

describe("write_chapter via MCP — facturation", () => {
  beforeEach(() => setup(4000));

  it("débite les pages écrites au tarif MCP (bug : un livre entier écrit via MCP ne coûtait rien)", async () => {
    const result = await write(prose(600)); // 600 mots = 3 pages
    const pages = pagesFromWords(600);

    expect(result).toMatchObject({ status: "saved", created: true, pages, billedPages: pages, coinsCharged: pages * MCP_COINS_PER_PAGE });
    expect(fake.balanceOf(USER)).toBe(4000 - pages * MCP_COINS_PER_PAGE);
    expect(fake.debits()).toHaveLength(1);
    expect(fake.debits()[0].metadata).toMatchObject({ source: "mcp", project_id: BOOK, chapter_number: 2, billed_pages: pages });
  });

  it("enregistre un contenu au format du manuscrit, marqué terminé, et rafraîchit le projet", async () => {
    await write("Premier paragraphe.\nSecond paragraphe.");
    const chapter = fake.table("chapters")[0];

    expect(chapter.content).toBe("<hr data-page-break><h1>47 500 diplômés, et après ?</h1>\n<p>Premier paragraphe.</p>\n<p>Second paragraphe.</p>");
    // 6 mots de titre (« ? » isolé compris, comme les autres compteurs) + 4 mots de corps.
    expect(chapter).toMatchObject({ project_id: BOOK, number: 2, status: "Terminé", word_count: 10 });
    expect(fake.table("projects")[0].updated_at).not.toBe("2026-09-22T11:36:49.000Z");
  });

  it("réenregistrer le même chapitre (réessai du LLM) ne refacture rien", async () => {
    await write(prose(600));
    const again = await write(prose(600));

    expect(again).toMatchObject({ status: "saved", created: false, billedPages: 0, coinsCharged: 0 });
    expect(fake.debits()).toHaveLength(1);
  });

  it("allonger un chapitre ne facture que les pages ajoutées", async () => {
    await write(prose(600)); // 3 pages
    const longer = await write(prose(5 * WORDS_PER_PAGE)); // 5 pages

    expect(longer).toMatchObject({ billedPages: 2, coinsCharged: 2 * MCP_COINS_PER_PAGE });
  });

  it("solde insuffisant : rien n'est écrit ni débité", async () => {
    setup(10);
    const result = await write(prose(600));

    expect(result).toEqual({ status: "insufficient_funds", required: 3 * MCP_COINS_PER_PAGE, billedPages: 3, balance: 10 });
    expect(fake.table("chapters")).toHaveLength(0);
    expect(fake.balanceOf(USER)).toBe(10);
  });

  it("refuse d'écrire dans le livre d'un autre compte, sans rien débiter", async () => {
    fake.table("wallets").push({ id: "w2", user_id: STRANGER, balance: 4000 });
    const result = await write(prose(600), 2, STRANGER);

    expect(result).toEqual({ status: "not_found" });
    expect(fake.table("chapters")).toHaveLength(0);
    expect(fake.balanceOf(STRANGER)).toBe(4000);
  });

  it("rembourse si l'enregistrement échoue après le débit", async () => {
    setup(4000, { failWrites: { chapters: 1 } });
    const result = await write(prose(600));

    expect(result.status).toBe("error");
    expect(fake.balanceOf(USER)).toBe(4000);
    expect(fake.credits()).toHaveLength(1); // le remboursement
  });

  it("deux écritures simultanées du même chapitre ne facturent les pages qu'une fois", async () => {
    const [a, b] = await Promise.all([write(prose(600)), write(prose(600))]);

    expect([a.status, b.status]).toEqual(["saved", "saved"]);
    expect(fake.table("chapters")).toHaveLength(1);
    expect(4000 - fake.balanceOf(USER)).toBe(3 * MCP_COINS_PER_PAGE);
  });

  it("un chapitre vide (titre seul) ne coûte rien et reste en brouillon", async () => {
    const result = await write("");

    expect(result).toMatchObject({ status: "saved", coinsCharged: 0 });
    expect(fake.table("chapters")[0].status).toBe("Brouillon");
  });

  it("le premier chapitre du livre n'ouvre pas sur un saut de page", async () => {
    await write("Il était une fois.", 1);
    expect(fake.table("chapters")[0].content.startsWith("<h1>")).toBe(true);
  });
});
