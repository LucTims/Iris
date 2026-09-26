"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { SIZE_PRESETS, BOOK_MODELS, LENGTH_OPTIONS, estimatePagesCoins, lengthToSizeKey, coinsPerPage } from "@/lib/book/generationPresets";
import { BOOK_CATEGORIES, BOOK_TONES, EMPTY_IDEA_ANALYSIS, type IdeaAnalysis } from "@/lib/book/ideaAnalysis";
import { useUser } from "@/hooks/useUser";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { WORK_TYPES, WORK_TYPE_META, type WorkType } from "@/lib/book/work-type";
import { BLUEPRINT_LIST, type BlueprintId } from "@/lib/book/book-blueprint";
import { BookOpen, Compass, FileText, Sparkles, Mic, MicOff, Check, ArrowRight, ArrowLeft, Upload, X, ImagePlay, MessageCircleQuestion, AlertTriangle, ChevronDown, Coins } from "lucide-react";
import { IrisMark } from "@/components/IrisLogo";

/** Catégorie cohérente avec le type d'ouvrage, quand Iris n'a rien pu proposer. */
const categoryForBlueprint = (id: BlueprintId): string =>
  id === "roman" ? "Roman / Fiction" : id === "guide" ? "Guide Pratique" : id === "storybook" ? "Roman / Fiction" : "Business & Entrepreneuriat";

/** La catégorie proposée par Iris contredit-elle le type d'ouvrage choisi à l'étape 1 ? */
const blueprintMismatch = (id: BlueprintId, category: string): string | null => {
  if (!category) return null;
  const isFiction = category === "Roman / Fiction";
  if (id === "roman" && !isFiction) return `Votre idée ressemble plutôt à un ouvrage « ${category} » alors que vous avez choisi Roman.`;
  if ((id === "guide" || id === "ebook") && isFiction) return "Votre idée ressemble plutôt à une fiction alors que vous avez choisi un ouvrage pratique.";
  return null;
};

const MODEL_STORAGE_KEY = "iris_book_gen_model";

