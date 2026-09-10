"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { SIZE_PRESETS, BOOK_MODELS, estimatePagesCoins } from "@/lib/book/generationPresets";
import type { BookSizeKey } from "@/lib/book/generationPresets";
import { useUser } from "@/hooks/useUser";
import { WORK_TYPES, WORK_TYPE_META, type WorkType } from "@/lib/book/work-type";
import { BookOpen, Compass, FileText, Sparkles, Mic, MicOff, Check, ArrowRight, ArrowLeft, Upload, X, Rocket, Layers } from "lucide-react";

// Associe le libellé de longueur du formulaire à une clé de preset.
const lengthToSizeKey = (length: string): BookSizeKey =>
  /court/i.test(length) ? "court" : /long/i.test(length) ? "long" : "moyen";

export default function NewBookWizard() {
  const router = useRouter();
  const { walletBalance } = useUser();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const formContainerRef = useRef<HTMLDivElement>(null);
  
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    category: "",
    audience: "",
    synopsis: "",
    tone: "",
    characters: "",
    length: "Moyen (Roman standard)",
    instructions: "",
    includeToc: true,
    // Forme de l'ouvrage : elle pilote la structure ET la mise en page.
    // Un livre se lit d'une traite, un guide se pratique, un ebook se parcourt.
    workType: "livre" as WorkType,
  });

  const updateForm = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setFormData(prev => ({ 
            ...prev, 
            synopsis: prev.synopsis + (prev.synopsis && !prev.synopsis.endsWith(' ') ? ' ' : '') + finalTranscript 
          }));
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Erreur de reconnaissance vocale:", event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  // Document de référence que l'IA analyse pour mieux écrire le livre
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

  // Intercept the final submit to show the modal first
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModelModal(true);
  };

  const handleSubmit = async () => {
    setShowModelModal(false);
    setIsSubmitting(true);

    try {
      const projectContext = {
        ...formData,
        model: selectedModel, // Pass selected model
        // Document de référence analysé : consommé par /redaction → generate-plan
        referenceDocument: referenceDoc || undefined,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem("iris_current_project", JSON.stringify(projectContext));

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, referenceDocument: referenceDoc || undefined })
      });

      if (!res.ok) {
        alert('Erreur lors de la création du projet. Veuillez vérifier votre connexion et réessayer.');
        return;
      }

      const data = await res.json();
      if (data.project?.id) {
        localStorage.setItem("iris_current_project_id", data.project.id);
        // We can pass the model in the URL or let it be picked up from localStorage in /redaction
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
      <div className="flex items-center justify-center gap-3 mb-8 w-full max-w-xl mx-auto px-6 sm:px-0">
        {[1, 2, 3].map((s) => (
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
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />
      <div id="main-scroll-container" className="flex-1 flex flex-col h-screen overflow-y-auto">
      {/* Top Navigation */}
      <header className="bg-white border-b border-neutral-200 h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <Link href="/projects" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-sm font-bold">Retour aux projets</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-heading font-extrabold text-xl text-secondary">Iris</span>
        </div>
        <div className="w-24"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-1 flex flex-col items-center pt-6 sm:pt-8 pb-0 sm:pb-20 px-0 sm:px-4">
        {/* Step Indicator */}
        {renderStepIndicators()}

        {/* Wizard Card */}
        <div ref={formContainerRef} className="bg-white rounded-t-[32px] sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] sm:shadow-xl border-t sm:border border-neutral-100 max-w-2xl w-full p-6 sm:p-10 relative overflow-y-auto flex-1 sm:flex-none flex flex-col">
          
          <div className="mb-6 sm:mb-8 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF3F1] border border-[#F4C5BC]/60 text-[#C84B31] font-bold text-[11px] uppercase tracking-wider mb-2.5">
              <span>Étape {step} sur {totalSteps}</span>
            </span>
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-neutral-900 leading-tight">
              {step === 1 && "Détails du projet"}
              {step === 2 && "Sujet & Direction éditoriale"}
              {step === 3 && "Format & Paramètres"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-snug">
              {step === 1 && "Les informations fondamentales pour calibrer votre futur ouvrage."}
              {step === 2 && "Définissez les thèmes, le ton et le contexte pour guider la rédaction IA."}
              {step === 3 && "Ajustez le volume et la structure avant de démarrer."}
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
                {/* STEP 1: Basic Details */}
                {step === 1 && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Titre du livre *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => updateForm("title", e.target.value)}
                        placeholder="Ex: Le Guide Complet de la Négociation"
                        className="w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Sous-titre (optionnel)</label>
                      <input
                        type="text"
                        value={formData.subtitle}
                        onChange={(e) => updateForm("subtitle", e.target.value)}
                        placeholder="Ex: Les méthodes éprouvées pour convaincre"
                        className="w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Format de l&apos;ouvrage *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: "livre", label: "Livre", tag: "Roman & Essai", icon: BookOpen },
                          { id: "guide", label: "Guide pratique", tag: "Méthodes & Étapes", icon: Compass },
                          { id: "ebook", label: "Ebook", tag: "Court & Direct", icon: FileText },
                        ].map((item) => {
                          const selected = formData.workType === item.id;
                          const IconComp = item.icon;
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => updateForm("workType", item.id as WorkType)}
                              aria-pressed={selected}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                                selected 
                                  ? "border-[#C84B31] bg-[#FDF3F1]/60 shadow-2xs" 
                                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/60"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selected ? "bg-[#C84B31] text-white" : "bg-neutral-100 text-neutral-700"}`}>
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selected ? "border-[#C84B31]" : "border-neutral-300"}`}>
                                  {selected && <span className="w-2 h-2 rounded-full bg-[#C84B31]" />}
                                </span>
                              </div>
                              <div>
                                <span className={`block text-sm font-bold ${selected ? "text-[#C84B31]" : "text-neutral-800"}`}>
                                  {item.label}
                                </span>
                                <span className="text-xs text-neutral-400 font-medium">
                                  {item.tag}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Catégorie *</label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) => updateForm("category", e.target.value)}
                          className="w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled>Sélectionner...</option>
                          <option value="Roman / Fiction">Roman / Fiction</option>
                          <option value="Business & Entrepreneuriat">Business & Entrepreneuriat</option>
                          <option value="Développement Personnel">Développement Personnel</option>
                          <option value="Guide Pratique">Guide Pratique / Formation</option>
                          <option value="Biographie">Biographie</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Public cible *</label>
                        <input
                          type="text"
                          required
                          value={formData.audience}
                          onChange={(e) => updateForm("audience", e.target.value)}
                          placeholder="Ex: Professionnels, grand public..."
                          className="w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 2: The Core */}
                {step === 2 && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Synopsis &amp; Idée principale *</label>
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
                          className="w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 pb-12 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all resize-none"
                        />
                        <button 
                          type="button" 
                          onClick={toggleListening}
                          className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                            isListening 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : 'bg-white border border-neutral-200 text-neutral-500 hover:text-[#C84B31] hover:border-[#F4C5BC] hover:bg-[#FDF3F1]'
                          }`}
                          title={isListening ? "Arrêter la dictée" : "Dicter vocalement"}
                        >
                          {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Ton &amp; Style *</label>
                        <select
                          required
                          value={formData.tone}
                          onChange={(e) => updateForm("tone", e.target.value)}
                          className="w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all appearance-none cursor-pointer"
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Concepts ou Personnages</label>
                        <input
                          type="text"
                          value={formData.characters}
                          onChange={(e) => updateForm("characters", e.target.value)}
                          placeholder="Optionnel (ex: Héros, notions clés...)"
                          className="w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all"
                        />
                      </div>
                    </div>

                    {/* Document de référence */}
                    <div className="pt-3 border-t border-neutral-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Document source (Optionnel)</label>
                        <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">20 crédits / analyse</span>
                      </div>

                      {/* Objectif de l'analyse */}
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
                                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
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
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-neutral-300 hover:border-[#C84B31]/50 text-neutral-600 hover:text-[#C84B31] text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 bg-neutral-50/50 hover:bg-[#FDF3F1]/40"
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

                {/* STEP 3: Structure */}
                {step === 3 && (
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
                        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-700">Volume estimé</span>
                            <span className="font-bold text-neutral-900">~{pages} pages ({preset.pages})</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                            <span className="font-semibold text-neutral-700">Coût estimé</span>
                            <span className="font-bold text-[#C84B31] text-sm">
                              {estimatePagesCoins(pages, "gemini-2.5-flash").toLocaleString("fr-FR")} à {estimatePagesCoins(pages, "claude-sonnet-5").toLocaleString("fr-FR")} crédits
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Consignes spécifiques (Optionnel)</label>
                      <textarea
                        value={formData.instructions}
                        onChange={(e) => updateForm("instructions", e.target.value)}
                        placeholder="Ex: Tutoie le lecteur, ajoute des exemples concrets à chaque chapitre..."
                        rows={3}
                        className="w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:border-[#C84B31] transition-all resize-none"
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
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${formData.includeToc ? 'bg-[#C84B31] border-[#C84B31]' : 'bg-white border-neutral-300'}`}>
                          {formData.includeToc && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                          Générer une table des matières structurée avant la rédaction
                        </span>
                      </label>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-auto pt-6 pb-24 sm:pb-0 border-t border-neutral-100 flex items-center justify-between shrink-0">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-sm hover:bg-neutral-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>
              ) : (
                <div /> // Spacer
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
                className="bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-md w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 relative"
              >
                <button
                  onClick={() => setShowModelModal(false)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="text-center mb-5">
                  <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-neutral-900 mb-1">Moteur d&apos;Écriture IA</h2>
                  <p className="text-xs sm:text-sm text-neutral-500">
                    Sélectionnez l&apos;intelligence artificielle qui rédigera votre ouvrage.
                  </p>
                </div>

                <div className="space-y-2.5 mb-6">
                  {/* Standard Model */}
                  <div 
                    onClick={() => setSelectedModel("gemini-2.5-flash")}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedModel === "gemini-2.5-flash" 
                        ? "border-[#C84B31] bg-[#FDF3F1]/40 shadow-xs" 
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-neutral-900">Gemini 2.5 Flash</span>
                      <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                        Rapide &amp; Économique
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-snug">
                      Modèle vif et direct, idéal pour les ébauches et les guides synthétiques.
                    </p>
                  </div>

                  {/* Advanced Model */}
                  <div 
                    onClick={() => setSelectedModel("gpt-4o")}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedModel === "gpt-4o" 
                        ? "border-[#C84B31] bg-[#FDF3F1]/40 shadow-xs" 
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-neutral-900">ChatGPT (GPT-4o mini)</span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Équilibré
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-snug">
                      Excellente nuance d&apos;analyse et logique rigoureuse pour les manuels et essais.
                    </p>
                  </div>

                  {/* Pro Model */}
                  <div 
                    onClick={() => setSelectedModel("claude-sonnet-5")}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedModel === "claude-sonnet-5" 
                        ? "border-[#C84B31] bg-[#FDF3F1]/40 shadow-xs" 
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-neutral-900">Claude 3.5 Sonnet</span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Style Littéraire Supérieur
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-snug">
                      Vocabulaire riche, sens du rythme narratif et élégance d&apos;écriture d&apos;exception.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowModelModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-sm hover:bg-neutral-50 transition-colors cursor-pointer"
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
