import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide de démarrage",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
