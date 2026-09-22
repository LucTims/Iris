"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { SIZE_PRESETS, BOOK_MODELS, estimatePagesCoins } from "@/lib/book/generationPresets";
import type { BookSizeKey } from "@/lib/book/generationPresets";
import { useUser } from "@/hooks/useUser";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { WORK_TYPES, WORK_TYPE_META, type WorkType } from "@/lib/book/work-type";
import { BLUEPRINT_LIST, type BlueprintId } from "@/lib/book/book-blueprint";
import { BookOpen, Compass, FileText, Sparkles, Mic, MicOff, Check, ArrowRight, ArrowLeft, Upload, X, Rocket, Layers } from "lucide-react";
import { IrisMark } from "@/components/IrisLogo";

// Associe le libellé de longueur du formulaire à une clé de preset.
const lengthToSizeKey = (length: string): BookSizeKey =>
  /court/i.test(length) ? "court" : /long/i.test(length) ? "long" : "moyen";

export default function NewBookWizard() {
  const router = useRouter();
  const { walletBalance } = useUser();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const formContainerRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    category: "",
    audience: "",
    synopsis: "",
    tone: "",
    characters: "",
    length: "Court (Nouvelle / Lead Magnet)",
    instructions: "",
    includeToc: true,
    workType: "ebook" as WorkType,
    blueprintId: "ebook" as BlueprintId,
  });

  const updateForm = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlueprintSelect = (id: BlueprintId) => {
    let newWorkType: WorkType = "livre";
    if (id === "guide") newWorkType = "guide";
    else if (id === "ebook") newWorkType = "ebook";
    else if (id === "storybook") newWorkType = "storybook";
    
    setFormData((prev) => ({
      ...prev,
      blueprintId: id,
      workType: newWorkType,
    }));
  };

  const scrollToTop = () => {
    setTimeout(() => {
      formContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      scrollToTop();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      scrollToTop();
    }
  };

  const {
    isListening,
    isSupported: isSpeechSupported,
    error: speechError,
    interimTranscript,
    toggle: toggleListening,
  } = useSpeechToText((finalText) => {
    setFormData((prev) => ({
      ...prev,
      synopsis: prev.synopsis + (prev.synopsis && !prev.synopsis.endsWith(" ") ? " " : "") + finalText,
    }));
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-3.6-flash");

  // Document de référence
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [refPurpose, setRefPurpose] = useState<"inspiration" | "learn" | "style" | "reference">("inspiration");
  const [referenceDoc, setReferenceDoc] = useState<{ name: string; purpose: string; analysis: string } | null>(null);
  const [refStatus, setRefStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [refError, setRefError] = useState<string>("");

  const handleReferenceFile = async (file: File | null) => {
    if (!file) return;
    setRefStatus("working");
    setRefError("");
    setReferenceDoc(null);
    try {
      const { extractDocumentText } = await import("@/lib/parser/extractText");
      const { text } = await extractDocumentText(file);
      const res = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fileName: file.name, purpose: refPurpose, model: selectedModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Échec de l'analyse du document.");
      setReferenceDoc({ name: file.name, purpose: refPurpose, analysis: data.analysis || "" });
      setRefStatus("done");
    } catch (err: any) {
      setRefError(err?.message || "Erreur lors de l'analyse du document.");
      setRefStatus("error");
    }
  };

  /* ------------------------------------------------------------------ *
   * FLUX « VISION-TO-STORY » — images importées par l'auteur.
   * ------------------------------------------------------------------ */
  const MAX_ASSETS = 24;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; url: string; name: string; position: number; file: File; path?: string; analysisStatus?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [assetsError, setAssetsError] = useState("");
  const [isDraggingAssets, setIsDraggingAssets] = useState(false);

  const isStorybook = formData.blueprintId === "storybook";

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;
    
    const room = MAX_ASSETS - uploadedImages.length;
    if (room <= 0) {
      setAssetsError(`${MAX_ASSETS} images maximum.`);
      return;
    }
    
    setAssetsError("");
    setIsUploading(true);

    try {
      const newImages = fileArray.slice(0, room).map((file, i) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        position: uploadedImages.length + i,
        file,
      }));
      
      setUploadedImages((prev) => [...prev, ...newImages]);
    } catch (err: any) {
      setAssetsError(err instanceof Error ? err.message : "Erreur lors du chargement des images.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAsset = (id: string) => setUploadedImages((prev) => prev.filter((a) => a.id !== id));

  const moveAsset = (index: number, direction: -1 | 1) => {
    setUploadedImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const retryAsset = async (path?: string) => {
    if (!path) return;
    setIsUploading(true);
    setAssetsError("");
    try {
      const res = await fetch("/api/project-assets/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: [path] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Échec de la relance.");
      
      const result = data.results?.[0];
      if (result?.success && result.analysis) {
        setUploadedImages((prev) => prev.map(a => a.path === path ? { ...a, analysisStatus: "done", analysis: result.analysis } : a));
      } else {
        throw new Error(result?.error || "L'analyse a de nouveau échoué.");
      }
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : "Échec de la relance.");
    } finally {
      setIsUploading(false);
    }
  };

  // Intercept the final submit to show the modal first
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStorybook && uploadedImages.length < 2) {
      setAssetsError("Importez au moins 2 images pour construire votre conte.");
      setStep(3); // Step 3 is where the images are
      return;
    }
    setShowModelModal(true);
  };

  const handleSubmit = async () => {
    setShowModelModal(false);
    setIsSubmitting(true);

    try {
      const projectContext = {
        ...formData,
        model: selectedModel,
        referenceDocument: referenceDoc || undefined,
        blueprintId: formData.blueprintId,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem("iris_current_project", JSON.stringify(projectContext));

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          blueprintId: formData.blueprintId,
          referenceDocument: referenceDoc || undefined,
        })
      });

      if (!res.ok) {
        alert('Erreur lors de la création du projet. Veuillez vérifier votre connexion et réessayer.');
        return;
      }

      const data = await res.json();
      if (data.project?.id) {
        localStorage.setItem("iris_current_project_id", data.project.id);

        if (isStorybook && uploadedImages.length > 0) {
          try {
            const uploadFormData = new FormData();
            uploadFormData.append("projectId", data.project.id);
            uploadFormData.append("blueprintId", formData.blueprintId);
            for (const img of uploadedImages) {
              uploadFormData.append("files", img.file);
            }
            await fetch("/api/project-assets", {
              method: "POST",
              body: uploadFormData,
            });
          } catch (attachErr) {
            console.warn("Rattachement des images au projet impossible:", attachErr);
          }
        }
        
        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq("trackCustom", "ProjectCreated", {
            projectId: data.project.id,
            workType: formData.workType
          });
        }

        router.push(`/redaction?projectId=${data.project.id}&new=true`);
        return;
      }
    } catch (err) {
      console.error("Erreur lors de la création du projet:", err);
      alert('Erreur lors de la création du projet. Veuillez vérifier votre connexion et réessayer.');
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicators = () => {
    return (
      <div className="flex items-center justify-center gap-1 mb-8 w-full max-w-xl mx-auto px-6 sm:px-0">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden relative">
            <motion.div
              className={`absolute top-0 left-0 bottom-0 w-full rounded-full ${
                s <= step ? "bg-orange-500" : "bg-transparent"
              }`}
              initial={{ x: "-100%" }}
              animate={{ x: s <= step ? "0%" : "-100%" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 dark:text-neutral-100 flex flex-col md:flex-row">
      <Sidebar />
      <div id="main-scroll-container" className="flex-1 flex flex-col h-screen overflow-y-auto">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <Link href="/projects" className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-sm font-bold">Retour aux projets</span>
        </Link>
        <div className="flex items-center gap-2">
          <IrisMark size={24} className="text-brand shrink-0 rotate-6 transition-transform" />
          <span className="font-heading font-extrabold text-xl text-neutral-900">ris</span>
        </div>
        <div className="w-24"></div>
      </header>

      <main className="flex-1 flex flex-col items-center pt-6 sm:pt-8 pb-0 sm:pb-20 px-0 sm:px-4">
        {renderStepIndicators()}

        <div ref={formContainerRef} className="bg-white dark:bg-neutral-900 rounded-t-[32px] sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] sm:shadow-xl border-t sm:border border-neutral-100 dark:border-neutral-800 max-w-2xl w-full p-6 sm:p-10 relative overflow-y-auto flex-1 sm:flex-none flex flex-col">
          
          <div className="mb-6 sm:mb-8 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF3F1] border border-[#F4C5BC]/60 text-[#C84B31] font-bold text-[11px] uppercase tracking-wider mb-2.5">
              <span>Étape {step} sur {totalSteps}</span>
            </span>
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-neutral-900 dark:text-neutral-100 leading-tight">
              {step === 1 && "Quel livre voulez-vous créer ?"}
              {step === 2 && "Détails du projet"}
              {step === 3 && (isStorybook ? "Vos illustrations" : "Sujet & Direction éditoriale")}
              {step === 4 && "Format & Paramètres"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
              {step === 1 && "Choisissez le type d'ouvrage qui correspond le mieux à votre projet."}
              {step === 2 && "Les informations fondamentales pour calibrer votre futur ouvrage."}
              {step === 3 && (isStorybook ? "Importez les images qui composeront votre conte." : "Définissez les thèmes, le ton et le contexte pour guider la rédaction IA.")}
              {step === 4 && "Ajustez le volume et la structure avant de démarrer."}
            </p>
          </div>

          <form className="flex-1 flex flex-col" onSubmit={step === totalSteps ? handlePreSubmit : (e) => { e.preventDefault(); nextStep(); }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5 sm:space-y-6 flex-1"
              >
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {BLUEPRINT_LIST.map((blueprint) => {
                        const selected = formData.blueprintId === blueprint.id;
                        let IconComp = BookOpen;
                        if (blueprint.icon === "Compass") IconComp = Compass;
                        if (blueprint.icon === "FileText") IconComp = FileText;
                        if (blueprint.icon === "ImagePlay") IconComp = ImagePlay;
                        
                        return (
                          <button
                            type="button"
                            key={blueprint.id}
                            onClick={() => handleBlueprintSelect(blueprint.id as BlueprintId)}
                            className={`p-5 rounded-2xl border text-left transition-all flex flex-col gap-3 cursor-pointer ${
                              selected 
                                ? "border-[#C84B31] bg-[#FDF3F1] shadow-2xs" 
                                : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 hover:bg-neutral-50"
                            }`}
                          >
                            <div className="flex items-start justify-between w-full">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? "bg-[#C84B31] text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"}`}>
                                <IconComp className="w-5 h-5" />
                              </div>
                              <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected ? "border-[#C84B31]" : "border-neutral-300"}`}>
                                {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#C84B31]" />}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`block text-base font-bold ${selected ? "text-[#C84B31]" : "text-neutral-900 dark:text-neutral-100"}`}>
                                  {blueprint.label}
                                </span>
                                {blueprint.id === "storybook" && (
                                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold tracking-wide uppercase">✨ Nouveau</span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-neutral-500 mb-2 block">
                                {blueprint.tag}
                              </span>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                                {blueprint.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {isStorybook && (
                      <div className="mt-4 p-4 rounded-xl bg-[#FDF3F1] border border-[#F4C5BC] text-[#C84B31] text-sm flex items-start gap-3">
                        <span>📸 Uploadez vos dessins ou photos — Iris écrira l'histoire en les analysant page par page.</span>
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Titre du livre *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => updateForm("title", e.target.value)}
                        placeholder="Ex: Le Guide Complet de la Négociation"
                        className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                      />
                    </div>
                    
                    {!isStorybook && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Sous-titre (optionnel)</label>
                        <input
                          type="text"
                          value={formData.subtitle}
                          onChange={(e) => updateForm("subtitle", e.target.value)}
                          placeholder="Ex: Les méthodes éprouvées pour convaincre"
                          className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {!isStorybook && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Catégorie *</label>
                          <select
                            required
                            value={formData.category}
                            onChange={(e) => updateForm("category", e.target.value)}
                            className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all appearance-none cursor-pointer"
                          >
                            <option value="" disabled>Sélectionner...</option>
                            <option value="Roman / Fiction">Roman / Fiction</option>
                            <option value="Business & Entrepreneuriat">Business & Entrepreneuriat</option>
                            <option value="Développement Personnel">Développement Personnel</option>
                            <option value="Guide Pratique">Guide Pratique / Formation</option>
                            <option value="Biographie">Biographie</option>
                          </select>
                        </div>
                      )}
                      
                      <div className={`space-y-1.5 ${isStorybook ? 'sm:col-span-2' : ''}`}>
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Public cible *</label>
                        <input
                          type="text"
                          required
                          value={formData.audience}
                          onChange={(e) => updateForm("audience", e.target.value)}
                          placeholder="Ex: Professionnels, grand public..."
                          className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                        />
                      </div>
                    </div>

                    {isStorybook && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Personnages</label>
                        <textarea
                          value={formData.characters}
                          onChange={(e) => updateForm("characters", e.target.value)}
                          placeholder="Décrivez votre personnage principal (ex: Kofi, 7 ans, t-shirt rayé bleu et blanc, casquette rouge)"
                          rows={3}
                          className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all resize-none"
                        />
                      </div>
                    )}
                  </>
                )}

                {step === 3 && (
                  <>
                    {isStorybook ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            Vos dessins &amp; photos * ({uploadedImages.length}/{MAX_ASSETS})
                          </label>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                            Importez les images dans l&apos;ordre de l&apos;histoire. L&apos;IA les analyse une par une
                            et écrit un conte qui les relie — une image par page.
                          </p>
                        </div>

                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDraggingAssets(true); }}
                          onDragLeave={() => setIsDraggingAssets(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingAssets(false);
                            handleImageUpload(e.dataTransfer.files);
                          }}
                          onClick={() => imageInputRef.current?.click()}
                          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                            isDraggingAssets
                              ? "border-[#C84B31] bg-[#FDF3F1]"
                              : "border-neutral-300 bg-neutral-50/70 hover:border-[#C84B31]/60 hover:bg-[#FDF3F1]/40"
                          }`}
                        >
                          <Upload className="w-7 h-7 mx-auto text-[#C84B31] mb-2" />
                          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                            {isUploading ? "Préparation en cours…" : "Glissez vos dessins ou photos ici"}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                            ou cliquez pour parcourir
                          </p>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => { handleImageUpload(e.target.files); e.target.value = ""; }}
                          />
                        </div>

                        {assetsError && (
                          <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            {assetsError}
                          </p>
                        )}

                        {uploadedImages.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {uploadedImages.map((asset, index) => (
                              <div key={asset.id} className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 aspect-square">
                                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#C84B31] text-white text-[10px] font-bold flex items-center justify-center">
                                  {index + 1}
                               </span>
                                <button
                                  type="button"
                                  onClick={() => removeAsset(asset.id)}
                                  aria-label={`Retirer ${asset.name}`}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                {asset.analysisStatus === "failed" && (
                                  <div className="absolute inset-0 bg-red-900/40 flex flex-col items-center justify-center gap-2 p-2">
                                    <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded shadow">⚠️ Analyse échouée</span>
                                    <button
                                      type="button"
                                      onClick={() => retryAsset(asset.path)}
                                      className="text-[10px] font-semibold text-white border border-white/50 bg-black/40 rounded px-2 py-1 hover:bg-black/60 transition"
                                    >
                                      Réessayer
                                    </button>
                                  </div>
                                )}
                                <div className="absolute bottom-1 inset-x-1 flex justify-between opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                                  <button
                                    type="button"
                                    onClick={() => moveAsset(index, -1)}
                                    disabled={index === 0}
                                    aria-label="Déplacer vers la gauche"
                                    className="w-5 h-5 rounded bg-black/60 text-white text-xs disabled:opacity-30"
                                  >
                                    ‹
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveAsset(index, 1)}
                                    disabled={index === uploadedImages.length - 1}
                                    aria-label="Déplacer vers la droite"
                                    className="w-5 h-5 rounded bg-black/60 text-white text-xs disabled:opacity-30"
                                  >
                                    ›
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                              Synopsis &amp; Idée principale *
                            </label>
                            <button type="button" className="text-[11px] flex items-center gap-1 font-semibold text-[#C84B31] bg-[#FDF3F1] px-2.5 py-0.5 rounded-full border border-[#F4C5BC]/60">
                              <Sparkles className="w-3 h-3 text-[#C84B31]" />
                              <span>Assistant IA</span>
                            </button>
                          </div>
                          <div className="relative">
                            <textarea
                              required
                              value={formData.synopsis}
                              onChange={(e) => updateForm("synopsis", e.target.value)}
                              placeholder="De quoi parle votre livre ? Idée directrice, message clé, thèmes abordés ou résumé de l'intrigue..."
                              rows={5}
                              className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 pb-12 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all resize-none"
                            />
                            <button 
                              type="button" 
                              onClick={toggleListening}
                              className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                                isListening 
                                  ? 'bg-red-500 text-white animate-pulse' 
                                  : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-[#C84B31] hover:border-[#F4C5BC] hover:bg-[#FDF3F1]'
                              }`}
                              disabled={!isSpeechSupported}
                              aria-pressed={isListening}
                              title={!isSpeechSupported ? "Non supporté" : isListening ? "Arrêter" : "Dicter"}
                            >
                              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                            </button>
                          </div>
                          {isListening && (
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic min-h-[16px]" aria-live="polite">
                              {interimTranscript ? `« ${interimTranscript} »` : "Parlez, j'écoute…"}
                            </p>
                          )}
                          {speechError && (
                            <p className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                              {speechError}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Ton &amp; Style *</label>
                            <select
                              required
                              value={formData.tone}
                              onChange={(e) => updateForm("tone", e.target.value)}
                              className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all appearance-none cursor-pointer"
                            >
                              <option value="" disabled>Sélectionner...</option>
                              <option value="Sérieux et Didactique">Sérieux &amp; Pédagogique</option>
                              <option value="Inspirant et Motivationnel">Inspirant &amp; Motivationnel</option>
                              <option value="Humoristique et Décalé">Humoristique &amp; Décalé</option>
                              <option value="Épique et Descriptif">Épique &amp; Descriptif</option>
                              <option value="Familier et Accessible">Familier &amp; Accessible</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Concepts ou Personnages</label>
                            <input
                              type="text"
                              value={formData.characters}
                              onChange={(e) => updateForm("characters", e.target.value)}
                              placeholder="Optionnel (ex: Héros, notions clés...)"
                              className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                            />
                          </div>
                        </div>

                        {/* Document de référence */}
                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Document source (Optionnel)</label>
                            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">20 crédits / analyse</span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: "inspiration", label: "S'inspirer", icon: "lightbulb" },
                              { id: "learn", label: "Apprendre", icon: "school" },
                              { id: "style", label: "Style / Ton", icon: "brush" },
                              { id: "reference", label: "Référence", icon: "menu_book" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setRefPurpose(opt.id as typeof refPurpose)}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                  refPurpose === opt.id
                                    ? "border-[#C84B31] bg-[#FDF3F1] text-[#C84B31]"
                                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">{opt.icon}</span>
                                <span>{opt.label}</span>
                              </button>
                            ))}
                          </div>

                          <input
                            ref={referenceInputRef}
                            type="file"
                            accept=".pdf,.docx,.epub,.txt,.md,.markdown"
                            className="hidden"
                            onChange={(e) => { handleReferenceFile(e.target.files?.[0] || null); e.target.value = ""; }}
                          />

                          {referenceDoc && refStatus === "done" ? (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="text-xs font-semibold text-emerald-900 truncate">{referenceDoc.name}</span>
                              </div>
                              <button type="button" onClick={() => { setReferenceDoc(null); setRefStatus("idle"); }} className="text-neutral-400 hover:text-red-500 transition-colors p-1" title="Supprimer">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => referenceInputRef.current?.click()}
                              disabled={refStatus === "working"}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-neutral-300 hover:border-[#C84B31]/50 text-neutral-600 dark:text-neutral-400 hover:text-[#C84B31] text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 bg-neutral-50/50 hover:bg-[#FDF3F1]/40"
                            >
                              {refStatus === "working" ? (
                                <>
                                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                  <span>Analyse en cours…</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Importer un document source (.pdf, .docx, .txt...)</span>
                                </>
                              )}
                            </button>
                          )}
                          {refStatus === "error" && refError && (
                            <p className="text-xs text-red-600 font-medium">{refError}</p>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {step === 4 && (
                  <>
                    {!isStorybook ? (
                      <>
                        <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Longueur estimée *</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: "Court (Nouvelle / Lead Magnet)", label: "Court", pages: "~50 pages" },
                          { id: "Moyen (Roman standard)", label: "Moyen", pages: "~150 pages" },
                          { id: "Long (Fresque / Manuel)", label: "Long", pages: "~300 pages" },
                        ].map((opt) => {
                          const selected = formData.length === opt.id;
                          return (
                            <div 
                              key={opt.id}
                              onClick={() => updateForm("length", opt.id)}
                              className={`border rounded-2xl p-4 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-1 ${
                                selected 
                                  ? 'border-[#C84B31] bg-[#FDF3F1]/60 shadow-2xs' 
                                  : 'border-neutral-200 bg-white hover:bg-neutral-50/60'
                              }`}
                            >
                              <span className={`text-sm font-bold ${selected ? 'text-[#C84B31]' : 'text-neutral-800'}`}>{opt.label}</span>
                              <span className="text-xs text-neutral-400 font-medium">{opt.pages}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Devis épuré */}
                    {(() => {
                      const preset = SIZE_PRESETS[lengthToSizeKey(formData.length)];
                      const pages = preset.pagesEstimate;
                      return (
                        <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 p-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">Volume estimé</span>
                            <span className="font-bold text-neutral-900 dark:text-neutral-100">~{pages} pages ({preset.pages})</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">Coût estimé</span>
                            <span className="font-bold text-[#C84B31] text-sm">
                              {estimatePagesCoins(pages, "gemini-3.6-flash").toLocaleString("fr-FR")} à {estimatePagesCoins(pages, "claude-sonnet-5").toLocaleString("fr-FR")} crédits
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                    ) : (
                      <div className="rounded-2xl border border-[#C84B31] bg-[#FDF3F1]/60 p-5 flex flex-col items-center justify-center text-center gap-2">
                        <Sparkles className="w-8 h-8 text-[#C84B31] mb-1" />
                        <span className="text-base font-bold text-[#C84B31]">Votre album — {uploadedImages.length} pages illustrées</span>
                        <p className="text-xs text-[#C84B31]/80 max-w-sm">Chaque image que vous avez importée deviendra une page richement décrite de votre conte.</p>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Consignes spécifiques (Optionnel)</label>
                      <textarea
                        value={formData.instructions}
                        onChange={(e) => updateForm("instructions", e.target.value)}
                        placeholder="Ex: Tutoie le lecteur, ajoute des exemples concrets à chaque chapitre..."
                        rows={3}
                        className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all resize-none"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={formData.includeToc}
                          onChange={(e) => updateForm("includeToc", e.target.checked)}
                        />
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${formData.includeToc ? 'bg-[#C84B31] border-[#C84B31]' : 'bg-white dark:bg-neutral-900 border-neutral-300'}`}>
                          {formData.includeToc && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                          Générer une table des matières structurée avant la rédaction
                        </span>
                      </label>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto pt-6 pb-24 sm:pb-0 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-sm hover:bg-neutral-50 dark:bg-neutral-800/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-[#C84B31] hover:bg-[#B83E26] text-white px-7 py-3 rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {step === totalSteps ? (
                  isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span>Création en cours...</span>
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    </div>
                  ) : (
                    <>
                      <span>Générer mon livre</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )
                ) : (
                  <>
                    <span>Continuer</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
        
        {/* Model Selection Modal */}
        <AnimatePresence>
          {showModelModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 relative"
              >
                <button
                  onClick={() => setShowModelModal(false)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="text-center mb-5">
                  <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-neutral-900 dark:text-neutral-100 mb-1">Moteur d&apos;Écriture IA</h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                    Sélectionnez l&apos;intelligence artificielle qui rédigera votre ouvrage.
                  </p>
                </div>

                <div className="space-y-2.5 mb-6">
                  <div 
                    onClick={() => setSelectedModel("gemini-3.6-flash")}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedModel === "gemini-3.6-flash" 
                        ? "border-[#C84B31] bg-[#FDF3F1]/40 shadow-xs" 
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">Gemini 2.5 Flash</span>
                      <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                        Rapide &amp; Économique
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                      Modèle vif et direct, idéal pour les ébauches et les guides synthétiques.
                    </p>
                  </div>

                  <div 
                    onClick={() => setSelectedModel("gpt-4o")}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedModel === "gpt-4o" 
                        ? "border-[#C84B31] bg-[#FDF3F1]/40 shadow-xs" 
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">ChatGPT (GPT-4o mini)</span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Équilibré
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                      Excellente nuance d&apos;analyse et logique rigoureuse pour les manuels et essais.
                    </p>
                  </div>

                  <div 
                    onClick={() => setSelectedModel("claude-sonnet-5")}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedModel === "claude-sonnet-5" 
                        ? "border-[#C84B31] bg-[#FDF3F1]/40 shadow-xs" 
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">Claude 3.5 Sonnet</span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Style Littéraire Supérieur
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                      Vocabulaire riche, sens du rythme narratif et élégance d&apos;écriture d&apos;exception.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowModelModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-sm hover:bg-neutral-50 dark:bg-neutral-800/50 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 bg-[#C84B31] hover:bg-[#B83E26] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    <span>Lancer la création</span>
                    <Rocket className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}
