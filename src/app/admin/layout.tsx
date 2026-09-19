"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Cpu,
  Receipt,
  ArrowLeft,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  ExternalLink,
  Bell,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const adminNavItems: NavItem[] = [
  { id: "overview", label: "Vue d'ensemble", shortLabel: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "users", label: "Utilisateurs", icon: Users, href: "/admin/users" },
  { id: "projects", label: "Projets & Livres", shortLabel: "Projets", icon: BookOpen, href: "/admin/projects" },
  { id: "notifications", label: "Notifications", shortLabel: "Notifs", icon: Bell, href: "/admin/notifications" },
  { id: "finances", label: "Finances & Paiements", shortLabel: "Finances", icon: Receipt, href: "/admin/finances" },
  { id: "ai", label: "Surveillance IA", shortLabel: "IA", icon: Cpu, href: "/admin/ai" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { displayName, displayEmail, avatarUrl } = useUser();

  const isNavActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const adminName = displayName && displayName !== "Auteur" ? displayName : "Admin";
  const adminEmail = displayEmail || "admin@irisboom.online";
  const avatar = avatarUrl || null;

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-neutral-100 antialiased selection:bg-primary selection:text-white">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 ease-in-out lg:sticky ${
          mobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-200 dark:border-neutral-800">
          <Link href="/admin" className="flex items-center gap-3 overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            {(!collapsed || mobileMenuOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-heading text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  Iris <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Admin</span>
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate uppercase tracking-widest font-semibold">
                  Control Center
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:bg-neutral-800 lg:hidden"
            aria-label="Fermer la barre latérale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2">
            {(!collapsed || mobileMenuOpen) && (
              <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Modules
              </span>
            )}
          </div>

          <nav className="space-y-1" aria-label="Navigation Administrateur">
            {adminNavItems.map((item) => {
              const active = isNavActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative group ${
                    active
                      ? "bg-primary text-white shadow-md shadow-primary/20 font-semibold"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:bg-neutral-800"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? "text-white" : "text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:text-neutral-100"}`} />
                  {(!collapsed || mobileMenuOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {collapsed && !mobileMenuOpen && active && (
                    <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-white dark:bg-neutral-900" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:bg-neutral-800 transition-colors text-sm font-medium"
            title={collapsed ? "Retour à l'App" : undefined}
          >
            <ArrowLeft className="w-5 h-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
            {(!collapsed || mobileMenuOpen) && <span>Retour à l&apos;App</span>}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-full py-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:bg-neutral-800 transition-colors text-xs font-medium gap-2"
            aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Réduire le volet</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 sticky top-0 z-30 bg-white dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:bg-neutral-800 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="font-heading font-bold text-neutral-900 dark:text-neutral-100 text-base sm:text-lg hidden sm:inline">
                Iris Operational Cockpit
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Données Réelles (Live)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Accéder à l&apos;application auteur
            </Link>

            <div className="h-5 w-px bg-neutral-200 hidden sm:block" />

            <div className="flex items-center gap-3 pl-1">
              {avatar ? (
                <img src={avatar} alt={adminName} className="w-8 h-8 rounded-full ring-2 ring-primary/30 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full ring-2 ring-primary/30 bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {adminName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-none">{adminName}</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20">
                    <Shield className="w-2.5 h-2.5" />
                    Super Admin
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight truncate max-w-[150px]">{adminEmail}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
