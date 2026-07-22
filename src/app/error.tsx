"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-error/5 rounded-full blur-[100px] -z-10"></div>
      
      <div className="text-center p-8 max-w-lg">
        <span className="material-symbols-outlined text-[100px] text-error opacity-80 mb-6">error</span>
        <h1 className="font-heading text-4xl font-extrabold text-on-surface mb-4">Oups ! Une erreur est survenue</h1>
        <p className="text-on-surface-variant mb-8 leading-relaxed">
          Nous avons rencontré un problème inattendu. Notre équipe a été notifiée et travaille déjà dessus.
        </p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => reset()}
            className="bg-surface-container text-on-surface font-semibold px-6 py-3 rounded-xl hover:bg-surface-container-high transition-all"
          >
            Réessayer
          </button>
          <Link href="/">
            <button className="bg-secondary text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:bg-secondary/90 transition-all">
              Retour à l&apos;accueil
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
