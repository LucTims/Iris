import Link from "next/link";
import Footer from "@/components/Footer";

export default function HowItWorksPage() {
  const steps = [
    {
      number: "01",
      title: "Définissez votre sujet et plan d'ouvrage",
      description: "Indiquez votre domaine d'expertise, le public cible et le thème de votre ouvrage. Iris génère instantanément une table des matières claire et captivante.",
      icon: "menu_book"
    },
    {
      number: "02",
      title: "Co-rédigez vos chapitres avec l'assistant IA",
      description: "Discutez simplement avec Iris chapitre par chapitre. L'IA rédige avec votre style, illustre vos idées et adapte le ton selon vos retours.",
      icon: "chat"
    },
    {
      number: "03",
      title: "Concevez une couverture HD percutante",
      description: "Générez des visuels de couverture professionnels adaptés au format Amazon KDP, Kobo et livres imprimés grâce à nos modèles IA.",
      icon: "palette"
    },
    {
      number: "04",
      title: "Exportez en PDF / EPUB et commencez à vendre",
      description: "Téléchargez votre ouvrage au format ePub et PDF parfaitement mis en page, prêt pour la publication et la monétisation immédiate.",
      icon: "download_for_offline"
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
            <Link href="/how-it-works" className="text-secondary font-bold">Comment ça marche</Link>
            <Link href="/pricing" className="hover:text-secondary transition-colors">Tarifs</Link>
            <Link href="/blog" className="hover:text-secondary transition-colors">Blog</Link>
            <Link href="/docs" className="hover:text-secondary transition-colors">Documentation</Link>
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

      {/* Hero Header */}
      <main className="pt-36 pb-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block py-1.5 px-4 rounded-full bg-orange-50 border border-orange-200 text-secondary font-bold text-xs uppercase tracking-widest mb-4">
            PROCESSUS ÉTAPES PAR ÉTAPES
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight mb-6">
            De l&apos;idée à l&apos;eBook publié en 4 étapes simples
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Iris élimine le syndrome de la page blanche et automatise le travail technique pour vous laisser vous concentrer sur ce qui compte vraiment : transmettre votre savoir.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          {steps.map((step) => (
            <div key={step.number} className="bg-neutral-50 rounded-3xl p-8 border border-neutral-200/80 flex flex-col justify-between hover:border-orange-200 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="font-heading font-extrabold text-4xl text-secondary">{step.number}</span>
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">{step.icon}</span>
                  </div>
                </div>
                <h3 className="font-heading text-xl font-bold text-neutral-900 mb-3">{step.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Box */}
        <div className="bg-neutral-900 rounded-3xl p-10 md:p-14 text-center text-white max-w-4xl mx-auto shadow-xl">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold mb-4">Prêt à créer votre propre livre numérique ?</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8 text-base">Rejoignez des centaines d&apos;auteurs qui ont concrétisé leur projet littéraire avec Iris.</p>
          <Link href="/register">
            <button className="bg-secondary hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all shadow-md">
              Créer mon premier livre gratuitement
            </button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
