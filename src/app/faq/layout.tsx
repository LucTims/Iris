import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foire Aux Questions (FAQ)",
  description:
    "Toutes les réponses à vos questions sur l'écriture assistée par IA, les droits d'auteur, les pièces et l'exportation avec Iris.",
  openGraph: {
    title: "FAQ | Questions fréquentes sur Iris",
    description:
      "Réponses détaillées sur le fonctionnement d'Iris, les exports Kindle/ePub/PDF et la gestion de vos droits d'auteur.",
    url: "https://www.irisboom.online/faq",
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
