"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import {
  LayoutDashboard,
  Library,
  Palette,
  PenTool,
  Users,
  CreditCard,
  Settings,
  HelpCircle,
  ShieldAlert,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Menu,
  User,
  BookOpen,
  Bot,
  Book,
} from "lucide-react";
import { IrisMark } from "@/components/IrisLogo";

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, displayName, isAdmin } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("iris_sidebar_collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem("iris_sidebar_collapsed", String(newVal));
  };

  const navItems = [
    { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/dashboard" },
    { id: "projets", label: "Mes Livres & Projets", icon: <Library strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/projects" },
    { id: "couverture", label: "Studio de Couverture", icon: <Palette strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/cover-studio" },
    { id: "ventes", label: "Analytiques", icon: <Users strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/analytics" },
    { id: "facturation", label: "Portefeuille & Pièces", icon: <CreditCard strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/billing" },
    { id: "automations", label: "Automatisations (MCP)", icon: <Bot strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/automations" },
    { id: "guide-livre", label: "Livre offert", badge: "Offert", icon: <BookOpen strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/guide" },
  ];

  const bottomNavItems = [
    { id: "profil", label: "Mon profil", icon: <User strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/profile" },
    { id: "docs", label: "Documentation", icon: <Book strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/docs" },
    { id: "aide", label: "Centre d'aide & FAQ", icon: <HelpCircle strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/faq" },
  ];

  if (isAdmin) {
    bottomNavItems.push({ id: "admin", label: "Espace Admin", icon: <ShieldAlert strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />, href: "/admin" });
  }

  if (!mounted) return null;

  return (
    <>
      <aside
      className={`hidden md:flex flex-col bg-white dark:bg-neutral-950 border-r border-neutral-200/80 dark:border-neutral-800 transition-all duration-300 z-40 sticky top-0 h-screen shrink-0 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header (Seamless top section with Iris Typography & Enhanced Toggle Button) */}
      <div className="px-5 py-4 flex items-center justify-between h-16 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-1 overflow-hidden group">
          <IrisMark size={30} className="text-brand shrink-0 rotate-6 transition-transform" />
          {!collapsed && (
            <span className="font-heading font-extrabold text-2xl tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-secondary transition-colors">ris</span>
          )}
        </Link>

        {/* Enhanced Toggle Sidebar Button */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Agrandir le menu" : "Réduire le menu"}
          className="w-8 h-8 rounded-xl bg-neutral-100/80 dark:bg-neutral-900/80 hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100 transition-all flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
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
                  ? "bg-[#C84B31]/10 text-[#C84B31] font-bold shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-[#C84B31]/5 hover:text-[#C84B31] dark:hover:text-[#C84B31]"
              }`}
            >
              <div className="shrink-0 transition-transform group-hover:scale-110 text-inherit flex items-center justify-center">
                {item.icon}
              </div>
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {(item as any).badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C84B31]/15 text-[#C84B31] shrink-0 ml-1">
                      {(item as any).badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Links & Collapse Toggle */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1 bg-white dark:bg-neutral-950 mt-auto">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-[#C84B31]/10 text-[#C84B31] font-bold shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-[#C84B31]/5 hover:text-[#C84B31] dark:hover:text-[#C84B31]"
              }`}
            >
              <div className="shrink-0 transition-transform group-hover:scale-110 text-inherit flex items-center justify-center">
                {item.icon}
              </div>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800">
        <button
          onClick={signOut}
          title={collapsed ? "Se déconnecter" : undefined}
          className="w-full flex items-center gap-1 px-3.5 py-2.5 text-sm font-bold text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />
          {!collapsed && <span className="truncate">Se déconnecter</span>}
        </button>

        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-neutral-400 hover:text-neutral-800 dark:text-neutral-200 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-50 dark:bg-neutral-800/50 dark:hover:bg-neutral-900 transition-colors pt-2 border-t border-neutral-100 dark:border-neutral-800 mt-1 cursor-pointer"
        >
          {collapsed ? (
            <PanelLeftOpen strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />
          ) : (
            <PanelLeftClose strokeWidth={1.5} className="w-[22px] h-[22px] shrink-0" />
          )}
          {!collapsed && <span>Réduire le menu</span>}
        </button>
      </div>
      </div>
    </aside>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 z-50 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${pathname === "/dashboard" ? "text-secondary font-bold" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100"}`}>
          <LayoutDashboard strokeWidth={1.5} className="w-5 h-5" />
          <span className="text-[10px]">Accueil</span>
        </Link>
        <Link href="/projects" className={`flex flex-col items-center gap-1 ${pathname.startsWith("/projects") || pathname.startsWith("/redaction") ? "text-secondary font-bold" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100"}`}>
          <Library strokeWidth={1.5} className="w-5 h-5" />
          <span className="text-[10px]">Mes Livres</span>
        </Link>
        <Link href="/cover-studio" className={`flex flex-col items-center gap-1 ${pathname.startsWith("/cover-studio") ? "text-secondary font-bold" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100"}`}>
          <Palette strokeWidth={1.5} className="w-5 h-5" />
          <span className="text-[10px]">Couverture</span>
        </Link>
        <button onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)} className={`flex flex-col items-center gap-1 cursor-pointer ${isMobileDrawerOpen ? "text-secondary font-bold" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100"}`}>
          <Menu strokeWidth={1.5} className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </div>

      {/* ================= MOBILE SLIDE-OVER DRAWER MENU ================= */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="bg-white dark:bg-neutral-900 rounded-t-3xl p-6 space-y-6 max-h-[85vh] overflow-y-auto border-t border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <Link href="/dashboard" onClick={() => setIsMobileDrawerOpen(false)} className="flex items-center gap-2">
                <IrisMark size={28} className="text-brand shrink-0" />
                <span className="font-heading font-extrabold text-xl text-neutral-900">Navigation Iris</span>
              </Link>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[...navItems, ...bottomNavItems].map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all ${
                    pathname === item.href
                      ? "bg-[#C84B31]/10 border-[#C84B31]/20 text-[#C84B31] font-bold"
                      : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200/80 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="flex items-center justify-center w-6 h-6">
                    {item.icon}
                  </div>
                  <span className="text-xs truncate">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Compte {displayName ? `: ${displayName}` : ""}</span>
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  signOut();
                }}
                className="text-xs font-bold text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-4 py-2 rounded-xl transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
