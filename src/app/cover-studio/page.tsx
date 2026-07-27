"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";

export default function CoverStudioPage() {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Cover customizer state
  const [title, setTitle] = useState("Les Secrets de la Comptabilité");
  const [subtitle, setSubtitle] = useState("Guide pratique pour entrepreneurs");
  const [author, setAuthor] = useState(displayName || "Auteur");
  const [selectedTheme, setSelectedTheme] = useState("Corporate Prestige");
  const [accentColor, setAccentColor] = useState("#F95738");
  const [bgColor, setBgColor] = useState("#0D0D0E");
  const [layoutStyle, setLayoutStyle] = useState("Minimalist Centered");
  const [promptText, setPromptText] = useState("Illustration abstraite géométrique dorée et moderne");
  const [isGenerating, setIsGenerating] = useState(false);

  const stylePresets = [
    { name: "Corporate Prestige", bg: "#0D0D0E", accent: "#F95738", font: "Outfit" },
    { name: "Héritage Africain", bg: "#1C140F", accent: "#D97706", font: "Outfit" },
    { name: "Roman & Émotion", bg: "#0F172A", accent: "#38BDF8", font: "DM Sans" },
    { name: "Créatif & Vibrant", bg: "#F8FAFC", accent: "#F95738", font: "Outfit" },
    { name: "Minimaliste Sombre", bg: "#111827", accent: "#10B981", font: "Outfit" }
  ];

  const handleGenerateAI = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 800);
  };

  const handleDownloadHD = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 2400;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Accent Circle
      ctx.beginPath();
      ctx.arc(800, 1200, 300, 0, 2 * Math.PI);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 12;
      ctx.stroke();

      // Top Tag
      ctx.fillStyle = accentColor;
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ÉDITION BEST-SELLER", 800, 200);

      // Title
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 72px sans-serif";
      ctx.fillText(title || "Titre du livre", 800, 450);

      // Subtitle
      ctx.fillStyle = "#CCCCCC";
      ctx.font = "36px sans-serif";
      ctx.fillText(subtitle || "Sous-titre", 800, 550);

      // Author
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(author || displayName || "Nom de l'auteur", 800, 2200);

      // Trigger download
      const link = document.createElement("a");
      link.download = `Couverture_${(title || "Livre").replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <header className="bg-[#F9FAFB] sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Tableau de bord</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">palette</span>
              <span>Studio de Couverture IA</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadHD}
              className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Télécharger HD</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">{displayName}</p>
                    <p className="text-xs text-neutral-500 truncate">{displayEmail}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                      <span>Tableau de bord</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                      <span>Paramètres</span>
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-neutral-100">
                    <Link href="/login" className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Editor (Left Column) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Presets Card */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
              <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg">auto_awesome</span>
                <span>Thèmes & Styles Pré-configurés</span>
              </h2>

              <div className="grid grid-cols-1 gap-2">
                {stylePresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setSelectedTheme(preset.name);
                      setBgColor(preset.bg);
                      setAccentColor(preset.accent);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedTheme === preset.name
                        ? "border-secondary bg-orange-50/60 text-neutral-900 shadow-2xs"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <span>{preset.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full border border-neutral-300" style={{ backgroundColor: preset.bg }}></span>
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.accent }}></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content & Typography Card */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
              <h2 className="font-heading font-extrabold text-base text-neutral-900">
                Textes de la Couverture
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Titre principal</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-secondary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Sous-titre</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-medium focus:border-secondary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Nom d&apos;Auteur</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-secondary outline-none"
                  />
                </div>
              </div>
            </div>

            {/* AI Graphic Generator Card */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
              <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">brush</span>
                <span>Génération d&apos;Illustration par IA</span>
              </h2>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                  Décrivez le visuel ou le thème souhaité pour la couverture :
                </label>
                <textarea
                  rows={3}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full p-3 border border-neutral-200 rounded-xl text-xs font-medium focus:border-secondary outline-none"
                />
              </div>

              <button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">
                  {isGenerating ? "progress_activity" : "auto_awesome"}
                </span>
                <span>{isGenerating ? "Génération par l'IA..." : "Générer une illustration HD"}</span>
              </button>
            </div>
          </div>

          {/* Live Preview Screen (Right Column) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-900/90 backdrop-blur-md rounded-3xl p-8 lg:p-12 border border-neutral-800 relative min-h-[600px]">
            <span className="absolute top-4 left-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono font-bold text-white uppercase tracking-wider">
              Aperçu Haute Définition HD
            </span>

            {/* The Book 3D Mockup Container */}
            <div
              className="w-full max-w-sm aspect-[2/3] rounded-2xl p-8 sm:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 border border-white/10"
              style={{ backgroundColor: bgColor }}
            >
              {/* Subtle background overlay effect */}
              <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{ backgroundColor: accentColor }}
              ></div>
              <div
                className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: accentColor }}
              ></div>

              {/* Book Header Label */}
              <div className="relative z-10 space-y-2">
                <span
                  className="text-[10px] font-mono font-extrabold uppercase tracking-widest block"
                  style={{ color: accentColor }}
                >
                  EDITION BEST-SELLER
                </span>
                <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-white leading-tight tracking-tight">
                  {title || "Titre du livre"}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-medium leading-snug">
                  {subtitle || "Sous-titre explicatif"}
                </p>
              </div>

              {/* Graphic Element Representation */}
              <div className="relative z-10 my-auto py-8 flex items-center justify-center">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-white/20 flex items-center justify-center shadow-inner"
                  style={{ borderColor: accentColor }}
                >
                  <span className="material-symbols-outlined text-5xl" style={{ color: accentColor }}>
                    auto_awesome
                  </span>
                </div>
              </div>

              {/* Author Footer */}
              <div className="relative z-10 border-t border-white/10 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-neutral-400 font-mono block uppercase tracking-wider">Auteur</span>
                  <span className="font-heading font-bold text-sm text-white">{author || "Nom de l'auteur"}</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 font-bold">IRIS BOOKS</span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => alert("Couverture appliquée au livre avec succès !")}
                className="bg-secondary text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-orange-600 transition-all shadow-md flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Appliquer au Livre</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
