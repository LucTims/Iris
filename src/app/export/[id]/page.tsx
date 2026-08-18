"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";
import { Sparkles, LayoutTemplate, Settings2, Eye, Download, BookOpen } from "lucide-react";

export default function ExportEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;

  // Project Data
  const [projectTitle, setProjectTitle] = useState("Chargement...");
  const [projectContent, setProjectContent] = useState("<p>Chargement...</p>");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  
  // Advanced Settings
  const [pageSize, setPageSize] = useState("kdp-standard");
  const [fontFamily, setFontFamily] = useState("georgia");
  const [useDropCaps, setUseDropCaps] = useState(true);
  const [chapterStyle, setChapterStyle] = useState("modern");
  const [includeToc, setIncludeToc] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.project) {
            setProjectTitle(data.project.title);
            setCoverUrl(data.project.cover_url);
            if (data.chapters && data.chapters.length > 0) {
              const fullContent = data.chapters
                .map((ch: any) => `<h2>${ch.title}</h2><div>${ch.content || ""}</div>`)
                .join("");
              setProjectContent(fullContent);
            } else {
              setProjectContent("<p>Ce livre ne contient aucun chapitre pour le moment.</p>");
            }
          }
        }
      } catch (err) {
        console.error("Erreur de chargement du projet:", err);
      }
    };
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const handleExportPDF = (withModifications: boolean) => {
    setDownloadModalOpen(false);
    setIsExporting(true);
    setTimeout(() => {
      alert(`Exportation KDP générée en mode : ${withModifications ? "AVEC" : "SANS"} modifications !`);
      setIsExporting(false);
    }, 1500);
  };

  const fontFamilyMap: Record<string, string> = {
    "georgia": "font-serif",
    "garamond": "font-serif font-light",
    "outfit": "font-sans",
  };

  const getChapterStyle = () => {
    if (chapterStyle === "modern") return "text-2xl font-extrabold uppercase tracking-widest text-center my-10 border-b pb-4";
    if (chapterStyle === "classic") return "text-3xl font-normal italic text-center my-8";
    return "text-xl font-bold my-6";
  };

  return (
    <div className="bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/export" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Hub Mise en page</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-secondary" strokeWidth={2} />
              <span>Éditeur KDP</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDownloadModalOpen(true)}
              disabled={isExporting}
              className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">Exporter le Livre</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">{displayName}</p>
                    <p className="text-xs text-neutral-500 truncate">{displayEmail}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20 md:pb-10 relative">
          
          {/* Controls Column (Left) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Book Settings */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-5">
              <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                <span>Paramètres du Livre</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Format d'Impression</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-neutral-800 outline-none focus:border-secondary"
                  >
                    <option value="kdp-standard">6" x 9" (Standard KDP)</option>
                    <option value="pocket-a5">A5 (Format Poche)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Typographie</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-neutral-800 outline-none focus:border-secondary"
                  >
                    <option value="georgia">Georgia (Littéraire)</option>
                    <option value="garamond">Garamond (Classique)</option>
                    <option value="outfit">Outfit (Moderne)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Style des Chapitres</label>
                  <select
                    value={chapterStyle}
                    onChange={(e) => setChapterStyle(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-neutral-800 outline-none focus:border-secondary"
                  >
                    <option value="modern">Moderne & Épuré</option>
                    <option value="classic">Classique & Roman</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Enhancements */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
              <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
                <span>Enrichissements</span>
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={useDropCaps}
                    onChange={(e) => setUseDropCaps(e.target.checked)}
                    className="w-4 h-4 rounded text-secondary focus:ring-secondary accent-secondary"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-800">Lettrines (Drop Caps)</span>
                    <span className="text-[10px] text-neutral-500">Mise en valeur de la première lettre</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={includeToc}
                    onChange={(e) => setIncludeToc(e.target.checked)}
                    className="w-4 h-4 rounded text-secondary focus:ring-secondary accent-secondary"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-800">Sommaire Automatique</span>
                    <span className="text-[10px] text-neutral-500">Génération de la table des matières</span>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* Live 3D Double Page Preview (Right Column) */}
          <div className="lg:col-span-8 flex flex-col items-center bg-neutral-200 rounded-3xl p-6 sm:p-10 border border-neutral-300 relative min-h-[700px] overflow-hidden shadow-inner">
            <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-neutral-800 uppercase tracking-wider shadow-sm z-10">
              <Eye className="w-4 h-4 text-secondary" /> Aperçu Livre Ouvert
            </div>

            {/* Book Spine Center line representation */}
            <div className="absolute top-0 bottom-0 left-1/2 w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent pointer-events-none z-0"></div>

            <div className="w-full max-w-4xl flex items-stretch mt-12 bg-white shadow-2xl rounded-sm overflow-hidden z-10">
              
              {/* Left Page (TOC or Previous Chapter) */}
              <div className={`flex-1 p-10 sm:p-14 border-r border-neutral-200 bg-gradient-to-l from-neutral-50 to-white ${fontFamilyMap[fontFamily]}`}>
                {includeToc ? (
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-center mb-10">Sommaire</h2>
                    <ul className="space-y-4 text-sm">
                      <li className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-1">
                        <span>Chapitre 1 : Introduction</span>
                        <span>1</span>
                      </li>
                      <li className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-1">
                        <span>Chapitre 2 : La découverte</span>
                        <span>15</span>
                      </li>
                      <li className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-1">
                        <span>Chapitre 3 : L'ultime combat</span>
                        <span>42</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-300">
                    <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm font-sans uppercase tracking-widest">Page Précédente</p>
                  </div>
                )}
                
                {/* Page Number */}
                <div className="absolute bottom-10 left-1/4 -translate-x-1/2 text-xs text-neutral-400 font-sans">
                  - i -
                </div>
              </div>

              {/* Right Page (Chapter Content) */}
              <div className={`flex-1 p-10 sm:p-14 bg-gradient-to-r from-neutral-50 to-white ${fontFamilyMap[fontFamily]}`}>
                <div className="text-[9px] uppercase tracking-widest text-neutral-400 text-center mb-12 font-sans">
                  {projectTitle}
                </div>

                <div className={getChapterStyle()}>
                  Chapitre 1
                </div>
                
                <div className={`text-sm leading-relaxed text-neutral-800 text-justify ${useDropCaps ? '[&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:text-5xl [&>p:first-of-type]:first-letter:mr-2 [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:leading-none [&>p:first-of-type]:first-letter:text-neutral-900' : ''}`}>
                  <p>
                    Le soleil de midi écrasait le Mandé d'une chaleur de plomb. Soundiata fixait l'horizon avec une volonté inébranlable, sachant que son destin était déjà en marche.
                  </p>
                  <p className="mt-4">
                    Les anciens du village s'étaient réunis autour de l'arbre à palabre, leurs visages marqués par la sagesse et le temps. Ils savaient que cet enfant n'était pas comme les autres. Depuis le jour où il s'était levé, appuyé sur cette lourde barre de fer, l'histoire avait basculé.
                  </p>
                </div>

                {/* Page Number */}
                <div className="absolute bottom-10 right-1/4 translate-x-1/2 text-xs text-neutral-400 font-sans">
                  - 1 -
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>

      {/* Export Choice Modal */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-body animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col relative border border-neutral-100">
            <button onClick={() => setDownloadModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-600 transition-colors z-10">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            
            <div className="p-8 sm:p-10 text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-orange-100 rounded-3xl flex items-center justify-center border border-orange-200 shadow-inner">
                <span className="material-symbols-outlined text-4xl text-secondary">file_download</span>
              </div>
              
              <div className="space-y-2">
                <h2 className="font-heading font-extrabold text-2xl text-neutral-900">Options d'exportation</h2>
                <p className="text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Souhaitez-vous télécharger ce livre avec les magnifiques réglages de mise en page actuels, ou juste le texte brut (sans les modifications) ?
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  onClick={() => handleExportPDF(true)}
                  className="w-full bg-secondary hover:bg-orange-600 text-white font-bold text-sm py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <span>Télécharger avec les modifications</span>
                </button>
                
                <button 
                  onClick={() => handleExportPDF(false)}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">description</span>
                  <span>Télécharger sans modifications (Texte brut)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
