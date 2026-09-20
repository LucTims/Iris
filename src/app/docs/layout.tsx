import Link from "next/link";
import { IrisMark } from "@/components/IrisLogo";
import { Book, Zap, Shield, Key, Search, ChevronRight } from "lucide-react";

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
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#FDF3F1] selection:text-[#C84B31] flex flex-col">
      {/* Navbar supérieure type Chariow */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-neutral-200 bg-white z-50 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <IrisMark size={26} className="text-[#C84B31] shrink-0 rotate-6 transition-transform group-hover:scale-105" />
            <span className="font-heading font-extrabold text-xl tracking-tight text-neutral-900">ris</span>
            <span className="text-sm font-semibold text-neutral-500 ml-1">Docs</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-xl leading-5 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#C84B31]/20 focus:border-[#C84B31] sm:text-sm transition-all"
              placeholder="Search documentation..."
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-neutral-400 text-xs font-medium bg-neutral-100 px-1.5 py-0.5 rounded-md border border-neutral-200">Ctrl K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/faq" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 hidden sm:block">Support</Link>
          <Link href="/dashboard" className="bg-[#facc15] hover:bg-[#eab308] text-neutral-900 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap">
            Tableau de bord <ChevronRight className="inline w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main container avec Sidebar */}
      <div className="flex-1 max-w-[90rem] mx-auto w-full flex pt-16">
        {/* Sidebar Left */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-neutral-200 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          <nav className="p-4 space-y-8">
            {sidebarLinks.map((group, i) => (
              <div key={i}>
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3 px-3">
                  {group.group}
                </h4>
                <div className="space-y-1">
                  {group.items.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
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
          <div className="max-w-3xl mx-auto px-6 py-12 md:px-12 md:py-16">
            {children}
          </div>
        </main>
        
        {/* Fake Right Sidebar pour l'esthétique Chariow (TOC) */}
        <aside className="w-64 shrink-0 hidden lg:block h-[calc(100vh-4rem)] sticky top-16 pt-12 pr-8 overflow-y-auto">
          <h5 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-px bg-neutral-300"></span>
            Sur cette page
          </h5>
          <ul className="space-y-3 text-sm text-neutral-500 border-l border-neutral-200 pl-4">
            <li className="text-[#C84B31] font-semibold">Introduction</li>
            <li className="hover:text-neutral-900 cursor-pointer">Démarrage rapide</li>
            <li className="hover:text-neutral-900 cursor-pointer">Authentification</li>
            <li className="hover:text-neutral-900 cursor-pointer">Intégration MCP</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
