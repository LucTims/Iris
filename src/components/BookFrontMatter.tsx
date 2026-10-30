"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bookFontPairing, detectGenre } from "@/lib/ai/book-style";
import { resolveWorkType, workTypeLayout } from "@/lib/book/work-type";
import { cssFamilyForPdfKey } from "@/lib/export/fontRegistry";
import { pageFormatDef, sanitizeExportStyle, tocKey, type ExportStyle, type TocOverride } from "@/lib/export/exportStyle";
import { bookTocEntries, copyrightNotice, resolveIncludeToc, tocHeading } from "@/lib/export/bookStructure";

interface FrontMatterChapter {
  id?: string | number;
  number?: number;
  title: string;
  content: string;
}

interface BookFrontMatterProps {
  title: string;
  subtitle?: string | null;
  author?: string | null;
  category?: string | null;
  workType?: string | null;
  coverUrl?: string | null;
  styleSettings?: unknown;
  chapters: FrontMatterChapter[];
  onEditInfo: () => void;
  /** Enregistre les corrections du sommaire (null = sommaire automatique). */
  onSaveTocOverrides: (overrides: Record<string, TocOverride> | null) => void;
}

interface Pagination {
  chapters: { startPage: number | null; sections: { page: number | null }[] }[];
}


/**
 * Pages de début du livre (page de titre, mentions légales, sommaire), rendues
 * dans l'éditeur exactement comme à l'export : mêmes textes, même sommaire
 * (chapitres + intertitres), même format de page, mêmes polices et couleur.
 * Les numéros de page viennent du moteur d'export lui-même.
 */
