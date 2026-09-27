"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export default function HeroActions() {
  const { user } = useUser();
  
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 mb-5 w-full sm:w-auto">
      <Link href={user ? "/dashboard" : "/register"} className="w-full sm:w-auto">
        <button className="w-full sm:w-auto bg-[#C84B31] hover:bg-[#B83E26] text-white px-7 py-3.5 rounded-full text-sm sm:text-base font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer">
          <span>{user ? "Accéder au tableau de bord" : "Commencer gratuitement"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>
      <Link href="/how-it-works" className="w-full sm:w-auto">
        <button className="w-full sm:w-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 px-6 py-3.5 rounded-full text-sm sm:text-base font-semibold transition-all shadow-2xs flex items-center justify-center cursor-pointer">
          Voir comment ça marche
        </button>
      </Link>
    </div>
  );
}
