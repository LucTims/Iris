"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import AppLayout from "@/components/AppLayout";

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const txId = searchParams.get("simulated_tx") || searchParams.get("transaction_id");
  const router = useRouter();
  const supabase = createClient();
  const { refreshWalletBalance } = useUser();
  const [status, setStatus] = useState<"pending" | "paid" | "failed">("pending");

  useEffect(() => {
    if (!txId) return;

    let intervalId: NodeJS.Timeout;

    const checkTransactionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("status")
          .eq("id", txId)
          .single();

        if (data && data.status === "paid") {
          setStatus("paid");
          refreshWalletBalance();
          clearInterval(intervalId);
          setTimeout(() => {
            router.push("/dashboard");
          }, 3000);
        } else if (data && data.status === "failed") {
          setStatus("failed");
          clearInterval(intervalId);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    // Poll every 3 seconds
    intervalId = setInterval(checkTransactionStatus, 3000);
    checkTransactionStatus();

    return () => clearInterval(intervalId);
  }, [txId, router, supabase, refreshWalletBalance]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {status === "pending" && (
        <>
          <span className="material-symbols-outlined text-secondary text-6xl animate-spin mb-6">hourglass_top</span>
          <h1 className="font-heading text-3xl font-extrabold text-neutral-900 mb-4">En attente de paiement...</h1>
          <p className="text-neutral-600 mb-8 max-w-md">
            Veuillez valider le paiement sur votre téléphone (Mobile Money) ou finaliser la transaction sur la page Sebpay.
            Cette page s'actualisera automatiquement une fois le paiement confirmé.
          </p>
        </>
      )}

      {status === "paid" && (
        <>
          <span className="material-symbols-outlined text-emerald-500 text-6xl mb-6">check_circle</span>
          <h1 className="font-heading text-3xl font-extrabold text-neutral-900 mb-4">Paiement Réussi !</h1>
          <p className="text-neutral-600 mb-8 max-w-md">
            Vos pièces ont été créditées sur votre portefeuille. Vous allez être redirigé vers le tableau de bord...
          </p>
        </>
      )}

      {status === "failed" && (
        <>
          <span className="material-symbols-outlined text-red-500 text-6xl mb-6">cancel</span>
          <h1 className="font-heading text-3xl font-extrabold text-neutral-900 mb-4">Paiement Échoué</h1>
          <p className="text-neutral-600 mb-8 max-w-md">
            La transaction a été annulée ou a échoué. Veuillez réessayer.
          </p>
          <Link href="/pricing" className="bg-secondary text-white px-6 py-3 rounded-xl font-bold">Retour aux offres</Link>
        </>
      )}
    </div>
  );
}

export default function PricingSuccessPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-4xl text-secondary">progress_activity</span>
    </div>;
  }

  const content = (
    <main className="w-full h-full flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-center"><span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span></div>}>
        <PaymentPendingContent />
      </Suspense>
    </main>
  );

  return user ? <AppLayout>{content}</AppLayout> : <div className="min-h-screen bg-white font-body text-neutral-900 flex flex-col">{content}</div>;
}
