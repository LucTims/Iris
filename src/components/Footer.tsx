import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-neutral-200/80 pt-16 pb-12 font-body overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
          {/* Left Column Tagline */}
          <div>
            <h3 className="font-heading font-medium text-2xl md:text-3xl text-neutral-900 tracking-tight">
              Expérience Iris
            </h3>
          </div>

          {/* Right Link Columns */}
          <div className="grid grid-cols-2 gap-16 text-sm">
            {/* Column 1: Produit */}
            <div className="flex flex-col gap-3">
              <span className="font-medium text-neutral-400 mb-1">Produit</span>
              <Link href="/dashboard" className="text-neutral-800 hover:text-secondary font-medium transition-colors">Plateforme</Link>
              <Link href="/features" className="text-neutral-800 hover:text-secondary font-medium transition-colors">Fonctionnalités</Link>
              <Link href="/how-it-works" className="text-neutral-800 hover:text-secondary font-medium transition-colors">Comment ça marche</Link>
            </div>

            {/* Column 2: Ressources */}
            <div className="flex flex-col gap-3">
              <span className="font-medium text-neutral-400 mb-1">Ressources</span>
              <Link href="/pricing" className="text-neutral-800 hover:text-secondary font-medium transition-colors">Tarifs</Link>
              <Link href="/faq" className="text-neutral-800 hover:text-secondary font-medium transition-colors">Aide & FAQ</Link>
            </div>
          </div>
        </div>

        {/* Giant Antigravity-Style Center Text: Iris BoomAI (Perfectly Centered & Enlarged) */}
        <div className="w-full my-10 py-6 border-y border-neutral-100 flex items-center justify-center text-center">
          <span className="font-heading font-medium text-[13.5vw] md:text-[160px] lg:text-[210px] tracking-tighter text-neutral-900 leading-none select-none">
            Iris BoomAI
          </span>
        </div>

        {/* Bottom Bar: Boom (Replacing Google at the bottom left) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 text-sm text-neutral-600">
          <div className="flex items-center">
            <span className="font-heading font-bold text-2xl text-neutral-900 tracking-tight">
              Boom
            </span>
          </div>

          <div className="flex items-center gap-8 font-medium">
            <Link href="/about" className="hover:text-neutral-900 transition-colors">À propos de Boom</Link>
            <Link href="/privacy" className="hover:text-neutral-900 transition-colors">Confidentialité</Link>
            <Link href="/terms" className="hover:text-neutral-900 transition-colors">Conditions</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
