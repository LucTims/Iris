"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading } = useUser();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const adminNav = [
    { id: "overview", label: "Vue globale", icon: "dashboard", href: "/admin" },
    { id: "users", label: "Utilisateurs", icon: "group", href: "/admin/users" },
    { id: "finances", label: "Finances (SebPay)", icon: "account_balance", href: "/admin/finances" },
  ];

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-surface-container-low hidden lg:flex flex-col border-r border-outline-variant h-screen sticky top-0">
        <div className="p-6 border-b border-outline-variant">
          <Link href="/" className="font-heading text-2xl font-extrabold text-secondary">Iris</Link>
          <span className="block text-xs font-mono font-bold text-error mt-1 uppercase tracking-widest">Administration</span>
        </div>
        
        <nav className="flex-1 space-y-1 p-4">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.id} 
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-bold transition-all ${
                  isActive 
                    ? "bg-secondary-container text-on-secondary-container" 
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
          
          <div className="pt-4 mt-4 border-t border-outline-variant">
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm">Retour App</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Admin Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
