"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";

export default function NewBookWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

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
    includeDetailedPlan: true,
    includeToc: false,
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const projectContext = {
        ...formData,
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

      if (res.ok) {
        const data = await res.json();
        if (data.project?.id) {
          localStorage.setItem("iris_current_project_id", data.project.id);
          router.push(`/redaction?projectId=${data.project.id}&new=true`);
          return;
        }
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

          <form onSubmit={step === totalSteps ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
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
                      <textarea
                        required
                        value={formData.synopsis}
                        onChange={(e) => updateForm("synopsis", e.target.value)}
                        placeholder="Décrivez de quoi parle votre livre. Plus vous donnerez de détails à l'IA, plus le résultat sera précis et personnalisé..."
                        rows={6}
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none"
                      />
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
                            checked={formData.includeDetailedPlan}
                            onChange={(e) => updateForm("includeDetailedPlan", e.target.checked)}
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.includeDetailedPlan ? 'bg-orange-500 border-orange-500' : 'bg-white border-neutral-300 group-hover:border-orange-500'}`}>
                            {formData.includeDetailedPlan && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-neutral-800">Générer un Plan Détaillé</span>
                          <span className="text-xs text-neutral-500">Une esquisse complète de tous les chapitres pour valider la structure.</span>
                        </div>
                      </label>

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
                          <span className="text-sm font-bold text-neutral-800">Générer un Sommaire</span>
                          <span className="text-xs text-neutral-500">Une simple liste des chapitres.</span>
                        </div>
                      </label>

                      {!formData.includeDetailedPlan && !formData.includeToc && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                          <span className="material-symbols-outlined text-blue-500 text-lg">info</span>
                          <p className="text-xs text-blue-800">
                            <strong>Génération directe du contenu :</strong> L'IA va directement écrire le texte de votre livre. Vu que c'est un texte long, l'étape suivante peut prendre un peu plus de temps.
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
      </main>
      </div>
    </div>
  );
}
