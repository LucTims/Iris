"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function ExportPage() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Export settings
  const [pageSize, setPageSize] = useState("A5 (148 x 210 mm)");
  const [fontStyle, setFontStyle] = useState("Garamond Classical");
  const [marginSize, setMarginSize] = useState("Normales KDP (2 cm)");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Votre livre a été mis en page et exporté au format PDF avec succès ! Le téléchargement a démarré.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <header className="bg-[#F9FAFB] sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Tableau de bord</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">design_services</span>
              <span>Mise en Page & Exportation PDF / KDP</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                {isExporting ? "progress_activity" : "picture_as_pdf"}
              </span>
              <span>{isExporting ? "Génération PDF..." : "Exporter en PDF"}</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              >
                ML
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">Martin Laurent</p>
                    <p className="text-xs text-neutral-500 truncate">martin@exemple.com</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                      <span>Tableau de bord</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                      <span>Paramètres</span>
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-neutral-100">
                    <Link href="/login" className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column (Left) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
              <h2 className="font-heading font-extrabold text-base text-neutral-900">
                Format du Livre & Impression
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                    Format de la Page
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 bg-white outline-none focus:border-secondary"
                  >
                    <option>A5 (148 x 210 mm) — Standard Livre</option>
                    <option>6&quot; x 9&quot; (152 x 228 mm) — Amazon KDP</option>
                    <option>Pocket (110 x 180 mm) — Format de poche</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                    Police typographique
                  </label>
                  <select
                    value={fontStyle}
                    onChange={(e) => setFontStyle(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 bg-white outline-none focus:border-secondary"
                  >
                    <option>Garamond Classical (Sérif littéraire)</option>
                    <option>Outfit Modern (Sans-sérif épuré)</option>
                    <option>Georgia Editorial (Sérif élégant)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                    Marges d&apos;Impression
                  </label>
                  <select
                    value={marginSize}
                    onChange={(e) => setMarginSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 bg-white outline-none focus:border-secondary"
                  >
                    <option>Normales KDP (2 cm)</option>
                    <option>Étroites (1.5 cm)</option>
                    <option>Larges avec reliure (2.5 cm)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-neutral-700">En-têtes et numérotation des pages</span>
                  <input
                    type="checkbox"
                    checked={includeHeaders}
                    onChange={(e) => setIncludeHeaders(e.target.checked)}
                    className="w-4 h-4 accent-secondary rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Formats Export Card */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
              <h2 className="font-heading font-extrabold text-base text-neutral-900">
                Exporter dans d&apos;autres formats
              </h2>

              <div className="space-y-2">
                <button
                  onClick={() => alert("Export EPUB téléchargé avec succès !")}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs p-3 rounded-xl transition-all flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">book</span>
                    <span>Format ePub (Liseuses & Kindle)</span>
                  </span>
                  <span className="material-symbols-outlined text-base">download</span>
                </button>

                <button
                  onClick={() => alert("Document Word .docx exporté !")}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs p-3 rounded-xl transition-all flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">description</span>
                    <span>Format Microsoft Word (.docx)</span>
                  </span>
                  <span className="material-symbols-outlined text-base">download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Page Preview (Right Column) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-200/60 rounded-3xl p-6 sm:p-10 border border-neutral-300 relative min-h-[600px]">
            <span className="absolute top-4 left-4 bg-neutral-900 text-white px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
              Aperçu Imprimable ({pageSize})
            </span>

            {/* A5 / Book Page Mockup */}
            <div className="bg-white w-full max-w-md aspect-[1/1.4] rounded-xl shadow-2xl p-8 sm:p-12 flex flex-col justify-between text-neutral-900 border border-neutral-300 font-serif">
              {includeHeaders && (
                <div className="flex justify-between items-center text-[10px] text-neutral-400 font-sans border-b border-neutral-100 pb-2">
                  <span>LES SECRETS DE LA COMPTABILITÉ</span>
                  <span>CHAPITRE 1</span>
                </div>
              )}

              <div className="my-auto space-y-4">
                <h2 className="font-heading font-extrabold text-xl text-neutral-900 tracking-tight font-sans">
                  Chapitre 1 : Les Fondations
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed text-neutral-800">
                  La comptabilité n&apos;est pas seulement une obligation fiscale : c&apos;est la boussole stratégique de tout entrepreneur désireux de bâtir une entreprise pérenne et rentable.
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-neutral-800">
                  Dans ce premier chapitre, nous allons démystifier les concepts clés du bilan, du compte de résultat et du flux de trésorerie sans jargon inutile.
                </p>
              </div>

              {includeHeaders && (
                <div className="text-center text-[10px] text-neutral-400 font-sans border-t border-neutral-100 pt-2">
                  - 15 -
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                className="bg-secondary text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-orange-600 transition-all shadow-md flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                <span>Télécharger le Livre Prêt à Imprimer</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
