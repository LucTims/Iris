"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useNotifications, NotificationItem } from "@/hooks/useNotifications";
import { Coins, Plus, Bell } from "lucide-react";

export default function TopHeader() {
  const { displayName, displayEmail, signOut, isAdmin, walletBalance } = useUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifMenuOpen(false);
      }
    }
    if (userMenuOpen || notifMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen, notifMenuOpen]);

  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return { icon: "campaign", color: "text-purple-600", bg: "bg-purple-50" };
      case "update":
        return { icon: "system_update", color: "text-blue-600", bg: "bg-blue-50" };
      case "promo":
        return { icon: "local_offer", color: "text-emerald-600", bg: "bg-emerald-50" };
      case "warning":
        return { icon: "warning", color: "text-amber-600", bg: "bg-amber-50" };
      default:
        return { icon: "notifications", color: "text-secondary", bg: "bg-orange-50" };
    }
  };

  return (
    <header className="bg-white dark:bg-neutral-900/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-neutral-200/70 dark:border-neutral-800 sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4 shrink-0">
      
      {/* Mobile Header Title */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/dashboard" className="font-heading font-extrabold text-2xl text-neutral-900 dark:text-neutral-100 tracking-tight">
          Iris
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2.5 relative">
        <Link 
          href="/projects/new" 
          className="flex items-center gap-1.5 bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nouveau Livre</span>
        </Link>
        
        <Link 
          href="/pricing" 
          className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100/80 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:border-neutral-300 dark:hover:border-neutral-600 group" 
          title="Gérer mes crédits d'écriture"
        >
          <Coins className="w-3.5 h-3.5 text-secondary transition-transform group-hover:scale-110" />
          <span className="tabular-nums font-bold text-neutral-900 dark:text-neutral-100">
            {walletBalance !== null ? Number(walletBalance).toLocaleString("fr-FR") : "..."}
          </span>
          <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">crédits</span>
        </Link>

        {/* Notification Bell Dropdown Button */}
        <div className="relative shrink-0" ref={notifRef}>
          <button 
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="w-9 h-9 rounded-xl border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:bg-neutral-800/50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100 transition-colors shrink-0 relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifMenuOpen && (
            <div className="fixed top-[72px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 pb-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-extrabold text-sm text-neutral-900 dark:text-neutral-100">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                      {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllAsRead()}
                    className="text-[11px] font-bold text-secondary hover:text-orange-600 transition-colors"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <span className="material-symbols-outlined text-3xl text-neutral-300 mb-1">notifications_off</span>
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Aucune notification pour le moment</p>
                  </div>
                ) : (
                  notifications.map((notif: NotificationItem) => {
                    const iconConfig = getNotifIcon(notif.type);
                    return (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read) markAsRead(notif.id);
                        }}
                        className={`p-3.5 hover:bg-neutral-50 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                          !notif.is_read ? "bg-orange-50/30 dark:bg-orange-950/20" : ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl ${iconConfig.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <span className={`material-symbols-outlined text-sm ${iconConfig.color}`}>
                            {iconConfig.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h4 className={`text-xs font-bold truncate ${!notif.is_read ? "text-neutral-900 dark:text-neutral-100 font-extrabold" : "text-neutral-700 dark:text-neutral-400"}`}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {new Date(notif.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          {notif.link && (
                            <Link 
                              href={notif.link}
                              onClick={() => setNotifMenuOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline mt-1.5"
                            >
                              <span>Voir plus</span>
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </Link>
                          )}
                        </div>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-2" title="Non lu" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown Button */}
        <div className="relative shrink-0" ref={menuRef}>
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8.5 h-8.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 border border-neutral-200/90 dark:border-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-200 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            title="Menu Profil"
          >
            {userInitials}
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="fixed top-[72px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200/80 dark:border-neutral-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <p className="font-heading font-bold text-sm text-neutral-900 dark:text-neutral-100">{displayName}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{displayEmail}</p>
                <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
                  Plan Gratuit
                </span>
              </div>

              <div className="py-1">
                <Link 
                  href="/profile" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">person</span>
                  <span>Mon profil</span>
                </Link>
                <Link 
                  href="/dashboard" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                  <span>Tableau de bord</span>
                </Link>
                <Link 
                  href="/projects" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">menu_book</span>
                  <span>Mes Livres & Projets</span>
                </Link>
                <Link 
                  href="/settings" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                  <span>Paramètres du compte</span>
                </Link>
                
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-500">admin_panel_settings</span>
                    <span>Espace Administration</span>
                  </Link>
                )}
              </div>

              <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                <button 
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-red-500">logout</span>
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
