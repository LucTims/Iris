"use client";

import { useEffect, useState } from "react";

export interface BookInfo {
  title: string;
  subtitle: string;
  author: string;
  category: string;
  synopsis: string;
  audience: string;
  tone: string;
}

interface BookInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  initial: Partial<BookInfo>;
  onSaved: (project: Record<string, unknown>) => void;
}

const FIELDS: { key: keyof BookInfo; label: string; placeholder: string; multiline?: boolean; hint?: string }[] = [
  { key: "title", label: "Titre", placeholder: "Titre du livre" },
  { key: "subtitle", label: "Sous-titre", placeholder: "Ex. : Le guide pratique pour investir à la BRVM" },
  { key: "author", label: "Auteur", placeholder: "Votre nom, un pseudonyme ou une maison d'édition", hint: "Affiché sur la page de titre, les mentions légales et les métadonnées des fichiers exportés." },
  { key: "category", label: "Catégorie / genre", placeholder: "Ex. : Finance personnelle" },
  { key: "synopsis", label: "Résumé", placeholder: "De quoi parle le livre ? Ce résumé guide aussi Iris quand elle rédige.", multiline: true },
  { key: "audience", label: "Public visé", placeholder: "Ex. : Jeunes actifs africains débutants en bourse" },
  { key: "tone", label: "Ton", placeholder: "Ex. : Direct, pédagogique, motivant" },
];

export default function BookInfoModal({ isOpen, onClose, projectId, initial, onSaved }: BookInfoModalProps) {
  const [form, setForm] = useState<BookInfo>({ title: "", subtitle: "", author: "", category: "", synopsis: "", audience: "", tone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm({
      title: initial.title || "",
      subtitle: initial.subtitle || "",
      author: initial.author || "",
      category: initial.category || "",
      synopsis: initial.synopsis || "",
      audience: initial.audience || "",
      tone: initial.tone || "",
    });
    // Valeurs initiales relues à chaque ouverture uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!projectId) {
      setError("Projet introuvable : enregistrez d'abord le livre.");
      return;
    }
    if (!form.title.trim()) {
      setError("Le titre ne peut pas être vide.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "L'enregistrement a échoué.");
      onSaved(data.project || data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-body">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-100 dark:border-neutral-800 flex flex-col max-h-[90dvh]">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-neutral-900 dark:text-neutral-100">Fiche du livre</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Ces informations apparaissent dans le livre exporté.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center" aria-label="Fermer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">{f.label}</span>
              {f.multiline ? (
                <textarea
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  rows={5}
                  className="w-full text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 outline-none focus:border-secondary"
                />
              ) : (
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 outline-none focus:border-secondary"
                />
              )}
              {f.hint && <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">{f.hint}</span>}
            </label>
          ))}
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs font-bold px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="text-xs font-bold px-5 py-2.5 rounded-xl bg-secondary hover:bg-orange-600 text-white disabled:opacity-50">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
