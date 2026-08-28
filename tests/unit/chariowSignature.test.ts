import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyChariowSignature } from "@/lib/payments/chariowSignature";

function sign(body: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyChariowSignature", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ event: "successful.sale", sale: { id: "sal_123" } });

  it("accepts a correctly signed body", () => {
    expect(verifyChariowSignature(body, secret, sign(body, secret))).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    expect(verifyChariowSignature(body, secret, sign(body, "wrong_secret"))).toBe(false);
  });

  it("rejects a body tampered with after signing (amount changed)", () => {
    const validSignature = sign(body, secret);
    const tamperedBody = JSON.stringify({ event: "successful.sale", sale: { id: "sal_999" } });
    expect(verifyChariowSignature(tamperedBody, secret, validSignature)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyChariowSignature(body, secret, null)).toBe(false);
    expect(verifyChariowSignature(body, secret, undefined)).toBe(false);
    expect(verifyChariowSignature(body, secret, "")).toBe(false);
  });

  it("rejects a missing secret", () => {
    expect(verifyChariowSignature(body, "", sign(body, secret))).toBe(false);
  });

  it("never throws on a malformed/short signature (would crash timingSafeEqual on mismatched lengths)", () => {
    expect(() => verifyChariowSignature(body, secret, "sha256=deadbeef")).not.toThrow();
    expect(verifyChariowSignature(body, secret, "sha256=deadbeef")).toBe(false);
  });
});
