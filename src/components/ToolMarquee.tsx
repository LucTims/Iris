"use client";

import { motion } from "framer-motion";

const tools = [
  "Mailchimp",
  "KDP Rocket",
  "Grammarly",
  "Notion IA",
  "ChatGPT Plus",
  "Canva Pro",
];

export default function ToolMarquee() {
  // Duplicate array multiple times for smooth infinite scroll
  const extendedTools = [...tools, ...tools, ...tools, ...tools];

  return (
    <section className="bg-secondary py-16 md:py-20 overflow-hidden relative shadow-inner">
      {/* Background Ornaments for premium feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-400/40 blur-[80px] rounded-full"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-400/30 blur-[80px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center mb-10">
        <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-sm">
          Dites adieu aux abonnements multiples
        </h2>
        <p className="text-lg md:text-xl text-orange-50 font-medium max-w-2xl mx-auto">
          Iris centralise et remplace tous vos outils d'écriture, de correction, de design et de mise en page.
        </p>
      </div>

      <div className="relative z-10 flex whitespace-nowrap overflow-hidden py-4">
        {/* Fade gradients at edges */}
        <div className="absolute top-0 left-0 w-12 md:w-32 h-full bg-gradient-to-r from-secondary to-transparent z-20 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-12 md:w-32 h-full bg-gradient-to-l from-secondary to-transparent z-20 pointer-events-none"></div>

        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
          className="flex gap-4 md:gap-6 px-4 md:px-6 w-max items-center"
        >
          {extendedTools.map((tool, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-white text-neutral-900 px-6 py-3.5 md:px-8 md:py-4 rounded-full font-extrabold shadow-xl text-sm md:text-lg shrink-0 transition-transform hover:scale-105"
            >
              <svg 
                className="w-4 h-4 md:w-5 md:h-5 text-red-500 shrink-0" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={4}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{tool}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
