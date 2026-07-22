import Link from "next/link";

export default function BillingPage() {
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
          <h1 className="font-heading text-3xl font-bold text-on-surface">Abonnement & Facturation</h1>
          <p className="text-on-surface-variant mt-2">Gérez votre plan actuel, vos méthodes de paiement et téléchargez vos factures.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Settings Sidebar */}
          <aside className="w-full md:w-64 space-y-1">
            <Link href="/settings" className="w-full flex items-center justify-between px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-xl transition-all">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">person</span>
                <span>Profil</span>
              </div>
            </Link>
            <button className="w-full flex items-center justify-between px-4 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-bold transition-all">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">credit_card</span>
                <span>Abonnement</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-xl transition-all">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                <span>Factures</span>
              </div>
            </button>
          </aside>

          {/* Billing Content */}
          <main className="flex-1 space-y-6">
            
            {/* Current Plan Card */}
            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="inline-block py-1 px-3 rounded-full bg-success-teal/10 text-success-teal font-mono text-xs font-bold tracking-widest mb-3">
                      PLAN ACTUEL
                    </span>
                    <h2 className="font-heading text-2xl font-bold text-on-surface">Auteur Pro</h2>
                    <p className="text-on-surface-variant mt-1">4 900 FCFA / mois</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-on-surface">Prochain prélèvement</p>
                    <p className="text-sm text-on-surface-variant">12 Octobre 2024</p>
                  </div>
                </div>

                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-secondary rounded-full w-[45%]"></div>
                </div>
                <p className="text-xs text-on-surface-variant mb-6">45,000 mots générés sur illimités ce mois-ci.</p>

                <div className="flex gap-4">
                  <button className="bg-surface-container text-on-surface px-4 py-2 rounded-lg font-semibold hover:bg-surface-container-high transition-colors text-sm">
                    Annuler l&apos;abonnement
                  </button>
                  <Link href="/pricing" className="bg-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-secondary/90 transition-colors text-sm shadow-sm">
                    Changer de forfait
                  </Link>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="p-8">
                <h3 className="font-heading text-lg font-bold text-on-surface mb-6">Moyen de paiement</h3>
                
                <div className="flex items-center justify-between p-4 border border-outline-variant rounded-xl mb-4 bg-surface-container-lowest">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-surface-container rounded border border-outline-variant flex items-center justify-center font-mono font-bold text-secondary text-xs">
                      VISA
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Visa terminant par 4242</p>
                      <p className="text-xs text-on-surface-variant">Expire le 12/26</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-success-teal bg-success-teal/10 px-2 py-1 rounded">Par défaut</span>
                </div>

                <button className="text-sm font-semibold text-secondary hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Ajouter un moyen de paiement
                </button>
              </div>
            </div>

          </main>
        </div>
      </div>
    </>
  );
}
