import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from '@next/third-parties/google';
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.irisboom.online"),
  title: "Iris | La 1ère plateforme de co-création littéraire assistée par IA",
  description: "Iris accompagne les experts et créateurs dans la rédaction, le design et la publication de leurs livres numériques.",
  verification: {
    // google: "AJOUTEZ_VOTRE_CODE_DE_VERIFICATION_ICI_SI_NECESSAIRE",
  },
};

// Viewport mobile explicite. Sans lui (le <head> manuel ci-dessous peut
// empêcher l'injection auto de Next), les navigateurs mobiles rendent la page
// à ~980px de large puis dézooment : tout paraît géant et coupé par l'écran.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Outfit:wght@100..900&family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-neutral-900 font-body antialiased selection:bg-neutral-200">
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-5WW5K8J3D5"} />
      </body>
    </html>
  );
}
