import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-surface-container-lowest">
      <nav className="bg-surface/80 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-outline-variant">
        <div className="flex justify-between items-center w-full px-6 max-w-[1200px] mx-auto h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-heading text-2xl font-extrabold text-secondary">Iris</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-on-surface-variant hover:text-secondary">Retour</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-[800px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-extrabold text-on-surface mb-4">Contactez-nous</h1>
          <p className="text-lg text-on-surface-variant">Une question, un problème ou une suggestion ? Notre équipe est là pour vous aider.</p>
        </div>

        <div className="bg-white rounded-3xl border border-outline-variant p-8 md:p-12 shadow-sm">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1.5">Prénom</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1.5">Nom</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Email *</label>
              <input type="email" required className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Sujet</label>
              <select className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all appearance-none">
                <option>Support technique</option>
                <option>Question sur la facturation</option>
                <option>Partenariat</option>
                <option>Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Message *</label>
              <textarea required rows={5} className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all resize-y"></textarea>
            </div>

            <button type="submit" className="w-full bg-secondary text-white font-heading font-bold text-lg py-4 rounded-xl shadow-md hover:bg-secondary/90 transition-colors">
              Envoyer le message
            </button>
          </form>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-secondary">mail</span>
            </div>
            <h3 className="font-bold text-on-surface mb-1">Email</h3>
            <p className="text-sm text-on-surface-variant">support@auteur.ai</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-secondary">location_on</span>
            </div>
            <h3 className="font-bold text-on-surface mb-1">Bureau</h3>
            <p className="text-sm text-on-surface-variant">Dakar, Sénégal</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-secondary">chat</span>
            </div>
            <h3 className="font-bold text-on-surface mb-1">Réseaux Sociaux</h3>
            <p className="text-sm text-on-surface-variant">@AuteurAI sur Twitter</p>
          </div>
        </div>
      </main>
    </div>
  );
}
