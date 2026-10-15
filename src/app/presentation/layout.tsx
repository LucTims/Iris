import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Découvrir Iris | Votre compagnon d'écriture IA",
  description:
    "Découvrez comment Iris révolutionne la création de livres numériques : co-rédaction assistée par IA, studio de couverture et export prêt à publier.",
  openGraph: {
    title: "Découvrez Iris | Plateforme de co-création littéraire",
    description:
      "Passez de l'idée au manuscrit publié en quelques clics avec l'assistance d'Iris.",
    url: "https://www.irisboom.online/presentation",
  },
};

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
