import { describe, it, expect, vi, afterEach } from "vitest";
import JSZip from "jszip";
import { embedRemoteImages, generateDocx } from "@/lib/export/generateDocx";

// PNG 1×1 transparent.
const PNG_BYTES = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0)
);

function imageResponse(contentType = "image/png") {
  return new Response(PNG_BYTES.slice(), { status: 200, headers: { "content-type": contentType } });
}

afterEach(() => vi.unstubAllGlobals());

describe("embedRemoteImages", () => {
  it("remplace les images https par des data URIs", async () => {
    const fetchMock = vi.fn(async () => imageResponse());
    const html = '<p>Texte</p><img src="https://cdn.test/a.png" width="300" data-align="left"><img src="https://cdn.test/a.png">';
    const out = await embedRemoteImages(html, fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out).not.toContain("https://cdn.test/a.png");
    expect(out.match(/src="data:image\/png;base64,/g)).toHaveLength(2);
    expect(out).toContain('data-align="left"');
  });

  it("laisse l'image telle quelle si elle est injoignable", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
    const html = '<img src="https://cdn.test/missing.png">';
    expect(await embedRemoteImages(html, fetchMock as unknown as typeof fetch)).toBe(html);
  });
});

describe("generateDocx", () => {
  it("embarque les images envoyées depuis l'éditeur", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => imageResponse()));
    const blob = await generateDocx("Titre", undefined, [
      { title: "Chapitre 1", number: 1, content: '<p>Avant</p><img src="https://cdn.test/photo.png" width="320" data-align="right"><p>Après</p>' },
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const media = Object.keys(zip.files).filter((f) => f.startsWith("word/media/") && !f.endsWith("/"));
    expect(media.length).toBe(1);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('w:jc w:val="right"');
  });
});
