"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, LayoutTemplate, Download, ArrowRight, ArrowLeft } from "lucide-react";

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
  const router = useRouter();
  
  // Steps: 1 = Cover, 2 = Layout, 3 = Final Download
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 3 state (Original Export logic)
  const [selectedFormat, setSelectedFormat] = useState<"epub" | "pdf" | "docx" | "markdown">("epub");
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
        content += `## Sommaire\n- Chapitre 1\n- Chapitre 2\n\n---\n\n`;
        content += `## Chapitre 1\n\nLe soleil de midi écrasait le Mandé d'une chaleur de plomb. Soundiata fixait l'horizon avec une volonté inébranlable...\n\n`;
      } else {
        content = `${bookTitle.toUpperCase()}\n${project?.subtitle || ""}\n\n===================================\n`;
        content += `TABLE DES MATIÈRES\n-----------------------------------\n1. Chapitre 1 .............. Page 1\n2. Chapitre 2 .............. Page 15\n\n===================================\n\n`;
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

  const resetAndClose = () => {
    setStep(1);
    onClose();
  };

  // ----------------------------------------------------
  // STEP 1: COVER
  // ----------------------------------------------------
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-body animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col relative border border-neutral-100">
          <button onClick={resetAndClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-600 transition-colors z-10">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-orange-100 rounded-3xl flex items-center justify-center rotate-3 border border-orange-200 shadow-inner">
              <Sparkles className="w-10 h-10 text-secondary" strokeWidth={1.5} />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-heading font-extrabold text-2xl text-neutral-900">Avez-vous une couverture ?</h2>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Une belle couverture attire l'œil ! Voulez-vous générer une couverture professionnelle par IA avant de télécharger votre livre ?
              </p>
              <p className="text-xs text-neutral-400 italic mt-1">(Vous pourrez toujours y revenir plus tard)</p>
            </div>

            <div className="pt-4 flex flex-col gap-3 max-w-sm mx-auto">
              <button 
                onClick={() => {
                  if (project?.id) router.push(`/cover-studio/${project.id}`);
                  onClose();
                }}
                className="w-full bg-secondary hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Aller au Studio de Couverture</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => setStep(2)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-sm py-3.5 rounded-xl transition-all"
              >
                Passer cette étape
              </button>
            </div>
          </div>
          
          <div className="bg-neutral-50 px-8 py-4 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-neutral-400">
            <span>Étape 1 sur 3</span>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-secondary"></div>
              <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
              <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 2: LAYOUT / KDP
  // ----------------------------------------------------
  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-body animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col relative border border-neutral-100">
          <button onClick={resetAndClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-600 transition-colors z-10">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          
          <button onClick={() => setStep(1)} className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors z-10">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-blue-50 rounded-3xl flex items-center justify-center -rotate-3 border border-blue-100 shadow-inner">
              <LayoutTemplate className="w-10 h-10 text-blue-500" strokeWidth={1.5} />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-heading font-extrabold text-2xl text-neutral-900">Formatage & Mise en page</h2>
              <p className="text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
                Voulez-vous formater votre livre pour l'impression (KDP), ajouter des lettrines, un sommaire et modifier la typographie ?
              </p>
              <p className="text-xs text-neutral-400 italic mt-1">(Recommandé pour l'édition papier)</p>
            </div>

            <div className="pt-4 flex flex-col gap-3 max-w-sm mx-auto">
              <button 
                onClick={() => {
                  if (project?.id) router.push(`/export/${project.id}`);
                  onClose();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Aller au Studio de Mise en page</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => setStep(3)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-sm py-3.5 rounded-xl transition-all"
              >
                Passer et télécharger un export basique
              </button>
            </div>
          </div>
          
          <div className="bg-neutral-50 px-8 py-4 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-neutral-400">
            <span>Étape 2 sur 3</span>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-secondary"></div>
              <div className="w-2 h-2 rounded-full bg-secondary"></div>
              <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 3: DIRECT EXPORT
  // ----------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-body animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
        <button onClick={() => setStep(2)} className="absolute top-5 left-5 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors z-20">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="px-6 sm:px-8 pt-5 pb-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0 pl-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-secondary flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-900 leading-tight">
                Export Basique du Livre
              </h2>
              <p className="text-xs text-neutral-500 font-medium truncate max-w-xs sm:max-w-sm">
                Projet : <strong className="text-neutral-800">{bookTitle}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={resetAndClose}
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
                  <h4 className="font-heading font-bold text-sm text-neutral-900">PDF Simple</h4>
                  <p className="text-xs text-neutral-500">Pour relecture rapide sur tous vos appareils.</p>
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
                  <p className="text-xs text-neutral-500">Fichier modifiable pour correction manuelle.</p>
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
                  <p className="text-xs text-neutral-500">Texte brut balisé pour le web.</p>
                </div>
              </div>

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
          <div className="flex gap-1.5 items-center">
            <div className="w-2 h-2 rounded-full bg-secondary"></div>
            <div className="w-2 h-2 rounded-full bg-secondary"></div>
            <div className="w-2 h-2 rounded-full bg-secondary"></div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                <span>Génération en cours...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Télécharger au format {selectedFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
