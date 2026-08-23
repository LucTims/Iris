import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Target, CheckCircle2, AlertTriangle } from "lucide-react";

interface GeoScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookContent: string;
}

export default function GeoScoreModal({ isOpen, onClose, bookTitle, bookContent }: GeoScoreModalProps) {
  const [loading, setLoading] = useState(false);
  const [geoData, setGeoData] = useState<{ score: number; feedback: string[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      analyzeGEO();
    }
  }, [isOpen]);

  const analyzeGEO = async () => {
    if (!bookContent) return;
    setLoading(true);
    setGeoData(null);
    try {
      const res = await fetch("/api/geo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: bookTitle, content: bookContent }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeoData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh]"
        >
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Score GEO & IA</h2>
              <p className="text-sm text-neutral-500">Optimisation pour l'intelligence artificielle</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <p className="text-neutral-500 font-medium animate-pulse">Analyse sémantique par l'IA en cours...</p>
            </div>
          ) : geoData ? (
            <div className="space-y-8 overflow-y-auto pr-2">
              <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-50 to-white rounded-2xl border border-purple-100">
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">
                  {geoData.score}/100
                </div>
                <p className="text-sm font-medium text-neutral-600 mt-2">
                  {geoData.score >= 80 ? "Excellent ! Les IAs adorent." : geoData.score >= 50 ? "Peut être amélioré." : "Attention, l'IA risque d'ignorer ce contenu."}
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600">tips_and_updates</span>
                  Recommandations de l'IA
                </h3>
                <ul className="space-y-3">
                  {geoData.feedback.map((tip, idx) => (
                    <li key={idx} className="flex gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                      {geoData.score >= 80 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm text-neutral-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-red-500 font-medium">Une erreur est survenue lors de l'analyse.</div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
