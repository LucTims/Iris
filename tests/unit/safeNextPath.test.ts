import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/auth/safeNextPath";

const origin = "https://iris.example";

describe("safeNextPath", () => {
  it("garde les chemins internes", () => {
    expect(safeNextPath("/projects?id=1#top", origin)).toBe("/projects?id=1#top");
    expect(safeNextPath("/redaction", origin)).toBe("/redaction");
  });

  it("refuse les redirections externes", () => {
    for (const bad of ["@evil.com", "//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", null]) {
      expect(safeNextPath(bad, origin)).toBe("/dashboard");
    }
  });
});
