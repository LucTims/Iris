import Link from "next/link";
import { IrisMark } from "@/components/IrisLogo";
import { Book, Zap, Shield, Key, Search, ChevronRight, ExternalLink } from "lucide-react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const sidebarLinks = [
    { 
      group: "Guides",
      items: [
        { href: "/docs", label: "Introduction", icon: Book },
        { href: "/docs/automations", label: "Intégration MCP", icon: Zap },
        { href: "/docs/api-keys", label: "Authentification", icon: Key },
      ]
    },
    {
      group: "Ressources",
      items: [
        { href: "/privacy", label: "Sécurité & Confidentialité", icon: Shield },
        { href: "/faq", label: "Centre d'aide", icon: Book },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col selection:bg-[#C84B31]/20 selection:text-[#C84B31]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <IrisMark size={28} className="text-[#C84B31] shrink-0 rotate-6 transition-transform group-hover:scale-105" />
            <span className="font-heading font-extrabold text-xl tracking-tight text-neutral-900 dark:text-neutral-100">
              Iris
            </span>
            <span className="text-xs font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full ml-1">
              Docs
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400 group-focus-within:text-[#C84B31] transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl leading-5 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-[#C84B31]/20 focus:border-[#C84B31] sm:text-sm transition-all"
              placeholder="Rechercher dans la documentation..."
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">Ctrl K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/faq" className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors hidden sm:block">
            Support
          </Link>
          <Link href="/dashboard" className="bg-[#C84B31] hover:bg-[#B83E26] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm flex items-center gap-1.5">
            Ouvrir Iris <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-[90rem] mx-auto w-full flex pt-16">
        {/* Sidebar Left */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-neutral-200/80 dark:border-neutral-800 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto bg-neutral-50/50 dark:bg-neutral-900/20">
          <nav className="p-6 space-y-8">
            {sidebarLinks.map((group, i) => (
              <div key={i}>
                <h4 className="font-heading text-xs font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4 px-1">
                  {group.group}
                </h4>
                <div className="space-y-1.5">
                  {group.items.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-[#C84B31] hover:bg-[#C84B31]/10 dark:hover:bg-[#C84B31]/20 transition-all group"
                      >
                        <Icon className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 py-12 md:px-12 md:py-16">
            {children}
          </div>
        </main>
        
        {/* Right TOC */}
        <aside className="w-64 shrink-0 hidden xl:block h-[calc(100vh-4rem)] sticky top-16 pt-12 pr-8 overflow-y-auto">
          <h5 className="font-heading text-xs font-extrabold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-4 flex items-center gap-2">
            Sur cette page
          </h5>
          <ul className="space-y-3 text-sm text-neutral-500 dark:text-neutral-400 border-l-2 border-neutral-100 dark:border-neutral-800 pl-4">
            <li className="text-[#C84B31] font-semibold -ml-[18px] border-l-2 border-[#C84B31] pl-4">Introduction</li>
            <li className="hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer transition-colors">Démarrage rapide</li>
            <li className="hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer transition-colors">Authentification</li>
            <li className="hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer transition-colors">Intégration MCP</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
