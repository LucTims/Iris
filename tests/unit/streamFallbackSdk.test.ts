import { describe, it, expect } from "vitest";
import { streamText, simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { streamTextWithFallback } from "@/lib/ai/model-fallback";

// Vérifie le repli avec le VRAI `streamText` du SDK : c'est son comportement
// (erreur livrée dans le flux, flux de texte terminé vide) qui imposait le repli.
const failing = () =>
  new MockLanguageModelV4({
    doStream: async () => {
      throw new Error("Your prepayment credits are depleted");
    },
  });

const working = (deltas: string[]) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          ...deltas.map((delta) => ({ type: "text-delta", id: "t", delta })),
          { type: "text-end", id: "t" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage: {
              inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 5, text: 5, reasoning: 0 },
            },
          },
        ] as any,
      }),
    }),
  });

describe("Repli de fournisseur avec le vrai streamText", () => {
  it("une erreur de fournisseur fait basculer, et seul le fournisseur qui répond est facturé", async () => {
    const billed: string[] = [];
    const res = await streamTextWithFallback({
      preferred: "gemini-3.6-flash",
      start: async (modelId) =>
        streamText({
          model: modelId === "gemini-3.6-flash" ? failing() : working(["Bon", "jour"]),
          prompt: "Salut",
          onError: () => {},
          onFinish: ({ text }) => {
            if (text) billed.push(modelId);
          },
        }),
    });
    expect(res.modelUsed).toBe("gpt-4o-mini");
    const reader = res.textStream.getReader();
    let out = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      out += value;
    }
    await res.done;
    expect(out).toBe("Bonjour");
    expect(billed).toEqual(["gpt-4o-mini"]);
  });
});
