import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription gratuite",
  description: "Créez votre compte Iris et commencez à co-rédiger votre livre avec 50 pièces offertes.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
