"use client";

import { useState } from "react";
import Link from "next/link";

export default function RedactionPage() {
  const [input, setInput] = useState("");

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="bg-surface/80 backdrop-blur-md shadow-sm sticky top-0 z-50 h-16">
        <nav className="flex justify-between items-center w-full px-6 max-w-[1200px] mx-auto h-full">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-heading text-2xl font-extrabold text-secondary">Iris</Link>
            <div className="hidden md:flex gap-6">
              <Link href="/" className="font-heading text-base text-on-surface-variant hover:text-secondary transition-colors">Dashboard</Link>
              <Link href="/dashboard" className="font-heading text-base text-secondary font-bold border-b-2 border-secondary pb-1">Mes Projets</Link>
              <Link href="#" className="font-heading text-base text-on-surface-variant hover:text-secondary transition-colors">Tutoriels</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">notifications</button>
            <button className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">settings</button>
            <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant bg-secondary-container flex items-center justify-center">
              <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4Ge4Ks-D6bymKU3iAidRYrczLQncpvEACDGQTYXMq0aS2KdiVyhYkkbrkWTikvwFfUdUCwhU11mpsB04GIQBBlz3jtAPuMo5Uk1E_XKMwa5TDcoap0d5S40la_E6cTezLgbXxxYZNtsjG-HJez58VsiebAYr6_-OSFXsA6UR_8WPDu86zpFZHsURMqJn7c2Pxybe5RoccP44ONiGCGubLFbVZJ2PJVOlGXXz-Iz_Obfo6pKzjIIQ" alt="User Avatar" />
            </div>
            <button className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-heading text-base font-semibold hover:opacity-90 transition-opacity">Nouveau Livre</button>
          </div>
        </nav>
      </header>

      <main className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Sidebar */}
        <aside className="h-full w-64 bg-surface-container-low hidden lg:flex flex-col p-4 space-y-2 border-r border-outline-variant">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary-container flex items-center justify-center">
              <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1zQq7oV_GGYv_hT3TBNK24gpMH1peMnPAF2Zlkw0aGPSwaR3SjcWxLDCmmBL_hIWuoozmfqNl-SvSNOQU8o4Bmnv_MX8Dm2g0E7KUQm0e6WV-ueZ7PTTc98a7BJMNvIbkwdHPiLVwpPKfWC2DamO70UQRqH0DxsfwivR_pG_lg9Lf2Gm7q_2zkKJNoMD7rB45efXqzcXjVDMt_LUTHwPOZfm7svbO7LW2pTIMZi0bStMkbGE3cnE" alt="Book Cover" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold leading-tight text-secondary">L&apos;Épopée de Soundiata</h2>
              <p className="text-sm text-on-surface-variant">Chapitre 3 en cours</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-bold transition-all duration-200">
              <span className="material-symbols-outlined">edit_note</span>
              <span className="text-sm">Rédaction</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all duration-200">
              <span className="material-symbols-outlined">account_tree</span>
              <span className="text-sm">Structure</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all duration-200">
              <span className="material-symbols-outlined">auto_stories</span>
              <span className="text-sm">Couverture</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all duration-200">
              <span className="material-symbols-outlined">ios_share</span>
              <span className="text-sm">Exporter</span>
            </button>
          </nav>

          <div className="pt-4 border-t border-outline-variant space-y-1">
            <button className="w-full bg-secondary-container text-on-secondary-container py-3 rounded-xl font-heading font-semibold text-center hover:shadow-md transition-shadow">Aperçu PDF</button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
              <span className="material-symbols-outlined">help_outline</span>
              <span className="text-sm">Aide</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
              <span className="material-symbols-outlined">exit_to_app</span>
              <span className="text-sm">Quitter</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area: Split Screen */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* AI Chat Interface (Left) */}
          <section className="w-full md:w-[400px] xl:w-[480px] h-full bg-white border-r border-outline-variant flex flex-col relative z-10">
            <div className="p-4 border-b border-outline-variant bg-surface flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success-teal animate-pulse"></span>
                <span className="font-heading font-semibold text-on-surface">Assistant Auteur</span>
              </div>
              <button className="material-symbols-outlined text-outline">more_horiz</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Bubble */}
              <div className="flex flex-col items-start gap-2 max-w-[85%]">
                <div className="bg-ai-bubble text-on-surface p-4 rounded-xl rounded-tl-sm shadow-sm">
                  Bonjour ! Je vois que vous travaillez sur le premier chapitre de <span className="italic">&quot;L&apos;Épopée de Soundiata&quot;</span>. C&apos;est un sujet fascinant.
                  <br /><br />
                  Pour rendre le départ de Soundiata du Mandé plus poignant, souhaiteriez-vous mettre l&apos;accent sur sa force intérieure naissante ou sur la douleur de sa mère, Sogolon ?
                </div>
                <span className="text-[10px] text-outline font-mono font-semibold tracking-widest ml-1">AI ASSISTANT • 09:41</span>
              </div>

              {/* Suggested Prompts (Chips) */}
              <div className="flex flex-wrap gap-2 py-2">
                <button className="px-4 py-1.5 border border-outline-variant rounded-full text-sm text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors">La force intérieure</button>
                <button className="px-4 py-1.5 border border-outline-variant rounded-full text-sm text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors">La douleur de Sogolon</button>
                <button className="px-4 py-1.5 border border-outline-variant rounded-full text-sm text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors">Les deux à la fois</button>
              </div>

              {/* User Bubble */}
              <div className="flex flex-col items-end gap-2 ml-auto max-w-[85%]">
                <div className="bg-user-bubble text-white p-4 rounded-xl rounded-tr-sm shadow-sm">
                  Je pense que mettre l&apos;accent sur la force de Soundiata créera un contraste plus fort avec son handicap physique initial.
                </div>
                <span className="text-[10px] text-outline font-mono font-semibold tracking-widest mr-1">VOUS • 09:43</span>
              </div>

              {/* AI Bubble 2 */}
              <div className="flex flex-col items-start gap-2 max-w-[85%]">
                <div className="bg-ai-bubble text-on-surface p-4 rounded-xl rounded-tl-sm shadow-sm">
                  Excellent choix. Cela renforce le thème de la résilience. Voici une proposition de paragraphe pour l&apos;ouverture du chapitre 1. Qu&apos;en pensez-vous ?
                </div>
              </div>
            </div>

            {/* Chat Input Area */}
            <div className="p-4 bg-surface border-t border-outline-variant">
              <div className="relative flex items-center bg-white border border-outline-variant rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all">
                <button className="material-symbols-outlined text-outline hover:text-secondary mr-2">add_circle</button>
                <input
                  className="flex-1 border-none focus:ring-0 text-base py-2 bg-transparent outline-none"
                  placeholder="Posez une question ou demandez une correction..."
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button className="bg-secondary text-white p-2 rounded-full flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
          </section>

          {/* Text Editor (Right) */}
          <section className="flex-1 h-full bg-surface-container-lowest flex flex-col">
            {/* Editor Toolbar */}
            <div className="h-12 border-b border-outline-variant flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex border-r border-outline-variant pr-4 gap-1">
                  <button className="material-symbols-outlined p-1.5 rounded hover:bg-surface-container text-on-surface-variant">format_bold</button>
                  <button className="material-symbols-outlined p-1.5 rounded hover:bg-surface-container text-on-surface-variant">format_italic</button>
                  <button className="material-symbols-outlined p-1.5 rounded hover:bg-surface-container text-on-surface-variant">format_list_bulleted</button>
                </div>
                <div className="flex gap-1">
                  <button className="material-symbols-outlined p-1.5 rounded hover:bg-surface-container text-on-surface-variant">undo</button>
                  <button className="material-symbols-outlined p-1.5 rounded hover:bg-surface-container text-on-surface-variant">redo</button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-outline font-mono font-semibold tracking-widest">1,248 MOTS</span>
                <div className="w-[1px] h-4 bg-outline-variant"></div>
                <span className="text-sm text-success-teal font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">cloud_done</span> Enregistré
                </span>
              </div>
            </div>

            {/* Manuscript View */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20">
              <div className="max-w-[720px] mx-auto space-y-12">
                {/* Progress Indicator */}
                <div className="flex items-center justify-center w-full mb-16">
                  <div className="flex items-center w-full max-w-md">
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-sm z-10">1</div>
                      <span className="absolute top-10 text-[10px] font-mono font-semibold tracking-widest text-secondary whitespace-nowrap">BRIEF</span>
                    </div>
                    <div className="flex-1 h-[2px] bg-secondary"></div>
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-sm z-10 ring-4 ring-secondary/20">
                        <div className="w-2 h-2 rounded-full bg-warning-amber animate-ping"></div>
                      </div>
                      <span className="absolute top-10 text-[10px] font-mono font-bold tracking-widest text-secondary whitespace-nowrap">RÉDACTION</span>
                    </div>
                    <div className="flex-1 h-[2px] bg-outline-variant"></div>
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest text-outline flex items-center justify-center font-bold text-sm z-10">3</div>
                      <span className="absolute top-10 text-[10px] font-mono font-semibold tracking-widest text-outline whitespace-nowrap">DESIGN</span>
                    </div>
                    <div className="flex-1 h-[2px] bg-outline-variant"></div>
                    <div className="flex flex-col items-center flex-1 relative">
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest text-outline flex items-center justify-center font-bold text-sm z-10">4</div>
                      <span className="absolute top-10 text-[10px] font-mono font-semibold tracking-widest text-outline whitespace-nowrap">EXPORT</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <article className="max-w-none">
                  <h1 className="font-heading text-5xl font-extrabold text-on-surface mb-8 leading-tight tracking-tight">Chapitre 1 : L&apos;Ombre du Baobab</h1>
                  <p className="text-lg leading-relaxed mb-6">
                    Le soleil de midi écrasait le Mandé d&apos;une chaleur de plomb, transformant l&apos;horizon en un miroir frémissant où se confondaient la terre rouge et le ciel de nacre. Sous le grand baobab qui veillait sur Niani depuis des générations, le silence n&apos;était troublé que par le bourdonnement lancinant des insectes et le souffle court d&apos;un enfant qui refusait de s&apos;avouer vaincu.
                  </p>
                  <p className="text-lg leading-relaxed mb-6">
                    Soundiata, les jambes inertes mais le regard embrasé d&apos;une volonté farouche, fixait la branche basse de l&apos;arbre séculaire. Pour beaucoup, il n&apos;était qu&apos;un fils infirme, un prince sans royaume intérieur. Mais dans le secret de son âme, une force commençait à gronder, plus puissante que les armées de son demi-frère Dankaran Touman.
                  </p>
                </article>

                {/* Floating Action Bar */}
                <div className="flex justify-center pt-12">
                  <button className="group flex items-center gap-2 bg-white border border-secondary/30 text-secondary px-6 py-3 rounded-full hover:bg-secondary hover:text-white transition-all shadow-lg">
                    <span className="material-symbols-outlined">auto_awesome</span>
                    <span className="font-heading font-semibold">Continuer l&apos;écriture avec l&apos;IA</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
