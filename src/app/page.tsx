"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import DoodleFeatherMascot from "@/components/DoodleFeatherMascot";
import HeroProductShowcase from "@/components/HeroProductShowcase";
import ToolMarquee from "@/components/ToolMarquee";
import Footer from "@/components/Footer";
import { useUser } from "@/hooks/useUser";

export default function Home() {
  const { user } = useUser();
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-landing selection:bg-orange-100 flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Iris",
            "operatingSystem": "Web",
            "applicationCategory": "BusinessApplication",
            "url": "https://www.irisboom.online",
            "description": "Iris est la première plateforme de co-création littéraire assistée par IA. Transformez votre expertise en un livre numérique prêt à être publié.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR"
            },
            "creator": {
              "@type": "Organization",
              "name": "IrisBoom",
              "url": "https://www.irisboom.online"
            }
          })
        }}
      />
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 sm:gap-3 group shrink-0">
            <img src="/iris-logo.png" alt="Iris" className="w-8 h-8 sm:w-10 sm:h-10 object-contain group-hover:scale-105 transition-transform" />
            <span className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-neutral-900">
              Iris
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8 font-semibold text-neutral-600">
            <Link href="/features" className="hover:text-neutral-900 transition-colors">Fonctionnalités</Link>
            <Link href="/how-it-works" className="hover:text-neutral-900 transition-colors">Comment ça marche</Link>
            <Link href="/pricing" className="hover:text-neutral-900 transition-colors">Tarifs</Link>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/login" className="hidden sm:inline-block font-semibold text-neutral-700 hover:text-neutral-900 transition-colors">
              Se connecter
            </Link>
            <Link href="/register">
              <button className="bg-secondary hover:bg-[#E0482B] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-base font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 whitespace-nowrap">
                <span>Commencer <span className="hidden sm:inline">gratuitement</span></span>
                <span className="material-symbols-outlined text-sm sm:text-lg">arrow_forward</span>
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Dot Matrix Grid Background */}
      <section className="relative pt-24 pb-4 md:pt-32 md:pb-6 overflow-hidden bg-white">
        
        {/* Dot Matrix Canvas Background Grid - DISCREET VISIBILITY & GRADUAL FADE OUT */}
        <div 
          className="absolute inset-0 opacity-35 pointer-events-none z-0" 
          style={{
            backgroundImage: 'radial-gradient(#9ca3af 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 85%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 85%)'
          }}
        />

        {/* Curvilinear Vector Trajectory Lines (connecting elements from inside to outside) */}
        <svg className="absolute inset-0 w-full h-[600px] pointer-events-none z-0 opacity-30">
          <path 
            d="M 50 140 C 250 180, 350 80, 500 120 C 650 160, 800 90, 1100 150" 
            stroke="#d4d4d8" 
            strokeWidth="1.5" 
            fill="none" 
            strokeDasharray="5 5"
          />
          <path 
            d="M 100 280 C 300 240, 450 320, 600 260 C 750 200, 900 300, 1150 220" 
            stroke="#F95738" 
            strokeWidth="1.2" 
            fill="none" 
            opacity="0.4"
          />
        </svg>

        {/* Floating Green Badge (Left side: 100% straight, zero rotation) */}
        <motion.div 
          animate={{ y: [0, -6, 0] }} 
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="absolute top-24 left-[3%] md:left-[8%] z-10 hidden sm:block pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-3.5 py-1.5 rounded-full text-emerald-800 text-xs font-bold shadow-xs">
            <div className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center text-black font-extrabold text-[9px]">
              ::
            </div>
            <span>Assistant IA Actif</span>
          </div>
        </motion.div>

        {/* Floating Orange Badge (Right side: 100% straight, zero rotation) */}
        <motion.div 
          animate={{ y: [0, 6, 0] }} 
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
          className="absolute top-24 right-[3%] md:right-[8%] z-10 hidden sm:block pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-300 px-3.5 py-1.5 rounded-full text-orange-800 text-xs font-bold shadow-xs">
            <span className="text-secondary font-extrabold">✦</span>
            <span>Co-Création 10x Rapide</span>
          </div>
        </motion.div>

        {/* Floating Star & Cross Vector Ornaments */}
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute top-44 left-[6%] md:left-[12%] text-neutral-400 text-2xl sm:text-3xl select-none font-mono font-light pointer-events-none z-10">
          +
        </motion.div>
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="absolute top-52 right-[8%] md:right-[13%] text-secondary/70 text-2xl sm:text-3xl select-none pointer-events-none z-10">
          ✦
        </motion.div>

        {/* Decorative background blur shapes */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-orange-200/20 to-amber-200/15 blur-[100px] rounded-full z-0 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full bg-orange-50 border border-orange-200/80 text-secondary text-xs sm:text-sm font-bold mb-6 shadow-xs"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>La 1ère plateforme de co-création littéraire assistée par IA</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl md:text-7xl font-extrabold text-neutral-900 tracking-tight leading-[1.15] mb-6"
          >
            Transformez votre expertise en un{" "}
            <span className="relative inline-block text-secondary">
              livre numérique
              <svg 
                className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-3 sm:h-5 text-secondary pointer-events-none overflow-visible" 
                viewBox="0 0 250 20" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M 2 12 Q 125 3, 248 10" 
                  stroke="currentColor" 
                  strokeWidth="5" 
                  strokeLinecap="round" 
                />
              </svg>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-2xl text-neutral-600 max-w-3xl mx-auto mb-8 leading-relaxed font-normal"
          >
            Vous avez le savoir, Iris a la plume. Discutez simplement avec notre assistant IA pour écrire, structurer et designer votre ouvrage prêt à être publié et vendu.
          </motion.p>

          {/* Hero Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8"
          >
            <Link href="/dashboard" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-neutral-900 hover:bg-black text-white px-7 py-3.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3">
                <span>Créer mon livre maintenant</span>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 px-7 py-3.5 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-bold transition-all shadow-xs">
                Accéder à mon espace
              </button>
            </Link>
          </motion.div>

          {/* Interactive Live Product Showcase Animation */}
          <HeroProductShowcase />

          {/* Mascot Integration */}
          <div className="flex justify-center mt-4 mb-2">
            <DoodleFeatherMascot className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>

        </div>
      </section>

      {/* Tools Replacement Marquee Section */}
      <ToolMarquee />

      {/* Features Section */}
      <section id="features" className="py-16 md:py-20 bg-neutral-50/60">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-neutral-900 mb-4 tracking-tight">
              Une expérience de création sans effort
            </h2>
            <p className="text-lg md:text-xl text-neutral-600">
              Iris s&apos;occupe de la structure, de la rédaction et de la mise en forme pour que vous puissiez vous concentrer sur vos idées.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "chat",
                title: "Assistant Co-Rédaction",
                desc: "Échangez naturellement avec l'IA. Elle pose les bonnes questions et rédige vos chapitres selon votre style."
              },
              {
                icon: "palette",
                title: "Design & Couvertures HD",
                desc: "Générez des couvertures d'eBooks professionnelles adaptées à Amazon Kindle, Kobo et aux formats papier."
              },
              {
                icon: "download",
                title: "Export Multi-Formats",
                desc: "Téléchargez votre livre prêt à vendre aux formats PDF, EPUB et DOCX en un seul clic."
              }
            ].map((feat, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-8 border border-neutral-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-secondary border border-orange-100 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl">{feat.icon}</span>
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-neutral-900 mb-3">{feat.title}</h3>
                  <p className="text-base text-neutral-600 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="font-heading text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Prêt à publier votre premier livre ?
          </h2>
          <p className="text-xl text-neutral-300 mb-10 max-w-2xl mx-auto">
            Rejoignez des centaines d&apos;auteurs et d&apos;experts qui ont déjà donné vie à leurs ouvrages grâce à Iris.
          </p>
          <Link href="/register">
            <button className="bg-secondary hover:bg-[#E0482B] text-white px-10 py-5 rounded-full text-xl font-bold transition-all shadow-lg hover:scale-105 inline-flex items-center gap-3">
              <span>Démarrer l&apos;expérience Iris</span>
              <span className="material-symbols-outlined text-2xl">arrow_forward</span>
            </button>
          </Link>
        </div>
      </section>

      {/* Antigravity-Style Footer */}
      <Footer />

    </div>
  );
}
