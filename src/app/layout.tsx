import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iris | La 1ère plateforme de co-création littéraire assistée par IA",
  description: "Iris accompagne les experts et créateurs dans la rédaction, le design et la publication de leurs livres numériques.",
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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Outfit:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-neutral-900 font-body antialiased selection:bg-neutral-200">
        {children}
      </body>
    </html>
  );
}
