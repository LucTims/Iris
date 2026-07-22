import Link from "next/link";
import Footer from "@/components/Footer";

export default function FAQPage() {
  const faqs = [
    {
      q: "Suis-je propriétaire à 100% des droits sur les livres générés ?",
      a: "Absolument. Vous conservez l'intégralité des droits d'auteur, de propriété intellectuelle et de commercialisation sur tous les textes et visuels créés sur Iris."
    },
    {
      q: "Est-ce que les livres sont compatibles avec Amazon KDP ?",
      a: "Oui, tous les fichiers exportés au format ePub ou PDF respectent strictement les spécifications de mise en page et de résolution d'Amazon KDP, Kobo et Apple Books."
    },
    {
      q: "Combien de mots puis-je générer par mois ?",
      a: "Le plan Gratuit comprend 5 000 mots par mois. Le plan Auteur Pro offre une génération illimitée de mots et de couvertures HD."
    },
    {
      q: "Puis-je personnaliser le style d'écriture de l'IA ?",
      a: "Tout à fait ! Vous pouvez indiquer le ton souhaité (pédagogique, captivant, académique, narratif) et guider Iris au fil de la discussion chapitre par chapitre."
    },
    {
      q: "Quels sont les formats d'exportation disponibles ?",
      a: "Iris vous permet d'exporter directement en EPUB (pour les liseuses et boutiques d'eBooks) et en PDF professionnel prêt à imprimer ou télécharger."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-body text-neutral-900 flex flex-col justify-between">
      {/* Header / Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-heading font-extrabold text-3xl md:text-4xl text-neutral-900 tracking-tight">
            Iris
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-700">
            <Link href="/features" className="hover:text-secondary transition-colors">Fonctionnalités</Link>
            <Link href="/how-it-works" className="hover:text-secondary transition-colors">Comment ça marche</Link>
            <Link href="/pricing" className="hover:text-secondary transition-colors">Tarifs</Link>
            <Link href="/blog" className="hover:text-secondary transition-colors">Blog</Link>
            <Link href="/faq" className="text-secondary font-bold">Aide & FAQ</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 hidden sm:block">
              Se connecter
            </Link>
            <Link href="/register">
              <button className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">
                Commencer gratuitement →
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-36 pb-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block py-1.5 px-4 rounded-full bg-orange-50 border border-orange-200 text-secondary font-bold text-xs uppercase tracking-widest mb-4">
            FOIRE AUX QUESTIONS
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight mb-6">
            Questions Fréquentes
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Retrouvez ici toutes les réponses concernant le fonctionnement d&apos;Iris, les abonnements et les droits d&apos;auteur.
          </p>
        </div>

        {/* FAQ List */}
        <div className="max-w-4xl mx-auto space-y-6 mb-20">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-neutral-50 rounded-3xl p-8 border border-neutral-200/80">
              <h3 className="font-heading text-xl font-bold text-neutral-900 mb-3 flex items-start gap-3">
                <span className="text-secondary font-extrabold">Q.</span>
                <span>{faq.q}</span>
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed pl-8">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
