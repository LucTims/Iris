import Link from "next/link";

export default function SettingsPage() {
  return (
    <>
      <nav className="bg-surface/80 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-outline-variant">
        <div className="flex justify-between items-center w-full px-6 max-w-[1200px] mx-auto h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-heading text-2xl font-extrabold text-secondary">Iris</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-on-surface-variant hover:text-secondary transition-colors">Retour au Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-[1000px] mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-on-surface">Paramètres</h1>
          <p className="text-on-surface-variant mt-2">Gérez votre profil, vos préférences et les paramètres de votre compte.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Settings Sidebar */}
          <aside className="w-full md:w-64 space-y-1">
            <button className="w-full flex items-center justify-between px-4 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-bold transition-all">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">person</span>
                <span>Profil</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-xl transition-all">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">psychology</span>
                <span>Préférences IA</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-xl transition-all">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">notifications</span>
                <span>Notifications</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-xl transition-all">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">lock</span>
                <span>Sécurité</span>
              </div>
            </button>
            <Link href="/billing" className="w-full flex items-center justify-between px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-xl transition-all">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">credit_card</span>
                <span>Abonnement</span>
              </div>
            </Link>
          </aside>

          {/* Settings Content */}
          <main className="flex-1 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-8 border-b border-outline-variant">
              <h2 className="font-heading text-xl font-bold text-on-surface mb-6">Informations Personnelles</h2>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-4xl text-outline">person</span>
                </div>
                <div>
                  <button className="bg-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-secondary/90 transition-colors mb-2">
                    Changer l&apos;avatar
                  </button>
                  <p className="text-xs text-on-surface-variant">JPG, GIF ou PNG. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1.5">Prénom</label>
                  <input type="text" defaultValue="Amadou" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1.5">Nom</label>
                  <input type="text" defaultValue="Hampâté Bâ" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-on-surface mb-1.5">Email</label>
                  <input type="email" defaultValue="amadou@exemple.com" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-on-surface mb-1.5">Bio</label>
                  <textarea rows={4} defaultValue="Auteur passionné par les traditions orales africaines." className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"></textarea>
                </div>
              </div>
            </div>

            <div className="p-8 bg-surface-container-lowest flex justify-end gap-4">
              <button className="px-6 py-2.5 rounded-lg font-semibold text-on-surface hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button className="bg-secondary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-secondary/90 transition-colors shadow-sm">
                Enregistrer les modifications
              </button>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
