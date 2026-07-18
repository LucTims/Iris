"use client";

import { motion } from "framer-motion";
import { BookOpen, Sparkles, PenTool, Layout, Download, ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function Home() {
  return (
    <main className="flex-1 bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Livre-Génie</span>
          </div>
          <Link href="/chat">
            <button className="px-5 py-2 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              Commencer
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/30 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-primary-foreground mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>La première plateforme de co-création assistée par IA</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 text-white leading-tight">
              Transformez votre expertise en un <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-purple-400">livre numérique</span>.
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Vous avez le savoir, nous avons la plume. Discutez simplement avec notre assistant IA pour écrire, structurer et designer votre eBook prêt à être vendu. Aucune compétence technique requise.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/chat">
                <button className="flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-full bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                  Créer mon livre maintenant
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <button className="px-8 py-4 text-base font-semibold rounded-full bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm">
                Voir un exemple
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features/Steps Section */}
      <section className="py-24 bg-black/50 border-y border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">Comment ça marche ?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Un processus simple, conversationnel et collaboratif de la première idée jusqu'au fichier final.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: MessageSquare,
                title: "1. Le brief",
                desc: "Discutez avec l'IA pour définir votre sujet, votre cible et l'angle de votre livre."
              },
              {
                icon: PenTool,
                title: "2. La co-écriture",
                desc: "L'IA rédige avec vous, chapitre par chapitre. Vous gardez le contrôle total."
              },
              {
                icon: Layout,
                title: "3. Le design",
                desc: "Générez une couverture professionnelle et une mise en page automatique."
              },
              {
                icon: Download,
                title: "4. L'export",
                desc: "Téléchargez votre livre au format PDF, prêt à être monétisé immédiatement."
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {/* @ts-ignore - Lucide icon typing issue with framer motion sometimes */}
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">Prêt à partager votre expertise avec le monde ?</h2>
          <p className="text-xl text-muted-foreground mb-10">Rejoignez les créateurs africains qui ont déjà transformé leurs connaissances en revenus.</p>
          <Link href="/chat">
            <button className="px-10 py-5 text-lg font-bold rounded-full bg-white text-black hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              Démarrer l'expérience Livre-Génie
            </button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-muted-foreground">
        <p>© 2026 Livre-Génie par Iris. Tous droits réservés.</p>
      </footer>
    </main>
  );
}
