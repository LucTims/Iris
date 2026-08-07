"use client";

import { useState } from "react";

interface ExportBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: {
    id?: string;
    title?: string;
    subtitle?: string;
    category?: string;
    chapters?: any[];
    cover_url?: string;
  } | null;
}

export default function ExportBookModal({ isOpen, onClose, project }: ExportBookModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<"epub" | "pdf" | "docx" | "markdown">("epub");
  const [includeCover, setIncludeCover] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [includeChapterDecorations, setIncludeChapterDecorations] = useState(true);
  const [pageSize, setPageSize] = useState("kdp-standard");
  const [typography, setTypography] = useState("georgia");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const bookTitle = project?.title || "Mon Livre Iris";

  const handleDownload = () => {
    setIsExporting(true);
    setExportSuccess(false);

    setTimeout(() => {
      // Create formatted text content based on selected options
      let content = "";
      
      if (selectedFormat === "markdown") {
        content = `# ${bookTitle}\n`;
        if (project?.subtitle) content += `*${project.subtitle}*\n\n`;
        content += `---\n\n`;
        if (includeToc) {
          content += `## Sommaire\n- Chapitre 1\n- Chapitre 2\n\n---\n\n`;
        }
        content += `## Chapitre 1\n\nLe soleil de midi écrasait le Mandé d'une chaleur de plomb. Soundiata fixait l'horizon avec une volonté inébranlable...\n\n`;
      } else {
        content = `${bookTitle.toUpperCase()}\n${project?.subtitle || ""}\n\n===================================\n`;
        if (includeToc) {
          content += `TABLE DES MATIÈRES\n-----------------------------------\n1. Chapitre 1 .............. Page 1\n2. Chapitre 2 .............. Page 15\n\n===================================\n\n`;
        }
        content += `CHAPITRE 1\n\nLe soleil de midi écrasait le Mandé d'une chaleur de plomb. Soundiata fixait l'horizon avec une volonté inébranlable...\n`;
      }

      // MIME Types mapping
      const mimeTypes: Record<string, string> = {
        epub: "application/epub+zip",
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        markdown: "text/markdown"
      };

      const extensions: Record<string, string> = {
        epub: "epub",
        pdf: "pdf",
        docx: "docx",
        markdown: "md"
      };

      const ext = extensions[selectedFormat];
      const mime = mimeTypes[selectedFormat] || "text/plain";
      
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedTitle = bookTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
      a.download = `${sanitizedTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      setExportSuccess(true);

      setTimeout(() => {
        setExportSuccess(false);
      }, 4000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-body animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">download</span>
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-900 leading-tight">
                Exporter &amp; Télécharger le Livre
              </h2>
              <p className="text-xs text-neutral-500 font-medium truncate max-w-xs sm:max-w-sm">
                Projet : <strong className="text-neutral-800">{bookTitle}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* Format Selection Grid */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              1. Choisir le format de téléchargement
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* EPUB Option */}
              <div 
                onClick={() => setSelectedFormat("epub")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 relative ${
                  selectedFormat === "epub"
                    ? "border-secondary bg-orange-50/50 shadow-2xs ring-2 ring-secondary/20"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedFormat === "epub" ? "bg-secondary text-white" : "bg-neutral-100 text-neutral-600"
                }`}>
                  <span className="material-symbols-outlined text-xl">tablet_mac</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading font-bold text-sm text-neutral-900">EPUB Liseuse</h4>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Recommandé
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">Kindle, Kobo, Apple Books. Texte adaptatif universel.</p>
                </div>
              </div>

              {/* PDF Option */}
              <div 
                onClick={() => setSelectedFormat("pdf")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 relative ${
                  selectedFormat === "pdf"
                    ? "border-secondary bg-orange-50/50 shadow-2xs ring-2 ring-secondary/20"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedFormat === "pdf" ? "bg-secondary text-white" : "bg-neutral-100 text-neutral-600"
                }`}>
                  <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-heading font-bold text-sm text-neutral-900">PDF Haute Définition</h4>
                  <p className="text-xs text-neutral-500">Format d&apos;impression Amazon KDP &amp; lecture fixe HD.</p>
                </div>
              </div>

              {/* Word Option */}
              <div 
                onClick={() => setSelectedFormat("docx")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 relative ${
                  selectedFormat === "docx"
                    ? "border-secondary bg-orange-50/50 shadow-2xs ring-2 ring-secondary/20"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedFormat === "docx" ? "bg-secondary text-white" : "bg-neutral-100 text-neutral-600"
                }`}>
                  <span className="material-symbols-outlined text-xl">description</span>
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-heading font-bold text-sm text-neutral-900">Microsoft Word (.docx)</h4>
                  <p className="text-xs text-neutral-500">Fichier modifiable pour relecture ou éditeur classique.</p>
                </div>
              </div>

              {/* Markdown Option */}
              <div 
                onClick={() => setSelectedFormat("markdown")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 relative ${
                  selectedFormat === "markdown"
                    ? "border-secondary bg-orange-50/50 shadow-2xs ring-2 ring-secondary/20"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedFormat === "markdown" ? "bg-secondary text-white" : "bg-neutral-100 text-neutral-600"
                }`}>
                  <span className="material-symbols-outlined text-xl">code</span>
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-heading font-bold text-sm text-neutral-900">Markdown (.md)</h4>
                  <p className="text-xs text-neutral-500">Texte brut balisé pour le web et les développeurs.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Layout & Typography Customization */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              2. Paramètres de mise en page &amp; Style
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Format de Page &amp; Marges
                </label>
                <select 
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  className="w-full bg-neutral-100/80 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-neutral-800 outline-none focus:border-secondary transition-all"
                >
                  <option value="kdp-standard">6&quot; x 9&quot; (Standard Amazon KDP)</option>
                  <option value="pocket-a5">A5 (Format Poche 14.8 x 21 cm)</option>
                  <option value="standard-a4">A4 (Document Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Style Typographique
                </label>
                <select 
                  value={typography}
                  onChange={(e) => setTypography(e.target.value)}
                  className="w-full bg-neutral-100/80 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-neutral-800 outline-none focus:border-secondary transition-all"
                >
                  <option value="georgia">Georgia (Sérif Littéraire Classique)</option>
                  <option value="garamond">Garamond (Édition Prestige)</option>
                  <option value="outfit">Outfit / DM Sans (Moderne Sans-Sérif)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Export Toggles & Options */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              3. Éléments inclus dans le téléchargement
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={includeCover}
                  onChange={(e) => setIncludeCover(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary focus:ring-secondary accent-secondary"
                />
                <span className="text-xs font-semibold text-neutral-800">Inclure la couverture HD</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={includeToc}
                  onChange={(e) => setIncludeToc(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary focus:ring-secondary accent-secondary"
                />
                <span className="text-xs font-semibold text-neutral-800">Table des matières automatique</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={includePageNumbers}
                  onChange={(e) => setIncludePageNumbers(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary focus:ring-secondary accent-secondary"
                />
                <span className="text-xs font-semibold text-neutral-800">Numérotation des pages</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={includeChapterDecorations}
                  onChange={(e) => setIncludeChapterDecorations(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary focus:ring-secondary accent-secondary"
                />
                <span className="text-xs font-semibold text-neutral-800">Séparateurs de chapitres Iris</span>
              </label>
            </div>
          </div>

          {exportSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-lg text-emerald-600">check_circle</span>
              <span>Fichier {selectedFormat.toUpperCase()} généré et téléchargé avec succès !</span>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 sm:px-8 py-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between gap-4 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-colors"
          >
            Annuler
          </button>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                <span>Génération du fichier par Iris...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">download</span>
                <span>Télécharger au format {selectedFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
