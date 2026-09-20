import Link from "next/link";
import Footer from "@/components/Footer";
import { IrisMark } from "@/components/IrisLogo";

/**
 * Gabarit commun aux pages légales (confidentialité, conditions d'utilisation).
 *
 * La barre de navigation et l'ossature de la page étaient dupliquées à
 * l'identique dans chaque page légale : toute correction de menu devait être
 * répétée partout, et une page finissait toujours par diverger.
 */
export default function LegalPageLayout({
  title,
  subtitle,
  updatedAt,
  activeHref,
  children,
}: {
  title: string;
  subtitle: string;
  updatedAt: string;
  activeHref: string;
  children: React.ReactNode;
}) {
  const navLinks = [
    { href: "/features", label: "Fonctionnalités" },
    { href: "/how-it-works", label: "Comment ça marche" },
    { href: "/pricing", label: "Tarifs" },
    { href: "/privacy", label: "Confidentialité" },
    { href: "/terms", label: "Conditions" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 font-body text-neutral-900 dark:text-neutral-100 flex flex-col justify-between">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <IrisMark size={30} className="text-brand shrink-0 group-hover:scale-105 transition-transform" />
            <span className="font-heading font-extrabold text-2xl sm:text-3xl text-neutral-900 dark:text-neutral-100 tracking-tight">
              Iris
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.href === activeHref
                    ? "text-secondary font-bold"
                    : "hover:text-secondary transition-colors"
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              href="/login"
              className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hidden sm:block"
            >
              Se connecter
            </Link>
            <Link href="/register">
              <button className="bg-secondary hover:bg-orange-600 text-white px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all shadow-sm whitespace-nowrap">
                Commencer
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 sm:pt-36 pb-20 max-w-4xl mx-auto px-4 sm:px-6 w-full">
        <header className="mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {title}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-3 text-sm sm:text-base leading-relaxed">
            {subtitle}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-4 font-semibold">
            Dernière mise à jour : {updatedAt}
          </p>
        </header>

        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-3xl p-5 sm:p-8 md:p-12 border border-neutral-200/80 dark:border-neutral-800 space-y-8 text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">
          {children}
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
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 scroll-mt-28" id={`section-${number}`}>
      <h2 className="font-heading text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 flex gap-2.5">
        <span className="text-secondary shrink-0">{number}.</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
