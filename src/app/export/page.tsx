"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";

function ExportPageContent() {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  // Export settings
  const [pageSize, setPageSize] = useState("A5 (148 x 210 mm)");
  const [fontStyle, setFontStyle] = useState("Garamond Classical");
  const [marginSize, setMarginSize] = useState("Normales KDP (2 cm)");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Project data state
  const [projectTitle, setProjectTitle] = useState("Mon Livre Iris");
  const [projectContent, setProjectContent] = useState("<p>Chapitre 1 : Introduction...</p>");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. Essayer de récupérer le projet depuis l'API si projectId est présent
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.project) {
            setProjectTitle(data.project.title);
            setCoverUrl(data.project.cover_url);
            
            // Reconstruire le contenu à partir des chapitres
            if (data.chapters && data.chapters.length > 0) {
              const fullContent = data.chapters
                .map((ch: any) => `<h2>${ch.title}</h2><div>${ch.content || ""}</div>`)
                .join("");
              setProjectContent(fullContent);
            }
          }
        })
        .catch((err) => console.error("Erreur de chargement du projet:", err));
    } else {
      // 2. Fallback localStorage
      const projectContextStr = localStorage.getItem("iris_current_project");
      if (projectContextStr) {
        try {
          const projectContext = JSON.parse(projectContextStr);
          if (projectContext.title) setProjectTitle(projectContext.title);
          if (projectContext.content) setProjectContent(projectContext.content);
          if (projectContext.cover_url) setCoverUrl(projectContext.cover_url);
        } catch(e) {}
      }
    }
  }, [projectId]);

  const getManuscriptHTML = () => {

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectTitle}</title>
          <style>
            @page { size: ${pageSize.includes("A4") ? "A4" : "A5"}; margin: 20mm; }
            @page :first { margin: 0; }
            body { font-family: Georgia, Garamond, serif; font-size: 11pt; line-height: 1.6; color: #111; margin: 0; padding: 0; }
            .content-wrapper { padding: 20mm; }
            h1 { font-size: 24pt; text-align: center; margin-top: 50px; margin-bottom: 20px; text-transform: uppercase; }
            h2 { font-size: 16pt; margin-top: 40px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
            p { text-indent: 1.5em; margin-bottom: 0.5em; text-align: justify; }
            .header { text-align: center; font-size: 9pt; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px; }
            .cover-page { width: 100vw; height: 100vh; page-break-after: always; display: flex; justify-content: center; align-items: center; margin: 0; padding: 0; overflow: hidden; background: white; }
            .cover-page img { width: 100%; height: 100%; object-fit: cover; }
          </style>
        </head>
        <body>
          ${coverUrl ? `<div class="cover-page"><img src="${coverUrl}" alt="Couverture" /></div>` : ''}
          <div class="content-wrapper">
            ${includeHeaders ? `<div class="header">${projectTitle} — ${displayName}</div>` : ''}
            <h1>${projectTitle}</h1>
            <div>${projectContent}</div>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    const htmlContent = getManuscriptHTML();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setIsExporting(false);
      }, 500);
    } else {
      setIsExporting(false);
    }
  };

  const handleExportDocx = () => {
    const htmlContent = getManuscriptHTML();
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Manuscrit_Iris_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportEpub = () => {
    const htmlContent = getManuscriptHTML();
    const blob = new Blob([htmlContent], { type: 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Manuscrit_Iris_${new Date().toISOString().slice(0, 10)}.epub.html`;
    a.click();
    URL.revokeObjectURL(url);
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
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">{displayName || "Utilisateur"}</p>
                    <p className="text-xs text-neutral-500 truncate">{displayEmail || ""}</p>
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
                  onClick={handleExportEpub}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs p-3 rounded-xl transition-all flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">book</span>
                    <span>Format ePub (Liseuses & Kindle)</span>
                  </span>
                  <span className="material-symbols-outlined text-base">download</span>
                </button>

                <button
                  onClick={handleExportDocx}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs p-3 rounded-xl transition-all flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">description</span>
                    <span>Format Microsoft Word (.doc)</span>
                  </span>
                  <span className="material-symbols-outlined text-base">download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Page Preview (Right Column) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-200/60 rounded-3xl p-6 sm:p-10 border border-neutral-300 relative min-h-[600px] overflow-hidden">
            <span className="absolute top-4 left-4 bg-neutral-900 text-white px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider z-10">
              Aperçu Imprimable ({pageSize})
            </span>

            <div className="flex gap-6 overflow-x-auto w-full pb-4 items-center justify-start snap-x" style={{ paddingLeft: 'max(0px, calc(50% - 14rem))' }}>
              {/* Cover Page Mockup */}
              {coverUrl && (
                <div className="bg-white shrink-0 w-full max-w-sm sm:max-w-md aspect-[1/1.4] rounded-xl shadow-2xl overflow-hidden border border-neutral-300 snap-center relative">
                  <img src={coverUrl} alt="Couverture" className="w-full h-full object-cover" />
                </div>
              )}

              {/* A5 / Book Page Mockup */}
              <div className="bg-white shrink-0 w-full max-w-sm sm:max-w-md aspect-[1/1.4] rounded-xl shadow-2xl p-8 sm:p-12 flex flex-col justify-between text-neutral-900 border border-neutral-300 font-serif snap-center">
                {includeHeaders && (
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 font-sans border-b border-neutral-100 pb-2">
                    <span className="uppercase">{projectTitle.substring(0, 30)}</span>
                    <span>CHAPITRE 1</span>
                  </div>
                )}

                <div className="my-auto space-y-4">
                  <h2 className="font-heading font-extrabold text-xl text-neutral-900 tracking-tight font-sans">
                    Chapitre 1 : Introduction
                  </h2>
                  <div 
                    className="text-xs sm:text-sm leading-relaxed text-neutral-800 line-clamp-12"
                    dangerouslySetInnerHTML={{ __html: projectContent }}
                  >
                  </div>
                </div>

                {includeHeaders && (
                  <div className="text-center text-[10px] text-neutral-400 font-sans border-t border-neutral-100 pt-2">
                    - 1 -
                  </div>
                )}
              </div>
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

export default function ExportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">Chargement...</div>}>
      <ExportPageContent />
    </Suspense>
  );
}
