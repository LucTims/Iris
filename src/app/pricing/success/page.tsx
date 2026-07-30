import Link from "next/link";
import Footer from "@/components/Footer";

export default function PricingSuccessPage() {
  return (
    <div className="min-h-screen bg-white font-body text-neutral-900 flex flex-col justify-between">
      <main className="pt-36 pb-20 max-w-4xl mx-auto px-6 w-full text-center flex-grow flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-emerald-500 text-8xl mb-6">check_circle</span>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight mb-4">
          Paiement réussi !
        </h1>
        <p className="text-lg text-neutral-600 mb-8 max-w-xl">
          Merci pour votre confiance. Votre compte a été mis à jour et vos nouvelles fonctionnalités sont maintenant débloquées.
        </p>
        
        <Link href="/dashboard">
          <button className="bg-neutral-900 hover:bg-black text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg">
            Accéder à mon tableau de bord
          </button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}