export default function BookFrontMatter({
  title,
  subtitle,
  author,
  category,
  workType: workTypeInput,
  coverUrl,
  styleSettings,
  chapters,
  onEditInfo,
  onSaveTocOverrides,
}: BookFrontMatterProps) {
  const style: ExportStyle = useMemo(() => sanitizeExportStyle(styleSettings), [styleSettings]);
  const workType = resolveWorkType({ explicit: workTypeInput, category, title });
  const layout = workTypeLayout(workType, detectGenre(category));
  const includeToc = resolveIncludeToc(style, workType, chapters);
  const page = pageFormatDef(style.pageFormat || "a4");
  const pairing = bookFontPairing(category);
  const bodyFamily = cssFamilyForPdfKey(style.bodyFont || pairing.body);
  const displayFamily = cssFamilyForPdfKey(style.headingFont || pairing.display);
  const accent = style.accentColor || "#b08d57";

  const entries = useMemo(() => bookTocEntries(chapters, workType), [chapters, workType]);
  const heading = useMemo(() => tocHeading(chapters), [chapters]);

  // Corrections du sommaire saisies par l'auteur, enregistrées à la sortie du champ.
  const [overrides, setOverrides] = useState<Record<string, TocOverride>>(style.tocOverrides || {});
  const savedOverrides = JSON.stringify(style.tocOverrides || {});
  useEffect(() => {
    setOverrides(JSON.parse(savedOverrides));
  }, [savedOverrides]);
  const editOverride = (key: string, patch: TocOverride) => {
    setOverrides((prev) => {
      const merged: TocOverride = { ...(prev[key] || {}), ...patch };
      (Object.keys(merged) as (keyof TocOverride)[]).forEach((k) => merged[k] === undefined && delete merged[k]);
      const next = { ...prev };
      if (Object.keys(merged).length) next[key] = merged;
      else delete next[key];
      return next;
    });
  };
  const commitOverrides = () => {
    if (JSON.stringify(overrides) === savedOverrides) return;
    onSaveTocOverrides(Object.keys(overrides).length ? overrides : null);
  };
  const resetOverrides = () => {
    setOverrides({});
    onSaveTocOverrides(null);
  };
  const hasOverrides = Object.keys(overrides).length > 0;

  // Numéros de page : calculés par le moteur d'export (mise en page réelle).
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [paginating, setPaginating] = useState(false);
  const [paginationStale, setPaginationStale] = useState(false);
  const latest = useRef({ title, subtitle, author, category, workTypeInput, coverUrl, chapters, style, includeToc });
  useEffect(() => {
    latest.current = { title, subtitle, author, category, workTypeInput, coverUrl, chapters, style, includeToc };
  });

  const computePageNumbers = useCallback(async () => {
    const p = latest.current;
    if (!p.includeToc || p.chapters.length === 0) return;
    setPaginating(true);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layoutOnly: true,
          title: p.title,
          subtitle: p.subtitle,
          author: p.author,
          category: p.category,
          workType: p.workTypeInput,
          coverUrl: p.coverUrl,
          style: { ...p.style, includeToc: true },
          chapters: p.chapters.map((c, i) => ({ title: c.title, number: c.number ?? i + 1, content: c.content || "" })),
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.layout?.chapters) {
        setPagination({ chapters: data.layout.chapters });
        setPaginationStale(false);
      }
    } catch {
      // Les numéros de page restent simplement absents.
    } finally {
      setPaginating(false);
    }
  }, []);

  // Premier calcul à l'ouverture ; ensuite à la demande (chaque calcul compose le livre entier).
  const firstRun = useRef(false);
  useEffect(() => {
    if (firstRun.current || !includeToc || entries.length === 0) return;
    firstRun.current = true;
    computePageNumbers();
  }, [includeToc, entries.length, computePageNumbers]);

  const signature = useMemo(
    () => JSON.stringify([entries, style.pageFormat, style.bodyFont, style.headingFont, author, subtitle, !!coverUrl]),
    [entries, style.pageFormat, style.bodyFont, style.headingFont, author, subtitle, coverUrl]
  );
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (pagination && signature !== lastSignature.current) setPaginationStale(true);
    lastSignature.current = signature;
  }, [signature, pagination]);

  // 1 pt d'export = 100cqw / largeur de page : les feuilles gardent les proportions réelles.
  const pt = (n: number) => `calc(${n} * 100cqw / ${page.width})`;
  const margin = page.trim ? (page.width <= 420 ? 50 : 58) : 72;
  const compact = page.width <= 420;

  const sheet = (children: React.ReactNode, key: string, extra?: React.CSSProperties) => (
    <div key={key} className="w-full" style={{ containerType: "inline-size" }}>
      <div
        className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-neutral-200 w-full"
        style={{ aspectRatio: `${page.width} / ${page.height}`, padding: `${pt(page.trim ? 64 : 80)} ${pt(margin)}`, fontFamily: `'${bodyFamily}', Georgia, serif`, color: "#1a1a1a", ...extra }}
      >
        {children}
      </div>
    </div>
  );

  // Champ de sommaire modifiable, à l'apparence du texte imprimé.
  const field = "bg-transparent border-0 outline-none rounded-sm hover:bg-orange-50 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 p-0 m-0 w-full";
  const pageInput = (key: string, computed: number | null | undefined, fontSize: string) => {
    const forced = overrides[key]?.page;
    return (
      <input
        type="text"
        inputMode="numeric"
        aria-label="Numéro de page"
        title={forced ? "Numéro de page corrigé à la main" : "Numéro de page calculé (cliquez pour corriger)"}
        value={forced ?? computed ?? ""}
        placeholder={paginating ? "…" : "–"}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
          const n = v ? parseInt(v, 10) : undefined;
          editOverride(key, { page: n && n !== computed ? n : undefined });
        }}
        onBlur={commitOverrides}
        className={`${field} text-right tabular-nums shrink-0 ${forced ? "text-secondary" : ""}`}
        style={{ width: pt(44), fontSize, fontFamily: "inherit", fontWeight: "inherit", color: forced ? undefined : "inherit" }}
      />
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 mb-6">
          {sheet(
            <div className="h-full flex flex-col items-center text-center" style={{ paddingTop: pt(page.height * 0.24) }}>
              <p style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: pt(compact ? 24 : 30), fontWeight: 700, letterSpacing: pt(1), lineHeight: 1.2, textTransform: "uppercase" }}>
                {title || "Sans titre"}
              </p>
              {subtitle ? (
                <p style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: pt(compact ? 13 : 15), fontStyle: "italic", color: "#666", marginTop: pt(10) }}>{subtitle}</p>
              ) : (
                <button type="button" onClick={onEditInfo} className="mt-3 text-[11px] font-bold text-neutral-400 border border-dashed border-neutral-300 rounded-lg px-2 py-1 hover:text-secondary">+ Ajouter un sous-titre</button>
              )}
              {layout.ornaments && <p style={{ color: accent, fontSize: pt(18), marginTop: pt(30) }}>❦</p>}
              {author ? (
                <p style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: pt(compact ? 12 : 14), letterSpacing: pt(1.5), color: "#333", marginTop: pt(layout.ornaments ? 40 : 60) }}>{author}</p>
              ) : (
                <button type="button" onClick={onEditInfo} className="mt-6 text-[11px] font-bold text-neutral-400 border border-dashed border-neutral-300 rounded-lg px-2 py-1 hover:text-secondary">+ Ajouter le nom de l&apos;auteur</button>
              )}
            </div>,
            "title"
          )}

          {layout.copyrightPage &&
            sheet(
              <div className="h-full flex flex-col items-center text-center" style={{ paddingTop: pt(page.height * 0.45) }}>
                <p style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: pt(14), color: "#333" }}>{title || "Sans titre"}</p>
                <p style={{ fontSize: pt(9), color: "#888", marginTop: pt(12), lineHeight: 1.4, whiteSpace: "pre-line" }}>{copyrightNotice(author)}</p>
              </div>,
              "copyright"
            )}

          {includeToc &&
            entries.length > 0 &&
            sheet(
              <div>
                <p className="text-center" style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: pt(compact ? 18 : 22), fontWeight: 700, margin: `${pt(30)} 0 ${pt(26)}` }}>
                  {heading}
                </p>
                {entries.map((e, i) => {
                  const pg = pagination?.chapters[i];
                  const key = tocKey(i);
                  const o = overrides[key] || {};
                  const label = o.label !== undefined ? o.label : e.label || "";
                  const sections = entries.length > 14 ? [] : e.sections.slice(0, 8);
                  const titleSize = pt(compact ? 11 : 12);
                  return (
                    <div key={`${e.fullTitle}-${i}`} style={{ marginBottom: pt(12) }}>
                      <input
                        aria-label="Étiquette du chapitre"
                        value={label}
                        placeholder={e.label ? "" : "+ étiquette"}
                        onChange={(ev) => editOverride(key, { label: ev.target.value === (e.label || "") ? undefined : ev.target.value })}
                        onBlur={commitOverrides}
                        className={`${field} placeholder:text-neutral-200`}
                        style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: pt(8), fontWeight: 700, letterSpacing: pt(1.6), color: accent, textTransform: "uppercase" }}
                      />
                      <div className="flex justify-between gap-4" style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: titleSize, fontWeight: 700 }}>
                        <input
                          aria-label="Titre du chapitre"
                          value={o.title ?? e.title}
                          onChange={(ev) => editOverride(key, { title: ev.target.value === e.title ? undefined : ev.target.value })}
                          onBlur={commitOverrides}
                          className={field}
                          style={{ fontSize: titleSize, fontFamily: "inherit", fontWeight: "inherit" }}
                        />
                        {pageInput(key, pg?.startPage, titleSize)}
                      </div>
                      {sections.map((s, k) => {
                        const sk = tocKey(i, k);
                        const so = overrides[sk] || {};
                        const sectionSize = pt(compact ? 9.5 : 10.5);
                        return (
                          <div key={`${s}-${k}`} className="flex justify-between gap-4" style={{ fontSize: sectionSize, color: "#555", paddingLeft: pt(16), marginTop: pt(2) }}>
                            <input
                              aria-label="Intertitre"
                              value={so.title ?? s}
                              onChange={(ev) => editOverride(sk, { title: ev.target.value === s ? undefined : ev.target.value })}
                              onBlur={commitOverrides}
                              className={field}
                              style={{ fontSize: sectionSize, fontFamily: "inherit", color: "inherit" }}
                            />
                            {pageInput(sk, pg?.sections[k]?.page, sectionSize)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <p className="text-center text-[11px] text-neutral-400 pt-1">
                  Cliquez sur un titre ou un numéro de page pour le corriger. Les corrections sont reprises à l&apos;export.
                </p>
                <div className="flex justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={computePageNumbers}
                    disabled={paginating}
                    className="text-[11px] font-bold text-neutral-500 hover:text-secondary disabled:opacity-50 flex items-center gap-1"
                  >
                    <span className={`material-symbols-outlined text-sm ${paginating ? "animate-spin" : ""}`}>{paginating ? "progress_activity" : "refresh"}</span>
                    {paginating ? "Calcul des numéros de page…" : paginationStale || !pagination ? "Mettre à jour les numéros de page" : "Numéros de page à jour"}
                  </button>
                  {hasOverrides && (
                    <button type="button" onClick={resetOverrides} className="text-[11px] font-bold text-neutral-500 hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">restart_alt</span>
                      Revenir au sommaire automatique
                    </button>
                  )}
                </div>
              </div>,
              "toc",
              { height: "auto" }
            )}
    </div>
  );
}
