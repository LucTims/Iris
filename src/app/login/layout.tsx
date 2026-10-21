import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace auteur Iris pour retrouver vos manuscrits et continuer la rédaction.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
