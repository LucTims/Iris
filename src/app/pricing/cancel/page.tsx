import Link from "next/link";
import Footer from "@/components/Footer";

export default function PricingCancelPage() {
  return (
    <div className="min-h-screen bg-white font-body text-neutral-900 flex flex-col justify-between">
      <main className="pt-36 pb-20 max-w-4xl mx-auto px-6 w-full text-center flex-grow flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-red-500 text-8xl mb-6">cancel</span>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight mb-4">
          Paiement annulé ou échoué
        </h1>
        <p className="text-lg text-neutral-600 mb-8 max-w-xl">
          Aucun montant n'a été débité. Vous pouvez réessayer de souscrire à un plan à tout moment.
        </p>
        
        <div className="flex gap-4">
          <Link href="/pricing">
            <button className="bg-neutral-900 hover:bg-black text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg">
              Réessayer
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 px-8 py-4 rounded-full text-lg font-bold transition-all">
              Retour au tableau de bord
            </button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
