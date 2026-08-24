"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";

export default function NewBookWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  
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
  });

  const updateForm = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
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
        createdAt: new Date().toISOString()
      };
      localStorage.setItem("iris_current_project", JSON.stringify(projectContext));

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
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
      <div className="flex items-center justify-center gap-3 mb-10 w-full max-w-xl mx-auto">
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
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
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

      <main className="flex-1 flex flex-col items-center pt-8 pb-20 px-4">
        {/* Step Indicator */}
        {renderStepIndicators()}

        {/* Wizard Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-neutral-100 max-w-2xl w-full p-6 sm:p-10 relative overflow-hidden">
          
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-secondary font-bold text-[11px] uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>Étape {step} sur {totalSteps}</span>
            </span>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-neutral-900">
              {step === 1 && "Détails du projet"}
              {step === 2 && "Le cœur du sujet"}
              {step === 3 && "Structure & Finalisation"}
            </h1>
            <p className="text-sm text-neutral-500 mt-2">
              {step === 1 && "Commençons par les informations de base de votre futur livre."}
              {step === 2 && "Nourrissez l'IA avec votre vision, vos idées et l'ambiance souhaitée."}
              {step === 3 && "Définissez les paramètres de génération avant de lancer la rédaction."}
            </p>
          </div>

          <form onSubmit={step === totalSteps ? handlePreSubmit : (e) => { e.preventDefault(); nextStep(); }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* STEP 1: Basic Details */}
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700">Titre provisoire <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => updateForm("title", e.target.value)}
                        placeholder="Ex: Le Guide Complet Facebook Ads 2026"
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700">Sous-titre / Slogan</label>
                      <input
                        type="text"
                        value={formData.subtitle}
                        onChange={(e) => updateForm("subtitle", e.target.value)}
                        placeholder="Ex: Dominez votre marché en 30 jours"
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700">Catégorie <span className="text-red-500">*</span></label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) => updateForm("category", e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled>Sélectionner...</option>
                          <option value="Roman / Fiction">Roman / Fiction</option>
                          <option value="Business & Entrepreneuriat">Business & Entrepreneuriat</option>
                          <option value="Développement Personnel">Développement Personnel</option>
                          <option value="Guide Pratique">Guide Pratique / Formation</option>
                          <option value="Biographie">Biographie</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700">Public cible <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.audience}
                          onChange={(e) => updateForm("audience", e.target.value)}
                          placeholder="Ex: Entrepreneurs débutants"
                          className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 2: The Core */}
                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-neutral-700">Synopsis ou Idée principale <span className="text-red-500">*</span></label>
                        <button type="button" className="text-[10px] flex items-center gap-1 font-bold text-secondary bg-orange-50 px-2 py-1 rounded-lg hover:bg-orange-100 transition-colors">
                          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                          Assistant IA
                        </button>
                      </div>
                      <div className="relative">
                        <textarea
                          required
                          value={formData.synopsis}
                          onChange={(e) => updateForm("synopsis", e.target.value)}
                          placeholder="Décrivez de quoi parle votre livre. Plus vous donnerez de détails à l'IA, plus le résultat sera précis et personnalisé..."
                          rows={6}
                          className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 pb-12 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none"
                        />
                        <button 
                          type="button" 
                          onClick={toggleListening}
                          className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                            isListening 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : 'bg-white border border-neutral-200 text-neutral-500 hover:text-secondary hover:border-orange-200 hover:bg-orange-50'
                          }`}
                          title={isListening ? "Arrêter l'enregistrement" : "Dicter (Microphone)"}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isListening ? 'mic' : 'mic_none'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700">Ton et style d'écriture <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={formData.tone}
                        onChange={(e) => updateForm("tone", e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Sélectionner...</option>
                        <option value="Sérieux et Didactique">Sérieux et Didactique (Guide, formation)</option>
                        <option value="Inspirant et Motivationnel">Inspirant et Motivationnel</option>
                        <option value="Humoristique et Décalé">Humoristique et Décalé</option>
                        <option value="Épique et Descriptif">Épique et Descriptif (Roman)</option>
                        <option value="Familier et Accessible">Familier et Accessible</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-neutral-700">Personnages ou Concepts clés (Optionnel)</label>
                      <input
                        type="text"
                        value={formData.characters}
                        onChange={(e) => updateForm("characters", e.target.value)}
                        placeholder="Ex: Héros principal : Lucas, Concept clé : ROI marketing"
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </>
                )}

                {/* STEP 3: Structure */}
                {step === 3 && (
                  <>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-neutral-700">Longueur estimée du livre</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {["Court (Nouvelle / Lead Magnet)", "Moyen (Roman standard)", "Long (Fresque / Manuel)"].map((opt) => (
                          <div 
                            key={opt}
                            onClick={() => updateForm("length", opt)}
                            className={`border ${formData.length === opt ? 'border-orange-500 bg-orange-50/50' : 'border-neutral-200 bg-white hover:bg-neutral-50'} rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.length === opt ? 'border-orange-500' : 'border-neutral-300'}`}>
                              {formData.length === opt && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                            </div>
                            <span className={`text-xs font-bold ${formData.length === opt ? 'text-orange-700' : 'text-neutral-600'}`}>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-bold text-neutral-700">Consignes spécifiques pour l'IA (Optionnel)</label>
                      <textarea
                        value={formData.instructions}
                        onChange={(e) => updateForm("instructions", e.target.value)}
                        placeholder="Ex: Évite d'utiliser du jargon technique complexe, fais des chapitres de 5 pages maximum, tutoie le lecteur..."
                        rows={4}
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none"
                      />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-neutral-100 mt-4">
                      <label className="text-sm font-bold text-neutral-700">Options de génération initiale</label>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={formData.includeToc}
                            onChange={(e) => updateForm("includeToc", e.target.checked)}
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.includeToc ? 'bg-orange-500 border-orange-500' : 'bg-white border-neutral-300 group-hover:border-orange-500'}`}>
                            {formData.includeToc && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-neutral-800">Générer un Sommaire / Table des matières</span>
                          <span className="text-xs text-neutral-500">L'IA commence par un sommaire concis (les grands points), puis rédige chaque point sur une nouvelle page.</span>
                        </div>
                      </label>

                      {!formData.includeToc && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                          <span className="material-symbols-outlined text-blue-500 text-lg">info</span>
                          <p className="text-xs text-blue-800">
                            <strong>Génération directe du contenu :</strong> L'IA va directement écrire le texte de votre livre, sans sommaire. Vu que c'est un texte long, l'étape suivante peut prendre un peu plus de temps.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-10 pt-6 border-t border-neutral-100 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-sm hover:bg-neutral-50 transition-colors"
                >
                  Retour
                </button>
              ) : (
                <div /> // Spacer
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-secondary hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {step === totalSteps ? (
                  isSubmitting ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <span>Création en cours...</span>
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span>Générer mon livre</span>
                      <span className="material-symbols-outlined text-base">auto_awesome</span>
                    </>
                  )
                ) : (
                  <>
                    <span>Continuer</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
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
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-xl w-full p-6 sm:p-8 relative"
              >
                <button
                  onClick={() => setShowModelModal(false)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-secondary text-3xl">smart_toy</span>
                  </div>
                  <h2 className="font-heading font-extrabold text-2xl text-neutral-900 mb-2">Choisissez votre IA</h2>
                  <p className="text-sm text-neutral-500">
                    Sélectionnez le modèle d'Intelligence Artificielle qui va rédiger votre projet. Chaque modèle consomme un nombre différent de pièces.
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  {/* Standard Model */}
                  <div 
                    onClick={() => setSelectedModel("gemini-2.5-flash")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${selectedModel === "gemini-2.5-flash" ? "border-orange-500 bg-orange-50/50" : "border-neutral-200 hover:border-orange-300"}`}
                  >
                    <div className="mt-1 text-2xl">⚡</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-neutral-900">Gemini 2.5 Flash</span>
                        <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ~20 🪙 / page
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Rapide et économique. Idéal pour générer des plans, structurer des idées et rédiger le premier jet.
                      </p>
                    </div>
                  </div>

                  {/* Advanced Model */}
                  <div 
                    onClick={() => setSelectedModel("gpt-4o")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${selectedModel === "gpt-4o" ? "border-orange-500 bg-orange-50/50" : "border-neutral-200 hover:border-orange-300"}`}
                  >
                    <div className="mt-1 text-2xl">🧠</div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-neutral-900">ChatGPT (GPT-4o)</span>
                          <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ~80 🪙 / page
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Très intelligent et nuancé. Parfait pour les réécritures complexes et les essais approfondis.
                      </p>
                    </div>
                  </div>

                  {/* Pro Model */}
                  <div 
                    onClick={() => setSelectedModel("claude-3-5-sonnet-20240620")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${selectedModel === "claude-3-5-sonnet-20240620" ? "border-orange-500 bg-orange-50/50" : "border-neutral-200 hover:border-orange-300"}`}
                  >
                    <div className="mt-1 text-2xl">✍️</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-neutral-900 flex items-center gap-2">
                            Claude 3.5 Sonnet
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Premium</span>
                        </span>
                        <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ~150 🪙 / page
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Le meilleur modèle du marché pour l'écriture créative et littéraire. Un style inégalé.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowModelModal(false)}
                    className="flex-1 px-6 py-3.5 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-sm hover:bg-neutral-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 bg-secondary hover:bg-orange-600 text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    <span>Lancer la rédaction</span>
                    <span className="material-symbols-outlined text-base">rocket_launch</span>
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
