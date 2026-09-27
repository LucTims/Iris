import Link from "next/link";
import dynamic from "next/dynamic";
import LandingNavbar from "@/components/LandingNavbar";
import HeroActions from "@/components/HeroActions";
import { IrisMark } from "@/components/IrisLogo";
import { MessageSquare, Palette, Download, ArrowRight } from "lucide-react";

import HeroVideoShowcase from "@/components/HeroVideoShowcase";

const ToolMarquee = dynamic(() => import("@/components/ToolMarquee"));
const BookShowcaseMarquee = dynamic(() => import("@/components/BookShowcaseMarquee"));
const GenreCloudSection = dynamic(() => import("@/components/GenreCloudSection"));
const Footer = dynamic(() => import("@/components/Footer"));
const HowItWorksSection = dynamic(() => import("@/components/HowItWorksSection"));
const DeliverablesSection = dynamic(() => import("@/components/DeliverablesSection"));
const PricingSection = dynamic(() => import("@/components/PricingSection"));
const FAQSection = dynamic(() => import("@/components/FAQSection"));

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-landing selection:bg-orange-100 flex flex-col justify-between">
      <link rel="preload" href="/iris-video-poster.webp" as="image" />
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
      <LandingNavbar />

      {/* Hero Section with Dot Matrix Grid Background */}
      <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 lg:pt-44 lg:pb-36 overflow-hidden bg-white dark:bg-neutral-900">
        
        {/* Dot Matrix Canvas Background Grid - DISCREET VISIBILITY & GRADUAL FADE OUT */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none z-0" 
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
            backgroundSize: '20px 20px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)'
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Centered Hero Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-3xl lg:max-w-4xl mx-auto flex flex-col items-center text-center">
            {/* Badge Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF3F1] border border-[#F4C5BC]/70 text-[#C84B31] text-xs font-semibold mb-6 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C84B31] inline-block shrink-0"></span>
              <span>La première co-création littéraire assistée par IA</span>
            </div>

            {/* Main Title */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[54px] xl:text-[62px] font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight leading-[1.1] mb-6">
              Votre savoir mérite un livre. <br />
              <span className="inline-flex items-center text-[#C84B31] relative top-[0.1em]">
                <IrisMark className="h-[0.9em] w-auto rotate-6 mr-[0.05em]" />
                <span>ris</span>
              </span>{" "}l&apos;écrit avec vous.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl mb-8 font-normal">
              Transformez votre expertise en un livre prêt à publier. Rédigez et mettez en page chaque chapitre facilement avec votre assistant IA.
            </p>

            {/* Action Buttons Row */}
            <HeroActions />

            {/* Micro-copy */}
            <p className="text-xs sm:text-[13px] text-neutral-400 font-medium">
              Sans carte bancaire · Export prêt à publier · .docx / .epub
            </p>
          </div>

          {/* Full-width Presentation Video Showcase */}
          <HeroVideoShowcase />
        </div>
      </section>

      {/* Real Books Showcase Marquee Section */}
      <BookShowcaseMarquee />

      {/* Tools Replacement Marquee Section (Services qu'Iris remplace) */}
      <ToolMarquee />

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 bg-neutral-50/60 dark:bg-neutral-800/20">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
              Une expérience de création sans effort
            </h2>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400">
              Iris s&apos;occupe de la structure, de la rédaction et de la mise en forme pour que vous puissiez vous concentrer sur vos idées.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                icon: MessageSquare,
                title: "Assistant Co-Rédaction",
                desc: "Échangez naturellement avec l'IA. Elle pose les bonnes questions et rédige vos chapitres selon votre style."
              },
              {
                icon: Palette,
                title: "Design & Couvertures HD",
                desc: "Générez des couvertures d'eBooks professionnelles adaptées à Amazon Kindle, Kobo et aux formats papier."
              },
              {
                icon: Download,
                title: "Export Multi-Formats",
                desc: "Téléchargez votre livre prêt à vendre aux formats PDF, EPUB et DOCX en un seul clic."
              }
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="bg-white dark:bg-neutral-900 rounded-[2rem] p-10 border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-[#FDF3F1] text-[#C84B31] border border-[#F4C5BC]/60 flex items-center justify-center mb-8 transition-transform group-hover:scale-110">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{feat.title}</h3>
                    <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* How it works (3 simple steps) */}
      <HowItWorksSection />

      {/* What you get (Deliverables) */}
      <DeliverablesSection />

      {/* Genre Cloud Section ("Écrivez tout ce que vous pouvez imaginer") */}
      <GenreCloudSection />

      {/* Pricing Grid */}
      <PricingSection />

      {/* FAQ */}
      <FAQSection />

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-gradient-to-br from-[#8C2717] via-[#A8321D] to-[#C84B31] text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="font-heading text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Prêt à publier votre premier livre ?
          </h2>
          <p className="text-xl text-neutral-300 mb-10 max-w-2xl mx-auto">
            Rejoignez des centaines d&apos;auteurs et d&apos;experts qui ont déjà donné vie à leurs ouvrages grâce à Iris.
          </p>
          <Link href="/register">
            <button className="bg-secondary hover:bg-[#E0482B] text-white px-10 py-5 rounded-full text-xl font-bold transition-all shadow-lg hover:scale-105 inline-flex items-center gap-3 cursor-pointer">
              <span>Démarrer l&apos;expérience Iris</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </Link>
        </div>
      </section>

      {/* Antigravity-Style Footer */}
      <Footer />

    </div>
  );
}