export default function NewBookWizard() {
  const router = useRouter();
  const { walletBalance, loading: userLoading } = useUser();
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
    length: LENGTH_OPTIONS[1].value,
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

  const nextStep = async () => {
    if (step >= totalSteps) return;
    // En quittant l'étape « idée », Iris choisit catégorie, public, ton et
    // style : l'auteur les retrouve pré-remplis (et modifiables) à l'étape 4.
    if (step === 3 && formData.blueprintId !== "storybook") {
      await analyzeIdea();
    }
    setStep(step + 1);
    scrollToTop();
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
  // Modèle d'écriture choisi UNE fois, ici, puis enregistré sur le projet :
  // l'éditeur ne redemande plus ni la longueur ni le modèle.
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window === "undefined") return BOOK_MODELS[0].id;
    try {
      const saved = localStorage.getItem(MODEL_STORAGE_KEY);
      return saved && BOOK_MODELS.some((m) => m.id === saved) ? saved : BOOK_MODELS[0].id;
    } catch {
      return BOOK_MODELS[0].id;
    }
  });

  /* ------------------------------------------------------------------ *
   * IRIS ANALYSE L'IDÉE — catégorie, public, ton et style proposés.
   * ------------------------------------------------------------------ */
  const [ideaAnalysis, setIdeaAnalysis] = useState<IdeaAnalysis | null>(null);
  const [analyzedFor, setAnalyzedFor] = useState("");
  const [ideaStatus, setIdeaStatus] = useState<"idle" | "working" | "error">("idle");
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Questions facultatives d'Iris pour préciser une idée floue.
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionsStatus, setQuestionsStatus] = useState<"idle" | "working" | "error">("idle");
  // Document déposé comme idée principale.
  const ideaDocInputRef = useRef<HTMLInputElement>(null);
  const [ideaDocStatus, setIdeaDocStatus] = useState<"idle" | "working" | "error">("idle");
  const [ideaDocName, setIdeaDocName] = useState("");
  const [ideaDocError, setIdeaDocError] = useState("");

  const ideaKey = `${formData.title}|${formData.subtitle}|${formData.synopsis}`;

  /** Applique la proposition d'Iris aux champs encore vides (l'auteur garde la main). */
  const applyIdeaAnalysis = (a: IdeaAnalysis, opts: { replaceSynopsis?: boolean } = {}) => {
    setIdeaAnalysis(a);
    setFormData((prev) => ({
      ...prev,
      category: a.category || prev.category || categoryForBlueprint(prev.blueprintId),
      audience: prev.audience || a.audience,
      tone: a.tone || prev.tone || "Familier et Accessible",
      characters: prev.characters || a.characters,
      synopsis: opts.replaceSynopsis && a.synopsis ? a.synopsis : prev.synopsis,
    }));
  };

  const callAnalyzeIdea = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/analyze-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formData.title, subtitle: formData.subtitle, bookType: formData.blueprintId, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Analyse impossible.");
    return data;
  };

  const analyzeIdea = async (): Promise<void> => {
    if (analyzedFor === ideaKey && ideaAnalysis) return;
    setIdeaStatus("working");
    try {
      const data = await callAnalyzeIdea({ idea: formData.synopsis });
      applyIdeaAnalysis({ ...EMPTY_IDEA_ANALYSIS, ...(data.analysis || {}) });
      setAnalyzedFor(ideaKey);
      setIdeaStatus("idle");
    } catch {
      // Jamais bloquant : l'auteur choisira lui-même à l'étape suivante.
      setFormData((prev) => ({
        ...prev,
        category: prev.category || categoryForBlueprint(prev.blueprintId),
        tone: prev.tone || "Familier et Accessible",
      }));
      setIdeaStatus("error");
    }
  };

  const askIrisQuestions = async () => {
    setQuestionsStatus("working");
    try {
      const data = await callAnalyzeIdea({ mode: "questions", idea: formData.synopsis });
      const list: string[] = Array.isArray(data.questions) ? data.questions : [];
      setQuestions(list);
      setAnswers(list.map(() => ""));
      setQuestionsStatus(list.length ? "idle" : "error");
    } catch {
      setQuestionsStatus("error");
    }
  };

  const addAnswersToIdea = () => {
    const qa = questions
      .map((q, i) => (answers[i]?.trim() ? `${q} ${answers[i].trim()}` : ""))
      .filter(Boolean)
      .join("\n");
    if (!qa) return;
    setFormData((prev) => ({ ...prev, synopsis: [prev.synopsis.trim(), qa].filter(Boolean).join("\n\n") }));
    setQuestions([]);
    setAnswers([]);
  };

  const handleIdeaDocument = async (file: File | null) => {
    if (!file) return;
    setIdeaDocStatus("working");
    setIdeaDocError("");
    try {
      const { extractDocumentText } = await import("@/lib/parser/extractText");
      const { text } = await extractDocumentText(file);
      if (!text || text.trim().length < 20) throw new Error("Ce document ne contient pas assez de texte.");
      const data = await callAnalyzeIdea({ documentText: text, idea: formData.synopsis });
      const analysis: IdeaAnalysis = { ...EMPTY_IDEA_ANALYSIS, ...(data.analysis || {}) };
      if (!analysis.synopsis) analysis.synopsis = text.trim().slice(0, 2500);
      applyIdeaAnalysis(analysis, { replaceSynopsis: true });
      setIdeaDocName(file.name);
      setIdeaDocStatus("idle");
      // La clé d'analyse suit la nouvelle idée : pas de seconde analyse inutile.
      setAnalyzedFor(`${formData.title}|${formData.subtitle}|${analysis.synopsis}`);
    } catch (err) {
      setIdeaDocError(err instanceof Error ? err.message : "Lecture du document impossible.");
      setIdeaDocStatus("error");
    }
  };

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

  // Une seule validation : le bouton « Créer mon livre » de l'étape 4 crée le
  // projet directement (plus de fenêtre de choix du modèle en second).
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStorybook && uploadedImages.length < 2) {
      setAssetsError("Importez au moins 2 images pour construire votre conte.");
      setStep(3); // Step 3 is where the images are
      return;
    }
    void handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      try {
        localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
      } catch {
        /* stockage indisponible : le modèle reste enregistré sur le projet */
      }
      // Le style recommandé par Iris accompagne les consignes de l'auteur.
      const styleNote = ideaAnalysis?.style ? `Style d'écriture recommandé : ${ideaAnalysis.style}` : "";
      const submitted = {
        ...formData,
        category: formData.category || categoryForBlueprint(formData.blueprintId),
        tone: formData.tone || "Familier et Accessible",
        instructions: [formData.instructions.trim(), styleNote].filter(Boolean).join("\n"),
      };
      const projectContext = {
        ...submitted,
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
          ...submitted,
          blueprintId: formData.blueprintId,
          model: selectedModel,
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
        try {
          localStorage.setItem(`iris_project_model_${data.project.id}`, selectedModel);
        } catch {
          /* ignore */
        }

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
              {step === 2 && "Le titre de votre livre"}
              {step === 3 && (isStorybook ? "Vos illustrations" : "Votre idée")}
              {step === 4 && (isStorybook ? "Format & Paramètres" : "Réglages & lancement")}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
              {step === 1 && "Choisissez le type d'ouvrage qui correspond le mieux à votre projet."}
              {step === 2 && "Les informations fondamentales pour calibrer votre futur ouvrage."}
              {step === 3 && (isStorybook ? "Importez les images qui composeront votre conte." : "Décrivez votre livre avec vos mots — Iris s'occupe du reste.")}
              {step === 4 && (isStorybook ? "Ajustez le volume et la structure avant de démarrer." : "Vérifiez les choix d'Iris, la longueur et le moteur d'écriture.")}
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

                    {isStorybook ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Public cible *</label>
                        <input
                          type="text"
                          required
                          value={formData.audience}
                          onChange={(e) => updateForm("audience", e.target.value)}
                          placeholder="Ex: Enfants de 4 à 7 ans"
                          className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                        />
                      </div>
                    ) : (
                      <p className="flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800 rounded-xl px-3 py-2.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C84B31] shrink-0 mt-0.5" />
                        <span>Pas besoin de choisir la catégorie, le public ni le ton : à l&apos;étape suivante, vous décrivez votre idée et Iris les choisit pour vous.</span>
                      </p>
                    )}

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
                          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            Votre idée principale *
                          </label>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                            Écrivez librement, avec vos mots : le sujet, le message, ce que le lecteur doit retenir. Iris choisira ensuite la catégorie, le public, le ton et le style.
                          </p>
                          <div className="relative">
                            <textarea
                              required
                              value={formData.synopsis}
                              onChange={(e) => updateForm("synopsis", e.target.value)}
                              placeholder="Ex : Je veux aider les jeunes diplômés d'Afrique francophone à trouver leur premier emploi grâce au numérique, avec des méthodes concrètes et des témoignages…"
                              rows={6}
                              className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all pb-12 resize-none"
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

                        {/* Idée déjà écrite ailleurs : le document devient l'idée principale. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            ref={ideaDocInputRef}
                            type="file"
                            accept=".pdf,.docx,.epub,.txt,.md,.markdown"
                            className="hidden"
                            onChange={(e) => { handleIdeaDocument(e.target.files?.[0] || null); e.target.value = ""; }}
                          />
                          <button
                            type="button"
                            onClick={() => ideaDocInputRef.current?.click()}
                            disabled={ideaDocStatus === "working"}
                            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-dashed border-neutral-300 hover:border-[#C84B31]/50 text-neutral-700 dark:text-neutral-300 hover:text-[#C84B31] text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 bg-neutral-50/50 hover:bg-[#FDF3F1]/40"
                          >
                            {ideaDocStatus === "working" ? (
                              <>
                                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                <span>Iris lit votre document…</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>Utiliser un document comme idée principale</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={askIrisQuestions}
                            disabled={questionsStatus === "working" || !formData.title.trim()}
                            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-[#F4C5BC]/70 bg-[#FDF3F1]/60 text-[#C84B31] text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 hover:bg-[#FDF3F1]"
                          >
                            {questionsStatus === "working" ? (
                              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                            ) : (
                              <MessageCircleQuestion className="w-3.5 h-3.5" />
                            )}
                            <span>Iris me pose des questions (facultatif)</span>
                          </button>
                        </div>
                        {ideaDocName && ideaDocStatus === "idle" && (
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                            Idée tirée de « {ideaDocName} » — relisez-la et ajustez-la si besoin.
                          </p>
                        )}
                        {ideaDocStatus === "error" && ideaDocError && (
                          <p className="text-xs text-red-600 font-medium">{ideaDocError}</p>
                        )}
                        {questionsStatus === "error" && (
                          <p className="text-xs text-red-600 font-medium">Iris n&apos;a pas pu préparer de questions. Réessayez dans un instant.</p>
                        )}

                        {questions.length > 0 && (
                          <div className="rounded-2xl border border-[#F4C5BC]/70 bg-[#FDF3F1]/40 p-4 space-y-3">
                            <p className="text-xs font-bold text-[#C84B31]">Répondez à celles qui vous inspirent, Iris complètera votre idée :</p>
                            {questions.map((q, i) => (
                              <div key={i} className="space-y-1">
                                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{q}</label>
                                <input
                                  type="text"
                                  value={answers[i] || ""}
                                  onChange={(e) => setAnswers((prev) => prev.map((v, k) => (k === i ? e.target.value : v)))}
                                  className="w-full bg-neutral-50/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all py-2"
                                />
                              </div>
                            ))}
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" onClick={() => { setQuestions([]); setAnswers([]); }} className="text-xs font-semibold text-neutral-500 px-3 py-2">
                                Ignorer
                              </button>
                              <button
                                type="button"
                                onClick={addAnswersToIdea}
                                disabled={!answers.some((a) => a.trim())}
                                className="text-xs font-bold text-white bg-[#C84B31] hover:bg-[#B83E26] rounded-xl px-3.5 py-2 disabled:opacity-50"
                              >
                                Ajouter mes réponses à l&apos;idée
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Précisions facultatives, repliées par défaut. */}
                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                          <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                            aria-expanded={showAdvanced}
                          >
                            <span>Affiner (facultatif) : personnages, document de référence</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                          </button>
                          {showAdvanced && (
                            <div className="mt-3 space-y-4">
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
                            {/* Document de référence */}
                            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Document de référence (inspiration, style…)</label>
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
                            </div>
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
                        {/* Réglages choisis par Iris à partir de l'idée — modifiables. */}
                        <div className="rounded-2xl border border-[#F4C5BC]/70 bg-[#FDF3F1]/40 p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-[#C84B31] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Iris a choisi pour vous</p>
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                                {ideaStatus === "error"
                                  ? "Iris n'a pas pu analyser votre idée : vérifiez ces réglages."
                                  : ideaAnalysis?.reason || "D'après votre idée. Vous pouvez tout modifier."}
                              </p>
                            </div>
                          </div>

                          {blueprintMismatch(formData.blueprintId, formData.category) && (
                            <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span className="flex-1">{blueprintMismatch(formData.blueprintId, formData.category)}</span>
                              <button
                                type="button"
                                onClick={() => handleBlueprintSelect(formData.category === "Roman / Fiction" ? "roman" : "guide")}
                                className="font-bold underline shrink-0"
                              >
                                {formData.category === "Roman / Fiction" ? "Passer en Roman" : "Passer en Guide"}
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Catégorie</label>
                              <select value={formData.category} onChange={(e) => updateForm("category", e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all appearance-none cursor-pointer">
                                <option value="" disabled>Sélectionner...</option>
                                {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ton</label>
                              <select value={formData.tone} onChange={(e) => updateForm("tone", e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all appearance-none cursor-pointer">
                                <option value="" disabled>Sélectionner...</option>
                                {BOOK_TONES.map((t) => <option key={t} value={t}>{t.replace(" et ", " & ")}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Public cible</label>
                              <input
                                type="text"
                                value={formData.audience}
                                onChange={(e) => updateForm("audience", e.target.value)}
                                placeholder="Ex: Jeunes diplômés, entrepreneurs débutants…"
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                              />
                            </div>
                          </div>
                          {ideaAnalysis?.style && (
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400"><span className="font-bold">Style :</span> {ideaAnalysis.style}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Longueur</label>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {LENGTH_OPTIONS.map((opt) => {
                              const preset = SIZE_PRESETS[opt.sizeKey];
                              const selected = lengthToSizeKey(formData.length) === opt.sizeKey;
                              return (
                                <button
                                  type="button"
                                  key={opt.value}
                                  onClick={() => updateForm("length", opt.value)}
                                  className={`border rounded-2xl p-3 sm:p-4 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                                    selected
                                      ? 'border-[#C84B31] bg-[#FDF3F1]/60 shadow-2xs'
                                      : 'border-neutral-200 bg-white hover:bg-neutral-50/60'
                                  }`}
                                >
                                  <span className={`text-sm font-bold ${selected ? 'text-[#C84B31]' : 'text-neutral-800'}`}>{preset.label}</span>
                                  <span className="text-[11px] text-neutral-500 font-medium">{preset.pages}</span>
                                  <span className="hidden sm:block text-[10px] text-neutral-400">{preset.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Modèle d'écriture : choisi ici, une seule fois. */}
                        {(() => {
                          const pages = SIZE_PRESETS[lengthToSizeKey(formData.length)].pagesEstimate;
                          const cost = estimatePagesCoins(pages, selectedModel);
                          const balance = userLoading ? null : walletBalance;
                          return (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Moteur d&apos;écriture</label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {BOOK_MODELS.map((m) => {
                                  const selected = selectedModel === m.id;
                                  return (
                                    <button
                                      type="button"
                                      key={m.id}
                                      onClick={() => setSelectedModel(m.id)}
                                      className={`text-left border rounded-2xl p-3 transition-all cursor-pointer ${
                                        selected ? 'border-[#C84B31] bg-[#FDF3F1]/60 shadow-2xs' : 'border-neutral-200 bg-white hover:bg-neutral-50/60'
                                      }`}
                                    >
                                      <span className={`block text-sm font-bold ${selected ? 'text-[#C84B31]' : 'text-neutral-800'}`}>{m.label}</span>
                                      <span className="block text-[11px] text-neutral-500">{m.hint}</span>
                                      <span className="block text-[11px] font-semibold text-neutral-700 mt-1">
                                        {coinsPerPage(m.id)} pièces / page · ≈ {estimatePagesCoins(pages, m.id).toLocaleString("fr-FR")}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300">
                                  <Coins className="w-3.5 h-3.5 text-[#C84B31]" />
                                  Coût estimé du livre (~{pages} pages)
                                </span>
                                <span className="font-bold text-[#C84B31] text-sm">≈ {cost.toLocaleString("fr-FR")} pièces</span>
                                {balance !== null && (
                                  <span className={`w-full text-[11px] ${balance < cost ? "text-amber-700 font-semibold" : "text-neutral-500"}`}>
                                    Votre solde : {balance.toLocaleString("fr-FR")} pièces
                                    {balance < cost ? " — rechargez avant de lancer la rédaction du livre (la création et le sommaire restent possibles)." : "."}
                                    {" "}Iris prépare d&apos;abord le sommaire ; vous lancez ensuite la rédaction depuis l&apos;éditeur et suivez les pièces utilisées en direct.
                                  </span>
                                )}
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
                disabled={isSubmitting || ideaStatus === "working" || ideaDocStatus === "working"}
                className={`bg-[#C84B31] hover:bg-[#B83E26] text-white px-6 sm:px-7 py-3 rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {step === totalSteps ? (
                  isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span>Création en cours...</span>
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    </div>
                  ) : (
                    <>
                      <span>Créer mon livre</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )
                ) : ideaStatus === "working" ? (
                  <>
                    <span>Iris analyse votre idée…</span>
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  </>
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
        
      </main>
      </div>
    </div>
  );
}
