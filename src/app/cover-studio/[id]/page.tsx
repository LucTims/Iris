"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";

export default function CoverStudioEditorPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  // Cover customizer state
  const [title, setTitle] = useState("Chargement...");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState(displayName || "Auteur");
  const [selectedTheme, setSelectedTheme] = useState("Corporate Prestige");
  const [accentColor, setAccentColor] = useState("#F95738");
  const [bgColor, setBgColor] = useState("#0D0D0E");
  
  // New States for the Refactor
  const [coverMode, setCoverMode] = useState<"ai" | "upload" | "styles">("ai");
  const [selectedAPI, setSelectedAPI] = useState("Chat GPT");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [previewAngle, setPreviewAngle] = useState<"face" | "iso-left" | "iso-right">("face");
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);

  const [promptText, setPromptText] = useState("Illustration abstraite géométrique dorée et moderne");
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  const aiProviders = ["Chat GPT", "Nana banana", "Dall-E"];

  useEffect(() => {
    // Fetch the project data to prepopulate the cover details
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const p = data.project;
          if (p) {
            setTitle(p.title || "Titre du livre");
            setSubtitle(p.subtitle || "");
          }
        }
      } catch (error) {
        console.error("Erreur chargement projet:", error);
      }
    };
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const stylePresets = [
    { name: "Corporate Prestige", bg: "#0D0D0E", accent: "#F95738", font: "Outfit" },
    { name: "Héritage Africain", bg: "#1C140F", accent: "#D97706", font: "Outfit" },
    { name: "Roman & Émotion", bg: "#0F172A", accent: "#38BDF8", font: "DM Sans" },
    { name: "Créatif & Vibrant", bg: "#F8FAFC", accent: "#F95738", font: "Outfit" },
    { name: "Minimaliste Sombre", bg: "#111827", accent: "#10B981", font: "Outfit" }
  ];

  const handleGenerateAI = () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      // Mock generated image
      setCoverImage("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop");
      setIsGenerating(false);
    }, 1500);
  };

  const handleAutoGenerate = () => {
    setIsGenerating(true);
    // Simulate auto AI call based on book data
    setTimeout(() => {
      // Mock generated image
      setCoverImage("https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=2574&auto=format&fit=crop");
      setIsGenerating(false);
    }, 2000);
  };

  const generateCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 2400;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // We don't render the image into the canvas here for simplicity unless it's a real implementation, 
      // but if coverImage is set, we would ideally drawImage. 
      // For the scope of this refactoring, we'll keep the generated base styling if no image, 
      // but if there's an image we might just save that.
      
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
    }
    return canvas;
  };

  const handleDownloadHD = () => {
    const canvas = generateCanvas();
    const link = document.createElement("a");
    link.download = `Couverture_${(title || "Livre").replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleApplyToBook = async () => {
    if (!projectId) {
      alert("Erreur: Aucun projet sélectionné. Veuillez ouvrir ce studio depuis un projet spécifique.");
      return;
    }
    
    try {
      // Si une image IA a été générée/uploadée, on pourrait la sauvegarder directement.
      // Pour l'exemple, on génère le canvas ou on prend le coverImage
      const coverUrl = coverImage || generateCanvas().toDataURL("image/jpeg", 0.8);
      
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_url: coverUrl })
      });

      if (res.ok) {
        alert("Couverture appliquée avec succès !");
        router.push("/cover-studio");
      } else {
        const data = await res.json();
        alert(`Erreur: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion.");
    }
  };

  const getTransformStyle = () => {
    switch (previewAngle) {
      case "iso-left": return "rotateY(-25deg) rotateX(10deg)";
      case "iso-right": return "rotateY(25deg) rotateX(10deg)";
      case "face":
      default: return "rotateY(0deg) rotateX(0deg)";
    }
  };

  return (
    <div className="bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="bg-[#F9FAFB] sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/cover-studio" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Hub Studio</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">palette</span>
              <span>Éditeur de Couverture</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDownloadModalOpen(true)}
              className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span className="hidden sm:inline">Télécharger HD</span>
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
                    <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20 md:pb-10 relative">
          
          {/* Live Preview Screen (Left Column now) */}
          <div 
            className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-900/90 backdrop-blur-md rounded-3xl p-8 lg:p-12 border border-neutral-800 relative min-h-[600px] overflow-hidden"
            style={{ perspective: "1500px" }}
          >
            <span className="absolute top-4 left-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono font-bold text-white uppercase tracking-wider z-20">
              Aperçu Haute Définition HD
            </span>

            {/* The Book 3D Mockup Container */}
            <div
              className="w-full max-w-sm aspect-[2/3] rounded-2xl p-8 sm:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-transform duration-700 ease-out border border-white/20 bg-cover bg-center"
              style={{ 
                backgroundColor: bgColor,
                backgroundImage: coverImage ? `url(${coverImage})` : 'none',
                transform: getTransformStyle(),
                transformStyle: "preserve-3d"
              }}
            >
              {!coverImage && (
                <>
                  {/* Subtle background overlay effect when no image */}
                  <div
                    className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
                    style={{ backgroundColor: accentColor }}
                  ></div>
                  <div
                    className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: accentColor }}
                  ></div>
                  
                  {/* Book Header Label */}
                  <div className="relative z-10 space-y-2 translate-z-10">
                    <span
                      className="text-[10px] font-mono font-extrabold uppercase tracking-widest block"
                      style={{ color: accentColor }}
                    >
                      EDITION BEST-SELLER
                    </span>
                    <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-white leading-tight tracking-tight drop-shadow-md">
                      {title || "Titre du livre"}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-300 font-medium leading-snug drop-shadow-md">
                      {subtitle || "Sous-titre explicatif"}
                    </p>
                  </div>

                  {/* Graphic Element Representation */}
                  <div className="relative z-10 my-auto py-8 flex items-center justify-center translate-z-10">
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
                  <div className="relative z-10 border-t border-white/20 pt-4 flex items-center justify-between mt-auto translate-z-10">
                    <div>
                      <span className="text-[9px] text-neutral-400 font-mono block uppercase tracking-wider drop-shadow-sm">Auteur</span>
                      <span className="font-heading font-bold text-sm text-white drop-shadow-sm">{author || "Nom de l'auteur"}</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 font-bold drop-shadow-sm">IRIS BOOKS</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3 relative z-20">
              <button
                onClick={handleApplyToBook}
                className="bg-secondary text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-orange-600 transition-all shadow-md flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Appliquer au Livre</span>
              </button>
            </div>
          </div>

          {/* Controls Editor (Right Column now) */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Mode Navigation */}
            <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200">
              <button 
                onClick={() => setCoverMode("ai")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${coverMode === 'ai' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                IA & Chat
              </button>
              <button 
                onClick={() => setCoverMode("upload")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${coverMode === 'upload' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Upload
              </button>
              <button 
                onClick={() => setCoverMode("styles")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${coverMode === 'styles' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">style</span>
                Styles & 3D
              </button>
            </div>

            {/* Mode: AI & Chat */}
            {coverMode === "ai" && (
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex-1 flex flex-col relative min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">forum</span>
                    Assistant IA
                  </h2>
                  <select 
                    value={selectedAPI}
                    onChange={(e) => setSelectedAPI(e.target.value)}
                    className="text-xs font-bold bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-lg px-3 py-1.5 outline-none focus:border-secondary cursor-pointer"
                  >
                    {aiProviders.map(api => <option key={api} value={api}>{api}</option>)}
                  </select>
                </div>

                <div className="flex-1 mb-4 bg-neutral-50 rounded-2xl p-4 border border-neutral-100 flex flex-col overflow-y-auto">
                   <p className="text-xs text-neutral-400 text-center mt-auto mb-auto">Demandez à l'IA de générer une couverture, ou utilisez le bouton rapide pour utiliser les informations de votre livre.</p>
                </div>

                <div className="space-y-3 mt-auto">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Décrivez votre image (ex: un dragon sur une montagne...)"
                      className="w-full bg-neutral-50 p-4 pr-14 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-secondary focus:ring-2 focus:ring-orange-100 outline-none resize-none"
                    />
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGenerating || !promptText.trim()}
                      className={`absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isGenerating ? 'bg-neutral-200 text-neutral-400' : 'bg-secondary text-white hover:bg-orange-600 shadow-sm'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isGenerating ? "progress_activity" : "send"}
                      </span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setShowAutoConfirm(true)}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-3.5 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    <span>Génération Rapide Auto (Données du livre)</span>
                  </button>
                </div>

                {/* Auto Confirm Modal */}
                {showAutoConfirm && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 rounded-3xl p-6 flex flex-col items-center justify-center text-center border border-neutral-200 animate-fadeIn">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-secondary text-2xl">info</span>
                    </div>
                    <h3 className="font-heading font-extrabold text-lg text-neutral-900 mb-2">Génération Automatique</h3>
                    <p className="text-xs text-neutral-600 mb-6">
                      L'image sera créée automatiquement en se basant sur le titre, le sous-titre et le synopsis de votre livre. Voulez-vous continuer ?
                    </p>
                    <div className="flex items-center gap-3 w-full">
                      <button onClick={() => setShowAutoConfirm(false)} className="flex-1 py-3 text-xs font-bold bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors">Annuler</button>
                      <button 
                        onClick={() => {
                          setShowAutoConfirm(false);
                          handleAutoGenerate();
                        }} 
                        className="flex-1 py-3 text-xs font-bold bg-secondary text-white rounded-xl hover:bg-orange-600 shadow-md transition-colors"
                      >
                        Valider
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode: Upload */}
            {coverMode === "upload" && (
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex-1 flex flex-col justify-center items-center min-h-[400px]">
                <div className="text-center w-full max-w-sm">
                  <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                    <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                  </div>
                  <h2 className="font-heading font-extrabold text-lg text-neutral-900 mb-2">Importer votre couverture</h2>
                  <p className="text-xs text-neutral-500 mb-8 leading-relaxed">
                    Importez votre propre image de couverture. L'image sera adaptée automatiquement au format du livre.
                  </p>
                  
                  <label className="cursor-pointer inline-flex items-center justify-center w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-4 rounded-xl transition-all shadow-sm gap-2">
                    <span className="material-symbols-outlined text-[18px]">image</span>
                    <span>Choisir une image depuis l'ordinateur</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setCoverImage(ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  
                  {coverImage && (
                    <button 
                      onClick={() => setCoverImage(null)}
                      className="mt-6 text-xs font-bold text-red-500 hover:text-red-600 transition-colors underline underline-offset-4"
                    >
                      Supprimer l'image actuelle
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Mode: Styles & 3D Angles */}
            {coverMode === "styles" && (
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex-1 overflow-y-auto space-y-8 min-h-[400px]">
                
                {/* 3D Angles */}
                <div className="space-y-4">
                  <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500 text-lg">3d_rotation</span>
                    <span>Angles de Vue 3D</span>
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setPreviewAngle("face")} className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${previewAngle === 'face' ? 'border-secondary bg-orange-50 text-secondary shadow-sm' : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'}`}>
                      <span className="material-symbols-outlined">menu_book</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Face</span>
                    </button>
                    <button onClick={() => setPreviewAngle("iso-left")} className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${previewAngle === 'iso-left' ? 'border-secondary bg-orange-50 text-secondary shadow-sm' : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'}`}>
                      <span className="material-symbols-outlined" style={{ transform: 'rotate(-15deg) skewY(-10deg)' }}>book_4</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Iso Gauche</span>
                    </button>
                    <button onClick={() => setPreviewAngle("iso-right")} className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${previewAngle === 'iso-right' ? 'border-secondary bg-orange-50 text-secondary shadow-sm' : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'}`}>
                      <span className="material-symbols-outlined" style={{ transform: 'rotate(15deg) skewY(10deg)' }}>book_4</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Iso Droit</span>
                    </button>
                  </div>
                </div>

                {/* Typography Form */}
                <div className="space-y-4 pt-6 border-t border-neutral-100">
                  <h2 className="font-heading font-extrabold text-base text-neutral-900">Textes de la Couverture</h2>
                  <div className="space-y-3">
                    <div>
                      <input type="text" placeholder="Titre principal" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-secondary outline-none transition-colors" />
                    </div>
                    <div>
                      <input type="text" placeholder="Sous-titre" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-medium focus:border-secondary outline-none transition-colors" />
                    </div>
                    <div>
                      <input type="text" placeholder="Nom d'Auteur" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-secondary outline-none transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Themes */}
                <div className="space-y-4 pt-6 border-t border-neutral-100">
                  <h2 className="font-heading font-extrabold text-base text-neutral-900 flex items-center justify-between">
                    <span>Thèmes & Couleurs</span>
                    {!coverImage && <span className="text-[10px] font-normal text-neutral-400">Fond visible</span>}
                  </h2>
                  <div className="grid grid-cols-1 gap-2">
                    {stylePresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => { setSelectedTheme(preset.name); setBgColor(preset.bg); setAccentColor(preset.accent); setCoverImage(null); }}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${selectedTheme === preset.name && !coverImage ? "border-secondary bg-orange-50/60 text-neutral-900 shadow-sm" : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"}`}
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

              </div>
            )}
          </div>

        </main>
      </div>

      {/* Download Choice Modal */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-body animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl max-h-[90dvh] overflow-y-auto flex flex-col relative border border-neutral-100">
            <button onClick={() => setDownloadModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-600 transition-colors z-10">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            
            <div className="p-8 sm:p-10 text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-orange-100 rounded-3xl flex items-center justify-center -rotate-3 border border-orange-200 shadow-inner">
                <span className="material-symbols-outlined text-4xl text-secondary">file_download</span>
              </div>
              
              <div className="space-y-2">
                <h2 className="font-heading font-extrabold text-2xl text-neutral-900">Que voulez-vous télécharger ?</h2>
                <p className="text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Souhaitez-vous télécharger uniquement cette image de couverture ou bien exporter le livre complet avec sa mise en page ?
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  onClick={() => {
                    handleDownloadHD();
                    setDownloadModalOpen(false);
                  }}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">image</span>
                  <span>Télécharger l'image seule (PNG)</span>
                </button>
                
                <button 
                  onClick={() => {
                    handleApplyToBook().then(() => {
                      if (projectId) {
                        router.push(`/export/${projectId}`);
                      }
                    });
                  }}
                  className="w-full bg-secondary hover:bg-orange-600 text-white font-bold text-sm py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">book</span>
                  <span>Télécharger le Livre Complet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
