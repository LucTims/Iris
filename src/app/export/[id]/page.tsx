"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import { saveAs } from "file-saver";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";
import { LayoutTemplate, Settings2, Download, BookOpen, Ruler } from "lucide-react";
import {
  KDP_TRIMS,
  KDP_FONTS,
  DEFAULT_KDP_SETTINGS,
  getTrim,
  estimatePages,
  gutterInches,
  type KdpSettings,
} from "@/lib/export/kdp";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Chapter {
  title: string;
  content: string;
  number: number;
}

export default function ExportEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { displayName } = useUser();
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;

  const [projectTitle, setProjectTitle] = useState("Chargement…");
  const [projectSubtitle, setProjectSubtitle] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const LS_KEY = `iris_kdp_settings_${projectId}`;
  const [settings, setSettings] = useState<KdpSettings>(DEFAULT_KDP_SETTINGS);

  // Charge le projet + ses chapitres réels.
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Projet introuvable.");
        setProjectTitle(data.project?.title || "Sans titre");
        setProjectSubtitle(data.project?.subtitle || "");
        const chs: Chapter[] = (data.chapters || [])
          .sort((a: any, b: any) => (a.number || 0) - (b.number || 0))
          .map((c: any) => ({ title: c.title, content: c.content || "", number: c.number }));
        setChapters(chs);
        setSettings((s) => ({ ...s, author: s.author || displayName || "" }));
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Mémorise les réglages par projet.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setSettings((s) => ({ ...s, ...JSON.parse(saved) }));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const set = <K extends keyof KdpSettings>(key: K, value: KdpSettings[K]) =>
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });

  const wordCount = useMemo(
    () =>
      chapters.reduce((sum, ch) => {
        const plain = (ch.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        return sum + (plain ? plain.split(" ").length : 0);
      }, 0),
    [chapters]
  );

  const trim = getTrim(settings.trim);
  const estPages = estimatePages(wordCount, trim);
  const gutter = gutterInches(estPages);

  const handleExport = async () => {
    if (chapters.length === 0) {
      setError("Ce livre n'a aucun chapitre à exporter.");
      return;
    }
    setIsExporting(true);
    setError("");
    try {
      const res = await fetch("/api/export/kdp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          subtitle: projectSubtitle,
          author: settings.author,
          chapters,
          trim: settings.trim,
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize,
          lineHeight: settings.lineHeight,
          includeTitlePage: settings.includeTitlePage,
          includeCopyright: settings.includeCopyright,
          copyrightYear: settings.copyrightYear,
          includeToc: settings.includeToc,
          pageNumbers: settings.pageNumbers,
        }),
      });
      if (!res.ok) {
        let msg = "L'export KDP a échoué.";
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const safe = (projectTitle || "livre").replace(/[^a-z0-9\-_ ]/gi, "").trim() || "livre";
      saveAs(blob, `${safe} - KDP.pdf`);
    } catch (e: any) {
      setError(e?.message || "L'export a échoué.");
    } finally {
      setIsExporting(false);
    }
  };

  const previewFont = KDP_FONTS.find((f) => f.id === settings.fontFamily)?.serif ? "Georgia, serif" : "system-ui, sans-serif";
  const firstBody = chapters.find((c) => !/sommaire|table des mati/i.test(c.title || ""))?.content || chapters[0]?.content || "";

  return (
    <div className="bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/export" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Hub</span>
            </Link>
            <h1 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-900 flex items-center gap-2 truncate">
              <LayoutTemplate className="w-5 h-5 text-secondary shrink-0" strokeWidth={2} />
              <span className="truncate">Studio KDP — {projectTitle}</span>
            </h1>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting || loading}
            className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isExporting ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">{isExporting ? "Génération…" : "Télécharger le PDF KDP"}</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
          {error && (
            <div className="lg:col-span-12 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Colonne réglages */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* Format */}
            <section className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
              <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-secondary" strokeWidth={1.5} /> Format d'impression
              </h2>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Taille de coupe (trim)</label>
                <select value={settings.trim} onChange={(e) => set("trim", e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-secondary">
                  {KDP_TRIMS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Police</label>
                  <select value={settings.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-secondary">
                    {KDP_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Corps ({settings.fontSize} pt)</label>
                  <input type="range" min={9} max={14} step={0.5} value={settings.fontSize} onChange={(e) => set("fontSize", Number(e.target.value))} className="w-full accent-secondary mt-3" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Interligne ({settings.lineHeight})</label>
                <input type="range" min={1.1} max={1.8} step={0.05} value={settings.lineHeight} onChange={(e) => set("lineHeight", Number(e.target.value))} className="w-full accent-secondary" />
              </div>
            </section>

            {/* Pages liminaires */}
            <section className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3">
              <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" strokeWidth={1.5} /> Pages du livre
              </h2>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Auteur (page de titre & copyright)</label>
                <input value={settings.author} onChange={(e) => set("author", e.target.value)} placeholder="Nom de l'auteur" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-secondary" />
              </div>
              {[
                { k: "includeTitlePage" as const, label: "Page de titre" },
                { k: "includeCopyright" as const, label: "Page de copyright" },
                { k: "includeToc" as const, label: "Table des matières" },
                { k: "pageNumbers" as const, label: "Numéros de page" },
              ].map((row) => (
                <label key={row.k} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <span className="text-sm font-medium text-neutral-800">{row.label}</span>
                  <input type="checkbox" checked={settings[row.k] as boolean} onChange={(e) => set(row.k, e.target.checked as any)} className="accent-secondary w-4 h-4" />
                </label>
              ))}
              {settings.includeCopyright && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Année du copyright</label>
                  <input value={settings.copyrightYear} onChange={(e) => set("copyrightYear", e.target.value)} className="w-28 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary" />
                </div>
              )}
            </section>

            {/* Résumé conformité KDP */}
            <section className="bg-neutral-900 text-white p-5 rounded-3xl space-y-2.5">
              <h2 className="font-heading font-extrabold text-sm flex items-center gap-2">
                <Ruler className="w-4 h-4 text-orange-400" strokeWidth={2} /> Prêt pour KDP
              </h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info label="Format" value={trim.label.replace(/ —.*/, "")} />
                <Info label="Pages estimées" value={loading ? "…" : `~ ${estPages}`} />
                <Info label="Marge reliure" value={`${gutter}"`} />
                <Info label="Mots" value={loading ? "…" : wordCount.toLocaleString("fr-FR")} />
              </div>
              <p className="text-[11px] text-neutral-400 leading-snug pt-1">
                Marge de reliure calculée automatiquement selon le nombre de pages (norme KDP). Vérifiez toujours l'aperçu dans le prévisualiseur KDP avant publication.
              </p>
            </section>
          </div>

          {/* Aperçu */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="sticky top-4">
              <div className="text-xs font-bold text-neutral-500 uppercase mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">visibility</span> Aperçu (indicatif — le PDF fait foi)
              </div>
              <div className="bg-neutral-100 rounded-3xl p-4 sm:p-8 flex justify-center">
                <div
                  className="bg-white shadow-xl overflow-hidden"
                  style={{ width: 360, aspectRatio: `${trim.wIn} / ${trim.hIn}`, padding: `${gutter * 42}px ${gutter * 42}px` }}
                >
                  <div style={{ fontFamily: previewFont, fontSize: settings.fontSize * 1.1, lineHeight: settings.lineHeight }} className="text-neutral-800 h-full overflow-hidden">
                    <div
                      className="kdp-preview"
                      dangerouslySetInnerHTML={{ __html: firstBody || "<p>Ce livre n'a pas encore de contenu.</p>" }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-neutral-400 mt-3">
                {loading ? "Chargement du livre…" : `${chapters.length} chapitre(s) seront exportés au format ${trim.label.replace(/ —.*/, "")}.`}
              </p>
            </div>
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .kdp-preview h1 { font-size: 1.5em; font-weight: 800; text-align:center; margin: .4em 0; }
        .kdp-preview h2 { font-size: 1.2em; font-weight: 700; margin: .6em 0 .3em; }
        .kdp-preview p { text-align: justify; margin: 0 0 .5em; }
        .kdp-preview hr { display:none; }
      ` }} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-2">
      <div className="text-[10px] uppercase text-neutral-400 font-bold">{label}</div>
      <div className="text-sm font-extrabold text-white">{value}</div>
    </div>
  );
}
