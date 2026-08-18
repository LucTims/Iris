"use client";

import { useState, useEffect } from "react";

export interface ImportManuscriptModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (splitByChapter: boolean) => Promise<void> | void;
  isLoading?: boolean;
}

export default function ImportManuscriptModal({
  isOpen,
  file,
  onClose,
  onConfirm,
  isLoading = false,
}: ImportManuscriptModalProps) {
  const [splitByChapter, setSplitByChapter] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSplitByChapter(true);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const fileNameLower = file.name.toLowerCase();
  const isDocx = fileNameLower.endsWith(".docx");
  const isEpub = fileNameLower.endsWith(".epub");
  const fileExt = isDocx ? ".DOCX" : isEpub ? ".EPUB" : file.name.split(".").pop()?.toUpperCase() || "";

  const handleConfirm = () => {
    if (isLoading) return;
    onConfirm(splitByChapter);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border border-neutral-100 max-h-[85dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
          <h3 className="font-heading font-extrabold text-lg text-neutral-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">file_upload</span>
            <span>Importer un manuscrit</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-neutral-400 hover:text-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Selected File Details Box */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">description</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-neutral-900 truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] font-medium text-neutral-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
              isDocx
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : isEpub
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-neutral-200 text-neutral-700"
            }`}
          >
            {fileExt}
          </span>
        </div>

        {/* Loading State or Choice Options */}
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <span className="material-symbols-outlined text-3xl text-secondary animate-spin">
              progress_activity
            </span>
            <p className="text-xs font-bold text-neutral-700 text-center animate-pulse">
              Extraction et analyse du manuscrit en cours...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-extrabold text-neutral-800 uppercase tracking-wider">
              Choix de structuration
            </label>

            {/* Option 1: Diviser par chapitre */}
            <div
              onClick={() => setSplitByChapter(true)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                splitByChapter
                  ? "border-secondary bg-orange-50/50 shadow-xs"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <input
                type="radio"
                name="splitOption"
                checked={splitByChapter === true}
                onChange={() => setSplitByChapter(true)}
                className="mt-0.5 accent-secondary cursor-pointer"
              />
              <div className="space-y-1">
                <p className="text-xs font-bold text-neutral-900">
                  Diviser par chapitre (via les grands titres H1/H2)
                </p>
                <p className="text-[11px] text-neutral-500 leading-snug">
                  Découpe automatiquement le manuscrit en plusieurs chapitres basés sur les titres H1 et H2.
                </p>
              </div>
            </div>

            {/* Option 2: Tout garder en un seul bloc */}
            <div
              onClick={() => setSplitByChapter(false)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                !splitByChapter
                  ? "border-secondary bg-orange-50/50 shadow-xs"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <input
                type="radio"
                name="splitOption"
                checked={splitByChapter === false}
                onChange={() => setSplitByChapter(false)}
                className="mt-0.5 accent-secondary cursor-pointer"
              />
              <div className="space-y-1">
                <p className="text-xs font-bold text-neutral-900">
                  Tout garder en un seul bloc
                </p>
                <p className="text-[11px] text-neutral-500 leading-snug">
                  Insère l&apos;intégralité du manuscrit directement dans le chapitre actif.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-secondary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Analyse...</span>
              </>
            ) : (
              <span>Importer</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
