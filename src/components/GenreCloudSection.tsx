"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface TagItem {
  label: string;
  featured?: boolean;
}

const ROW_1: TagItem[] = [
  { label: "Romans de fiction", featured: true },
  { label: "Guides pratiques" },
  { label: "Livres de recettes" },
  { label: "Développement personnel", featured: true },
  { label: "Essais stratégiques" },
  { label: "Biographies & Mémoires" },
  { label: "Recueils de poésie" },
  { label: "E-books Amazon KDP", featured: true },
  { label: "Livres jeunesse" },
  { label: "Thrillers & Polars" },
  { label: "Contes traditionnels" },
  { label: "Méthodes pas à pas" },
];

const ROW_2: TagItem[] = [
  { label: "Manuels d'entreprise" },
  { label: "Histoires courtes" },
  { label: "Récits de voyage", featured: true },
  { label: "Livres blancs B2B" },
  { label: "Santé & Bien-être" },
  { label: "Science-fiction & Utopies", featured: true },
  { label: "Contes & Légendes" },
  { label: "Formations & Masterclass" },
  { label: "Romans d'amour" },
  { label: "Chroniques historiques" },
  { label: "Cahiers d'exercices" },
  { label: "Guides de reconversion" },
];

const ROW_3: TagItem[] = [
  { label: "Finances personnelles", featured: true },
  { label: "Fables & Mythologie" },
  { label: "Guides de parentalité" },
  { label: "Essais philosophiques" },
  { label: "Monographies" },
  { label: "Livres d'art & culture", featured: true },
  { label: "Guides de productivité" },
  { label: "Romans fantastiques" },
  { label: "Récits initiatiques" },
  { label: "Livres de coaching" },
  { label: "Guides d'éloquence" },
  { label: "Mémoires professionnels" },
];

const ROW_4: TagItem[] = [
  { label: "Mémoires de famille" },
  { label: "Spiritualité & Méditation" },
  { label: "Gastronomie & Terroir", featured: true },
  { label: "Guides d'investissement" },
  { label: "Nouvelles littéraires" },
  { label: "Récits autobiographiques" },
  { label: "Management & Leadership", featured: true },
  { label: "Carnets d'aventure" },
  { label: "Anthologies poétiques" },
  { label: "Livres audio & PDF", featured: true },
  { label: "Guides d'écriture" },
  { label: "Essais d'actualité" },
];

function MarqueeRow({ items, direction = "left" }: { items: TagItem[]; direction?: "left" | "right" }) {
  // Duplicate array 3 times for seamless looping
  const duplicated = [...items, ...items, ...items];
  const animationClass = direction === "left" ? "animate-marquee-left" : "animate-marquee-right";

  return (
    <div className="relative w-full overflow-hidden py-1.5">
      <div className={`${animationClass} flex gap-3 sm:gap-4 px-3`}>
        {duplicated.map((item, idx) => (
          <div
            key={`${item.label}-${idx}`}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-semibold tracking-normal whitespace-nowrap transition-all duration-200 select-none shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-default ${
              item.featured
                ? "bg-[#FDF3F1] border border-[#F4C5BC] text-[#C84B31] font-bold"
                : "bg-white dark:bg-neutral-900 border border-neutral-200/90 text-neutral-800 dark:text-neutral-200 hover:border-[#F4C5BC] hover:text-[#C84B31]"
            }`}
          >
            {item.featured && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#C84B31] inline-block mr-2 align-middle" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GenreCloudSection() {
  return (
    <section className="py-24 md:py-32 bg-neutral-50/70 border-b border-neutral-200/80 dark:border-neutral-800 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#C84B31]/10 via-[#FDF3F1]/80 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center mb-12 sm:mb-14">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold mb-5 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C84B31]" />
          <span>Flexibilité littéraire totale</span>
        </div>

        {/* Main Heading */}
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight leading-[1.15]">
          Écrivez tout ce que vous pouvez <span className="text-[#C84B31]">imaginer</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 mt-5 font-normal leading-relaxed max-w-2xl mx-auto">
          Iris vous offre la structure et la liberté nécessaires pour rédiger, illustrer et exporter tous les types de livres que vous souhaitez publier.
        </p>
      </div>

      {/* Multi-row Animated Cloud */}
      <div className="relative w-full overflow-hidden space-y-1 sm:space-y-2 py-2">
        {/* Left & Right Gradient Edge Fades */}
        <div className="absolute top-0 left-0 w-16 sm:w-32 md:w-56 h-full bg-gradient-to-r from-neutral-50 via-neutral-50/90 to-transparent z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-16 sm:w-32 md:w-56 h-full bg-gradient-to-l from-neutral-50 via-neutral-50/90 to-transparent z-20 pointer-events-none" />

        <MarqueeRow items={ROW_1} direction="left" />
        <MarqueeRow items={ROW_2} direction="right" />
        <MarqueeRow items={ROW_3} direction="left" />
        <MarqueeRow items={ROW_4} direction="right" />
      </div>

      {/* Bottom CTA bar */}
      <div className="max-w-xl mx-auto px-4 text-center mt-12 sm:mt-14">
        <Link href="/register">
          <button className="inline-flex items-center gap-2.5 bg-[#C84B31] hover:bg-[#B83E26] text-white text-sm sm:text-base font-bold px-8 py-3.5 rounded-full transition-all shadow-sm hover:shadow-md cursor-pointer">
            <span>Donner vie à mon projet</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </section>
  );
}
