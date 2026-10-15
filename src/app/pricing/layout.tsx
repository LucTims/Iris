import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs & Pièces",
  description:
    "Découvrez nos offres simples et transparentes. Écrivez votre livre sans abonnement récurrent grâce à notre système de pièces prépayées.",
  openGraph: {
    title: "Tarifs d'Iris | Co-création littéraire assistée par IA",
    description:
      "Tarification claire sans abonnement obligatoire. Commencez avec 50 pièces offertes.",
    url: "https://www.irisboom.online/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
