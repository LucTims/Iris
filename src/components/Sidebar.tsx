"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, displayName, isAdmin } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem("iris_sidebar_collapsed");
    if (savedState !== null) {
      setCollapsed(savedState === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("iris_sidebar_collapsed", String(nextState));
  };

  const navItems = [
    { id: "dashboard", label: "Tableau de bord", icon: "dashboard", href: "/dashboard" },
    { id: "projets", label: "Mes Livres & Projets", icon: "menu_book", href: "/projects" },
    { id: "couverture", label: "Studio de Couverture", icon: "palette", href: "/cover-studio" },
    { id: "export", label: "Mise en page & KDP", icon: "design_services", href: "/export" },
    { id: "ventes", label: "Lecteurs & Téléchargements", icon: "group", href: "/analytics" },
    { id: "facturation", label: "Abonnement & Mots", icon: "credit_card", href: "/billing" },
    { id: "parametres", label: "Paramètres", icon: "settings", href: "/settings" },
    { id: "aide", label: "Centre d'aide & FAQ", icon: "help_center", href: "/faq" },
  ];

  if (isAdmin) {
    navItems.push({ id: "admin", label: "Espace Admin", icon: "admin_panel_settings", href: "/admin" });
  }

  if (!mounted) return null;

  return (
    <aside
      className={`hidden md:flex flex-col bg-white border-r border-neutral-200/80 transition-all duration-300 z-40 sticky top-0 h-screen shrink-0 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header (Seamless top section with Iris Typography & Enhanced Toggle Button) */}
      <div className="px-5 py-4 flex items-center justify-between h-16 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden group">
          {!collapsed ? (
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-2xl tracking-tight text-neutral-900 group-hover:text-secondary transition-colors">
                Iris
              </span>
            </div>
          ) : (
            <span className="font-heading font-extrabold text-xl text-secondary w-8 text-center">
              I
            </span>
          )}
        </Link>

        {/* Enhanced Toggle Sidebar Button */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Agrandir le menu" : "Réduire le menu"}
          className="w-8 h-8 rounded-xl bg-neutral-100/80 hover:bg-neutral-200/70 border border-neutral-200/60 text-neutral-600 hover:text-neutral-900 transition-all flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">
            {collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
          </span>
        </button>
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = 
            pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
            (item.href === "/projects" && pathname.startsWith("/redaction"));
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-neutral-100/90 text-neutral-900 font-bold shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[26px] shrink-0 transition-transform group-hover:scale-110 text-inherit`}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Links & Collapse Toggle */}
      <div className="p-3 border-t border-neutral-100 space-y-1 bg-white">
        <Link
          href="/"
          title={collapsed ? "Page d'accueil" : undefined}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[26px] text-inherit shrink-0">home</span>
          {!collapsed && <span>Page d&apos;accueil</span>}
        </Link>

        <button
          onClick={signOut}
          title={collapsed ? "Se déconnecter" : undefined}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[26px] text-inherit shrink-0">logout</span>
          {!collapsed && <span className="truncate">Se déconnecter</span>}
        </button>

        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-neutral-400 hover:text-neutral-800 rounded-xl hover:bg-neutral-50 transition-colors pt-2 border-t border-neutral-100 mt-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[26px] text-inherit shrink-0">
            {collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
          </span>
          {!collapsed && <span>Réduire le menu</span>}
        </button>
      </div>
    </aside>
  );
}
