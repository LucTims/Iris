"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Cpu,
  Coins,
  Receipt,
  Terminal,
  ShieldCheck,
  Settings,
  HeartPulse,
  ArrowLeft,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  ExternalLink,
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
  { id: "finances", label: "Finances & SEBPay", shortLabel: "Finances", icon: Receipt, href: "/admin/finances" },
  { id: "ai", label: "Surveillance IA", shortLabel: "IA", icon: Cpu, href: "/admin/ai" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { displayName, displayEmail, avatarUrl } = useUser();

  const isNavActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    if (href === "/admin/subscriptions" && pathname.startsWith("/admin/finances")) {
      return true;
    }
    return pathname.startsWith(href);
  };

  const adminName = displayName && displayName !== "Auteur" ? displayName : "Amadou Diallo";
  const adminEmail = displayEmail || "amadou.diallo@iris-editions.com";
  const avatar = avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  return (
    <div className="min-h-screen flex bg-neutral-50 text-neutral-900 antialiased selection:bg-orange-500 selection:text-white">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out lg:sticky ${
          mobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-200">
          <Link href="/admin" className="flex items-center gap-3 overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-400 flex items-center justify-center text-neutral-900 shadow-lg shadow-orange-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            {(!collapsed || mobileMenuOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-heading text-lg font-black tracking-tight text-neutral-900 flex items-center gap-1.5">
                  Iris <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">Admin</span>
                </span>
                <span className="text-[10px] text-neutral-500 truncate uppercase tracking-widest font-semibold">
                  Control Center
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 lg:hidden"
            aria-label="Fermer la barre latérale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Links (10 Priority Modules) */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-neutral-800">
          <div className="px-3 pb-2">
            {(!collapsed || mobileMenuOpen) && (
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Modules Priorité 1
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
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 font-semibold"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? "text-white" : "text-neutral-500 group-hover:text-neutral-900"}`} />
                  {(!collapsed || mobileMenuOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {collapsed && !mobileMenuOpen && active && (
                    <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / Quick Return Link & Collapse Button */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50/80 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-sm font-medium"
            title={collapsed ? "Retour à l'App" : undefined}
          >
            <ArrowLeft className="w-5 h-5 shrink-0 text-neutral-500" />
            {(!collapsed || mobileMenuOpen) && <span>Retour à l'App</span>}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-full py-2 rounded-xl text-neutral-500 hover:text-neutral-200 hover:bg-neutral-100 transition-colors text-xs font-medium gap-2"
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="font-heading font-bold text-neutral-900 text-base sm:text-lg hidden sm:inline">
                Iris Operational Cockpit
              </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Données Réelles (Live)
              </span>
            </div>
          </div>

          {/* Top Bar Actions & Super Admin Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-700/60 hover:border-neutral-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Accéder à l'application auteur
            </Link>

            <div className="h-5 w-px bg-neutral-800 hidden sm:block" />

            <div className="flex items-center gap-3 pl-1">
              <img
                src={avatar}
                alt={adminName}
                className="w-8 h-8 rounded-full ring-2 ring-orange-500/30 object-cover"
              />
              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-900 leading-none">{adminName}</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    <Shield className="w-2.5 h-2.5" />
                    Super Admin
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 leading-tight truncate max-w-[150px]">{adminEmail}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
