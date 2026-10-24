"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bookFontPairing, detectGenre } from "@/lib/ai/book-style";
import { resolveWorkType, workTypeLayout } from "@/lib/book/work-type";
import { cssFamilyForPdfKey } from "@/lib/export/fontRegistry";
import { pageFormatDef, sanitizeExportStyle, type ExportStyle } from "@/lib/export/exportStyle";
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
  onToggleToc: (include: boolean) => void;
}

interface Pagination {
  chapters: { startPage: number | null; sections: { page: number | null }[] }[];
}

const COLLAPSE_KEY = "iris-front-matter-collapsed";

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
  onToggleToc,
}: BookFrontMatterProps) {
  const style: ExportStyle = useMemo(() => sanitizeExportStyle(styleSettings), [styleSettings]);
  const workType = resolveWorkType({ explicit: workTypeInput, category, title });
  const layout = workTypeLayout(workType, detectGenre(category));
  const includeToc = resolveIncludeToc(style, workType);
  const page = pageFormatDef(style.pageFormat || "a4");
  const pairing = bookFontPairing(category);
  const bodyFamily = cssFamilyForPdfKey(style.bodyFont || pairing.body);
  const displayFamily = cssFamilyForPdfKey(style.headingFont || pairing.display);
  const accent = style.accentColor || "#b08d57";

  const entries = useMemo(() => bookTocEntries(chapters, workType), [chapters, workType]);
  const heading = useMemo(() => tocHeading(chapters), [chapters]);

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch {}
      return !c;
    });
  };

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
    if (firstRun.current || collapsed || !includeToc || entries.length === 0) return;
    firstRun.current = true;
    computePageNumbers();
  }, [collapsed, includeToc, entries.length, computePageNumbers]);

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

  const pageNo = (n: number | null | undefined) =>
    n ? <span className="tabular-nums">{n}</span> : <span className="text-neutral-300">{paginating ? "…" : "–"}</span>;

  return (
    <div className="w-full flex flex-col gap-4 mb-6">
      <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="material-symbols-outlined text-2xl text-secondary shrink-0">auto_stories</span>
          <div className="min-w-0">
            <p className="font-heading font-extrabold text-sm text-neutral-900">Pages de début du livre</p>
            <p className="text-xs text-neutral-500 leading-snug">
              Telles qu&apos;elles figureront dans le livre exporté{includeToc ? ", sommaire compris" : ""}. Elles se mettent à jour avec vos chapitres et la fiche du livre.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={onEditInfo} className="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-base">menu_book</span>Fiche du livre
          </button>
          {workType !== "storybook" && (
            <label className="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeToc}
                onChange={(e) => onToggleToc(e.target.checked)}
                className="accent-orange-500 w-4 h-4"
              />
              Sommaire
            </label>
          )}
          <button type="button" onClick={toggleCollapsed} className="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700">
            {collapsed ? "Afficher" : "Masquer"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
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
                  const sections = entries.length > 14 ? [] : e.sections.slice(0, 8);
                  return (
                    <div key={`${e.fullTitle}-${i}`} style={{ marginBottom: pt(12) }}>
                      {e.label && (
                        <p style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: pt(8), fontWeight: 700, letterSpacing: pt(1.6), color: accent, textTransform: "uppercase" }}>
                          {e.label}
                        </p>
                      )}
                      <div className="flex justify-between gap-4" style={{ fontFamily: `'${displayFamily}', Georgia, serif`, fontSize: pt(compact ? 11 : 12), fontWeight: 700 }}>
                        <span>{e.title}</span>
                        {pageNo(pg?.startPage)}
                      </div>
                      {sections.map((s, k) => (
                        <div key={`${s}-${k}`} className="flex justify-between gap-4" style={{ fontSize: pt(compact ? 9.5 : 10.5), color: "#555", paddingLeft: pt(16), marginTop: pt(2) }}>
                          <span>{s}</span>
                          {pageNo(pg?.sections[k]?.page)}
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={computePageNumbers}
                    disabled={paginating}
                    className="text-[11px] font-bold text-neutral-500 hover:text-secondary disabled:opacity-50 flex items-center gap-1"
                  >
                    <span className={`material-symbols-outlined text-sm ${paginating ? "animate-spin" : ""}`}>{paginating ? "progress_activity" : "refresh"}</span>
                    {paginating ? "Calcul des numéros de page…" : paginationStale || !pagination ? "Mettre à jour les numéros de page" : "Numéros de page à jour"}
                  </button>
                </div>
              </div>,
              "toc",
              { height: "auto" }
            )}
        </>
      )}
    </div>
  );
}
