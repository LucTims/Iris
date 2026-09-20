import Link from "next/link";
import Footer from "@/components/Footer";
import { IrisMark } from "@/components/IrisLogo";
import { Shield, Lock, Server } from "lucide-react";

export default function LegalPageLayout({
  title,
  subtitle,
  updatedAt,
  activeHref,
  children,
  showSecurityGrid = false,
}: {
  title: string;
  subtitle: string;
  updatedAt: string;
  activeHref: string;
  children: React.ReactNode;
  showSecurityGrid?: boolean;
}) {
  const navLinks = [
    { href: "/features", label: "Fonctionnalités" },
    { href: "/how-it-works", label: "Comment ça marche" },
    { href: "/pricing", label: "Tarifs" },
    { href: "/privacy", label: "Sécurité & Confidentialité" },
    { href: "/terms", label: "Conditions" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-body text-neutral-900 dark:text-neutral-100 flex flex-col justify-between selection:bg-[#FDF3F1] selection:text-[#C84B31]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1 shrink-0 group">
            <IrisMark size={30} className="text-brand shrink-0 rotate-6 transition-transform group-hover:scale-105" />
            <span className="font-heading font-extrabold text-2xl sm:text-3xl text-neutral-900 dark:text-neutral-100 tracking-tight">ris</span>
          </Link>

          <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.href === activeHref
                    ? "text-[#C84B31] font-bold"
                    : "hover:text-[#C84B31] transition-colors"
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              href="/login"
              className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hidden sm:block"
            >
              Se connecter
            </Link>
            <Link href="/register">
              <button className="bg-[#C84B31] hover:bg-[#B83E26] text-white px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all shadow-sm whitespace-nowrap">
                Commencer
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 sm:pt-36 pb-20 w-full">
        {/* En-tête de page moderne */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center mb-16">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="bg-[#FDF3F1] dark:bg-[#FDF3F1]/10 text-[#C84B31] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
              Politique de confiance
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight leading-[1.1] mb-6">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl mx-auto font-medium">
            {subtitle}
          </p>
          <p className="text-sm text-neutral-400 mt-6 font-semibold">
            Dernière mise à jour : {updatedAt}
          </p>
        </div>

        {/* Grille d'engagement Sécurité (Optionnelle) */}
        {showSecurityGrid && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-16">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-200/80 dark:border-neutral-800">
                <Lock className="w-8 h-8 text-[#C84B31] mb-4" />
                <h3 className="font-heading text-xl font-bold mb-3 dark:text-neutral-100">Chiffrement</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  TLS 1.3 en transit, AES-256 au repos. Vos manuscrits et données personnelles sont systématiquement chiffrés.
                </p>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-200/80 dark:border-neutral-800">
                <Server className="w-8 h-8 text-[#C84B31] mb-4" />
                <h3 className="font-heading text-xl font-bold mb-3 dark:text-neutral-100">Infrastructure Cloud</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Serveurs cloud résilients avec sauvegardes automatiques, redondance et isolement strict de chaque compte.
                </p>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-200/80 dark:border-neutral-800">
                <Shield className="w-8 h-8 text-[#C84B31] mb-4" />
                <h3 className="font-heading text-xl font-bold mb-3 dark:text-neutral-100">Surveillance 24/7</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Détection d'anomalies en temps réel et audits réguliers pour prévenir et bloquer toute activité suspecte.
                </p>
              </div>
            </div>
            
            <div className="my-16 h-px w-full bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent"></div>
          </div>
        )}

        {/* Contenu textuel */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 sm:p-10 md:p-14 shadow-lg border border-neutral-200/60 dark:border-neutral-800 space-y-10 text-neutral-700 dark:text-neutral-300 text-[15px] leading-relaxed">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** Section numérotée d'un document légal. */
export function LegalSection({
  number,
  title,
  children,
}: {
  number?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 scroll-mt-28 border-b border-neutral-100 dark:border-neutral-800/60 pb-10 last:border-0 last:pb-0" id={number ? `section-${number}` : undefined}>
      <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
        {number && <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FDF3F1] dark:bg-[#C84B31]/10 text-[#C84B31] text-sm shrink-0">{number}</span>}
        <span>{title}</span>
      </h2>
      <div className="space-y-4 text-neutral-600 dark:text-neutral-400">{children}</div>
    </section>
  );
}
