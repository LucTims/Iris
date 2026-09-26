"use client";

import { useRef, useState } from "react";
import { TYPOGRAPHY_PRESETS, typographyFontsUrl } from "@/lib/book/typography";
import { ENRICHMENT_LEVELS, type EnrichmentLevel } from "@/lib/book/enrichment";
import { cssFamilyForPdfKey } from "@/lib/export/fontRegistry";
import type { ProjectStyleSettings } from "@/lib/book/writing-profile";

interface BookStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  /** Réglages enregistrés sur le projet. */
  current: ProjectStyleSettings;
  /** Valeurs conseillées quand l'auteur n'a rien choisi. */
  defaultTypography: string;
  defaultEnrichment: EnrichmentLevel;
  onSaved: (next: ProjectStyleSettings) => void;
}

const PLUME_COST = 20;

/**
 * « Style du livre » : typographie (couple de polices), mise en forme du texte
 * (encadrés, citations) et « Ma plume » — l'analyse de textes écrits par
 * l'auteur, que chaque chapitre rédigé par Iris reproduit ensuite.
 */
export default function BookStyleModal({
  isOpen,
  onClose,
  projectId,
  current,
  defaultTypography,
  defaultEnrichment,
  onSaved,
}: BookStyleModalProps) {
  const [typography, setTypography] = useState(current.typography || defaultTypography);
  const [enrichment, setEnrichment] = useState<EnrichmentLevel>(current.enrichment || defaultEnrichment);
  const [penText, setPenText] = useState("");
  const [penStatus, setPenStatus] = useState<"idle" | "working" | "error">("idle");
  const [penError, setPenError] = useState("");
  const [showPen, setShowPen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const patchStyle = async (style: Record<string, unknown>): Promise<ProjectStyleSettings | null> => {
    if (!projectId) return null;
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style_settings: style }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Enregistrement impossible.");
    return (data?.project?.style_settings as ProjectStyleSettings) || { ...current, ...style };
  };

  const analyzePen = async (text: string, source: string) => {
    if (text.trim().split(/\s+/).length < 80) {
      setPenError("Donnez au moins quelques paragraphes (environ 80 mots) pour qu'Iris reconnaisse votre plume.");
      setPenStatus("error");
      return;
    }
    setPenStatus("working");
    setPenError("");
    try {
      const res = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fileName: source, purpose: "style", projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Analyse impossible.");
      const next = await patchStyle({ authorStyle: data.analysis || "", authorStyleSource: source });
      if (next) onSaved(next);
      setPenText("");
      setPenStatus("idle");
    } catch (err) {
      setPenError(err instanceof Error ? err.message : "Analyse impossible.");
      setPenStatus("error");
    }
  };

  const handlePenFile = async (file: File | null) => {
    if (!file) return;
    try {
      const { extractDocumentText } = await import("@/lib/parser/extractText");
      const { text } = await extractDocumentText(file);
      await analyzePen(text.slice(0, 20000), file.name);
    } catch (err) {
      setPenError(err instanceof Error ? err.message : "Lecture du fichier impossible.");
      setPenStatus("error");
    }
  };

  const removePen = async () => {
    try {
      const next = await patchStyle({ authorStyle: null, authorStyleSource: null });
      if (next) onSaved(next);
    } catch (err) {
      setPenError(err instanceof Error ? err.message : "Suppression impossible.");
      setPenStatus("error");
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const next = await patchStyle({ typography, enrichment });
      if (next) onSaved(next);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <link rel="stylesheet" href={typographyFontsUrl(cssFamilyForPdfKey)} />
      <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-900 dark:text-neutral-100">Style du livre</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              La typographie s&apos;applique tout de suite à l&apos;éditeur et à l&apos;export. La mise en forme et la plume
              s&apos;appliquent aux prochains textes rédigés par Iris.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0" aria-label="Fermer">
            ✕
          </button>
        </div>

        {/* MA PLUME */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Ma plume</h3>
          {current.authorStyle ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
              <p className="text-sm font-bold text-emerald-900">
                Votre plume est enregistrée{current.authorStyleSource ? ` (${current.authorStyleSource})` : ""}.
              </p>
              <p className="text-xs text-emerald-800">Chaque chapitre rédigé par Iris est écrit dans votre style.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowPen((v) => !v)} className="text-xs font-bold text-emerald-900 underline">
                  {showPen ? "Masquer la fiche" : "Voir la fiche de plume"}
                </button>
                <button onClick={removePen} className="text-xs font-bold text-red-700 underline">Retirer</button>
              </div>
              {showPen && (
                <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-700 bg-white rounded-xl p-3 max-h-60 overflow-y-auto font-body">
                  {current.authorStyle}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
              Donnez à Iris des textes que VOUS avez écrits (article, post, chapitre, lettre…). Elle en tire une fiche de
              votre style — voix, rythme, vocabulaire, humour — et rédige ensuite chaque chapitre comme vous.
            </p>
          )}
          <textarea
            value={penText}
            onChange={(e) => setPenText(e.target.value)}
            rows={5}
            placeholder="Collez ici quelques paragraphes que vous avez écrits vous-même…"
            className="w-full bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-sm rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => analyzePen(penText, "Texte collé")}
              disabled={penStatus === "working" || !penText.trim()}
              className="text-xs font-bold text-white bg-[#C84B31] hover:bg-[#B83E26] rounded-xl px-3.5 py-2 disabled:opacity-50"
            >
              {penStatus === "working" ? "Iris étudie votre plume…" : `${current.authorStyle ? "Remplacer" : "Analyser"} ma plume · ${PLUME_COST} pièces`}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.epub,.txt,.md,.markdown"
              className="hidden"
              onChange={(e) => {
                handlePenFile(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={penStatus === "working"}
              className="text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3.5 py-2 disabled:opacity-50"
            >
              ou importer un fichier
            </button>
          </div>
          {penStatus === "error" && penError && <p className="text-xs text-red-600 font-medium">{penError}</p>}
        </section>

        {/* MISE EN FORME */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Mise en forme du texte</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ENRICHMENT_LEVELS.map((lvl) => {
              const selected = enrichment === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => setEnrichment(lvl.id)}
                  className={`text-left border rounded-2xl p-3 transition-all ${
                    selected ? "border-[#C84B31] bg-[#FDF3F1]/60" : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <span className={`block text-sm font-bold ${selected ? "text-[#C84B31]" : "text-neutral-800 dark:text-neutral-200"}`}>
                    {lvl.label}
                    {lvl.id === defaultEnrichment && <span className="ml-1 text-[10px] font-semibold text-neutral-400">conseillé</span>}
                  </span>
                  <span className="block text-[11px] text-neutral-500 leading-snug mt-0.5">{lvl.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* TYPOGRAPHIE */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Typographie</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TYPOGRAPHY_PRESETS.map((p) => {
              const selected = typography === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setTypography(p.id)}
                  className={`text-left border rounded-2xl p-3 transition-all ${
                    selected ? "border-[#C84B31] bg-[#FDF3F1]/60" : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-lg text-neutral-900 dark:text-neutral-100" style={{ fontFamily: `'${cssFamilyForPdfKey(p.display)}', serif`, fontWeight: 700 }}>
                      {p.label}
                    </span>
                    {p.id === defaultTypography && <span className="text-[10px] font-semibold text-neutral-400">conseillé</span>}
                  </span>
                  <span className="block text-[13px] text-neutral-700 dark:text-neutral-300 leading-snug mt-1" style={{ fontFamily: `'${cssFamilyForPdfKey(p.body)}', serif` }}>
                    Le matin où tout a commencé, personne ne savait encore.
                  </span>
                  <span className="block text-[10px] text-neutral-400 mt-1">
                    {p.hint} · {cssFamilyForPdfKey(p.body)} / {cssFamilyForPdfKey(p.display)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {saveError && <p className="text-xs text-red-600 font-medium">{saveError}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm font-bold text-neutral-600 dark:text-neutral-300">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !projectId}
            className="px-5 py-2.5 rounded-xl bg-[#C84B31] hover:bg-[#B83E26] text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
