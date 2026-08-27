"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, LayoutTemplate, Download, ArrowRight, ArrowLeft } from "lucide-react";
import { saveAs } from "file-saver";

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
  /** Étape de départ (3 = aller directement au choix du format, sans l'upsell couverture). */
  initialStep?: 1 | 3;
}

export default function ExportBookModal({ isOpen, onClose, project, initialStep = 1 }: ExportBookModalProps) {
  const router = useRouter();

  // Steps: 1 = Cover, 2 = Layout, 3 = Final Download, 4 = Congratulations
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);

  // Step 3 state (Original Export logic)
  const [selectedFormat, setSelectedFormat] = useState<"epub" | "pdf" | "docx" | "markdown">("epub");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const bookTitle = project?.title || "Mon Livre Iris";
  const sanitizedTitle = bookTitle.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ]/gi, "_").replace(/_+/g, "_");

  // Build chapters data from project
  const chaptersData = (project?.chapters || []).map((ch: any, idx: number) => ({
    title: ch.title || `Chapitre ${ch.number || idx + 1}`,
    content: ch.content || "",
    number: ch.number || idx + 1,
  }));

  const handleDownload = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      let finalChapters = chaptersData;
      // Source de vérité de la couverture : la valeur en base (cover_url),
      // appliquée depuis le Studio de couverture.
      let coverUrl = project?.cover_url || "";

      // S'il manque les chapitres OU la couverture, on récupère le projet complet
      // (les chapitres réels + cover_url à jour) depuis l'API.
      if (((finalChapters.length === 0 || !finalChapters[0]?.content) || !coverUrl) && project?.id) {
        const res = await fetch(`/api/projects/${project.id}`);
        if (res.ok) {
          const data = await res.json();
          if (!coverUrl) coverUrl = data.project?.cover_url || "";
          if ((finalChapters.length === 0 || !finalChapters[0]?.content) && data.chapters && data.chapters.length > 0) {
            finalChapters = data.chapters.map((ch: any, idx: number) => ({
              title: ch.title || `Chapitre ${ch.number || idx + 1}`,
              content: ch.content || "",
              number: ch.number || idx + 1,
            }));
          }
        }
      }

      if (finalChapters.length === 0) {
        alert("Aucun chapitre à exporter. Rédigez d'abord du contenu dans votre livre.");
        setIsExporting(false);
        return;
      }

      if (selectedFormat === "docx") {
        const { generateDocx } = await import("@/lib/export/generateDocx");
        const blob = await generateDocx(bookTitle, project?.subtitle, finalChapters, coverUrl);
        saveAs(blob, `${sanitizedTitle}.docx`);

      } else if (selectedFormat === "epub") {
        const { generateEpub } = await import("@/lib/export/generateEpub");
        const blob = await generateEpub(bookTitle, project?.subtitle, "Auteur", finalChapters, coverUrl);
        saveAs(blob, `${sanitizedTitle}.epub`);

      } else if (selectedFormat === "pdf") {
        // Server-side PDF engine (headless Chrome / Puppeteer) — renders the
        // real HTML/CSS and returns a downloadable file, faithful to the editor.
        const res = await fetch("/api/export/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: bookTitle,
            subtitle: project?.subtitle,
            chapters: finalChapters,
            coverUrl,
          }),
        });

        if (!res.ok) {
          let message = "La génération du PDF a échoué. Veuillez réessayer.";
          try {
            const err = await res.json();
            if (err?.error) message = err.error;
          } catch {}
          throw new Error(message);
        }

        const blob = await res.blob();
        saveAs(blob, `${sanitizedTitle}.pdf`);

      } else if (selectedFormat === "markdown") {
        const { generateMarkdown } = await import("@/lib/export/generateMarkdown");
        const blob = generateMarkdown(bookTitle, project?.subtitle, finalChapters);
        saveAs(blob, `${sanitizedTitle}.md`);
      }

      setExportSuccess(true);
      setStep(4); // Go to success step

    } catch (error) {
      console.error("Export error:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Une erreur est survenue lors de l'export. Veuillez réessayer.";
      alert(message);
    } finally {
      setIsExporting(false);
    }
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
        <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-y-auto flex flex-col relative border border-neutral-100 max-h-[85dvh]">
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
                Une belle couverture attire l&apos;œil ! Voulez-vous générer une couverture professionnelle par IA avant de télécharger votre livre ?
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
                onClick={() => setStep(3)}
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
  // STEP 3: DIRECT EXPORT
  // ----------------------------------------------------
  if (step === 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-body animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] relative">
          <button onClick={() => setStep(1)} className="absolute top-5 left-5 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors z-20">
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

  // ----------------------------------------------------
  // STEP 4: CONGRATULATIONS
  // ----------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-body animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-y-auto flex flex-col relative border border-neutral-100 max-h-[85dvh]">
        <button onClick={resetAndClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-600 transition-colors z-10">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
        
        <div className="p-8 sm:p-10 text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-5xl text-emerald-500">celebration</span>
          </div>
          
          <div className="space-y-3">
            <h2 className="font-heading font-extrabold text-3xl text-neutral-900">Félicitations !</h2>
            <p className="text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed">
              Votre livre <strong>"{bookTitle}"</strong> a été généré et téléchargé avec succès au format {selectedFormat.toUpperCase()}.
            </p>
          </div>

          <div className="pt-6 flex flex-col gap-3 max-w-sm mx-auto">
            <button 
              onClick={() => {
                if (project?.id) router.push(`/redaction?projectId=${project.id}`);
                onClose();
              }}
              className="w-full bg-secondary hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">edit_document</span>
              <span>Retourner au studio de rédaction</span>
            </button>
            
            <button 
              onClick={() => {
                router.push("/dashboard");
                onClose();
              }}
              className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              <span>Aller au tableau de bord</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
