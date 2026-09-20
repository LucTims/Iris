import Link from "next/link";
import { IrisMark } from "@/components/IrisLogo";
import { Book, Zap, Shield, Key } from "lucide-react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const sidebarLinks = [
    { href: "/docs", label: "Introduction", icon: Book },
    { href: "/docs/automations", label: "Automatisation & MCP", icon: Zap },
    { href: "/docs/api-keys", label: "Clés d'API", icon: Key },
    { href: "/privacy", label: "Sécurité & Confidentialité", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 font-body text-neutral-900 dark:text-neutral-100 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-72 lg:w-80 shrink-0 border-r border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="p-6 md:p-8 flex-1">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 group mb-10 w-fit">
            <IrisMark size={32} className="text-brand shrink-0 group-hover:scale-105 rotate-6 transition-transform" />
            <span className="font-heading font-extrabold text-2xl tracking-tight text-neutral-900 dark:text-neutral-100">ris</span>
            <span className="ml-2 text-[10px] uppercase tracking-widest font-bold text-neutral-400 bg-neutral-200/50 dark:bg-neutral-800 px-2 py-0.5 rounded-full">Docs</span>
          </Link>

          {/* Navigation */}
          <nav className="space-y-1">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 mt-8 px-3">
              Développeurs & Intégrations
            </div>
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Footer Sidebar */}
        <div className="p-6 md:p-8 border-t border-neutral-200/80 dark:border-neutral-800">
          <Link href="/dashboard" className="text-sm font-semibold text-[#C84B31] hover:text-[#B83E26] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Retour à l'application
          </Link>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 min-w-0 bg-white dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 py-12 md:px-12 md:py-20 lg:py-24">
          {children}
        </div>
      </main>
    </div>
  );
}
