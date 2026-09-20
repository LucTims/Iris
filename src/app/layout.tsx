import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.irisboom.online"),
  title: "Iris | La 1ère plateforme de co-création littéraire assistée par IA",
  description: "Iris accompagne les experts et créateurs dans la rédaction, le design et la publication de leurs livres numériques.",
  applicationName: "Iris",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Iris", statusBarStyle: "default" },
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
  // Teinte la barre d'adresse mobile avec le fond de la marque. Une seule
  // valeur : l'application est désormais en thème clair uniquement, et une
  // variante sombre assombrirait le navigateur autour d'une page claire.
  themeColor: "#F8F8F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/*
          POLICE D'ICÔNES — AXES FIGÉS.

          Cette URL demandait jusqu'ici toute la matrice de variations de
          Material Symbols :

              opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200

          Chaque plage a..b fait livrer une police VARIABLE contenant tous
          les états intermédiaires. Le fichier servi pesait **5 248 Ko**, sans
          découpage par plage de caractères — donc téléchargé en entier par
          chaque visiteur. C'était, et de très loin, le plus gros poste de
          poids du site : à lui seul, plus de six fois le reste de la page.

          L'application n'utilise qu'une seule graisse, aucun remplissage
          variable et aucun ajustement de graduation. En figeant les quatre
          axes sur l'instance réellement employée, le même rendu est obtenu
          avec **372 Ko** — 4,9 Mo économisés par visiteur.

          La feuille reste bloquante à dessein : avant que la police ne soit
          prête, une icône s'affiche sous forme de son nom en toutes lettres
          (« arrow_back », « search »). Le fichier CSS pèse un kilo-octet et
          les preconnect ci-dessus couvrent déjà la latence réseau ; c'est la
          POLICE, chargée en display=swap, qui ne bloque pas le rendu.
        */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,400,0,0&display=swap"
        />
      </head>
      <body className="bg-white text-neutral-900 font-body antialiased selection:bg-neutral-200 transition-colors duration-300">
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-5WW5K8J3D5"} />
      </body>
    </html>
  );
}
