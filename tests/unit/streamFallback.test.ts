import { describe, it, expect } from "vitest";
import { streamTextWithFallback, type FallbackStreamPart } from "@/lib/ai/model-fallback";

/** Flux factice imitant `streamText(...).stream`. */
const fakeStream = (parts: FallbackStreamPart[]) => ({
  stream: (async function* () {
    for (const p of parts) yield p;
  })(),
});

const readAll = async (stream: ReadableStream<string>) => {
  let out = "";
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) return out;
    out += value;
  }
};

describe("Réponse en flux avec repli de fournisseur", () => {
  it("bascule quand le premier fournisseur renvoie une erreur (crédit épuisé)", async () => {
    const tried: string[] = [];
    const res = await streamTextWithFallback({
      preferred: "gemini-3.6-flash",
      start: async (modelId) => {
        tried.push(modelId);
        if (modelId === "gemini-3.6-flash") {
          return fakeStream([{ type: "start" }, { type: "error", error: new Error("Your prepayment credits are depleted") }]);
        }
        return fakeStream([{ type: "text-delta", text: "Bon" }, { type: "text-delta", text: "jour" }, { type: "finish" }]);
      },
    });
    expect(tried).toEqual(["gemini-3.6-flash", "gpt-4o-mini"]);
    expect(res.modelUsed).toBe("gpt-4o-mini");
    expect(res.errors[0]).toContain("prepayment credits are depleted");
    expect(await readAll(res.textStream)).toBe("Bonjour");
    await res.done;
  });

  it("un flux qui se termine sans texte compte comme un échec", async () => {
    const res = await streamTextWithFallback({
      preferred: "gemini-3.6-flash",
      start: async (modelId) =>
        modelId === "claude-sonnet-5" ? fakeStream([{ type: "text-delta", text: "OK" }]) : fakeStream([{ type: "finish" }]),
    });
    expect(res.modelUsed).toBe("claude-sonnet-5");
    expect(await readAll(res.textStream)).toBe("OK");
  });

  it("passe un modèle que `start` refuse (solde insuffisant pour ce modèle)", async () => {
    const res = await streamTextWithFallback({
      preferred: "gemini-3.6-flash",
      start: async (modelId) => {
        if (modelId === "gemini-3.6-flash") return fakeStream([{ type: "error", error: "panne" }]);
        if (modelId === "gpt-4o-mini") return null;
        return fakeStream([{ type: "text-delta", text: "Claude" }]);
      },
    });
    expect(res.modelUsed).toBe("claude-sonnet-5");
    expect(res.errors).toContain("gpt-4o-mini: ignoré");
  });

  it("lève une erreur si aucun fournisseur ne produit de texte", async () => {
    await expect(
      streamTextWithFallback({
        preferred: "gemini-3.6-flash",
        start: async () => fakeStream([{ type: "error", error: "panne" }]),
      })
    ).rejects.toThrow("Tous les fournisseurs IA ont échoué");
  });

  it("termine la génération côté serveur si le client coupe avant la fin", async () => {
    let finished = false;
    const res = await streamTextWithFallback({
      preferred: "gemini-3.6-flash",
      start: async () => ({
        stream: (async function* () {
          yield { type: "text-delta", text: "a" } as FallbackStreamPart;
          yield { type: "text-delta", text: "b" } as FallbackStreamPart;
          yield { type: "text-delta", text: "c" } as FallbackStreamPart;
          finished = true;
        })(),
      }),
    });
    const reader = res.textStream.getReader();
    expect((await reader.read()).value).toBe("a");
    await reader.cancel();
    await res.done;
    expect(finished).toBe(true);
  });
});
