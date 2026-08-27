"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useNotifications, NotificationItem } from "@/hooks/useNotifications";

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
    <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4 shrink-0">
      
      {/* Mobile Header Title */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/dashboard" className="font-heading font-extrabold text-2xl text-secondary">
          Iris
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3 relative">
        <Link href="/projects/new" className="flex items-center gap-2 bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs">
          <span className="material-symbols-outlined text-base">add</span>
          <span className="hidden sm:inline">Nouveau Livre</span>
        </Link>
        
        <Link href="/pricing" className="flex items-center gap-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
          <span className="text-sm">🪙</span>
          <span>{walletBalance}</span>
        </Link>

        {/* Notification Bell Dropdown Button */}
        <div className="relative shrink-0" ref={notifRef}>
          <button 
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0 relative cursor-pointer"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-lg">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 pb-3 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-extrabold text-sm text-neutral-900">Notifications</span>
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

              <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <span className="material-symbols-outlined text-3xl text-neutral-300 mb-1">notifications_off</span>
                    <p className="text-xs font-semibold text-neutral-500">Aucune notification pour le moment</p>
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
                        className={`p-3.5 hover:bg-neutral-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                          !notif.is_read ? "bg-orange-50/30" : ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl ${iconConfig.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <span className={`material-symbols-outlined text-sm ${iconConfig.color}`}>
                            {iconConfig.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h4 className={`text-xs font-bold truncate ${!notif.is_read ? "text-neutral-900 font-extrabold" : "text-neutral-700"}`}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {new Date(notif.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
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
            className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm shadow-2xs hover:ring-2 hover:ring-orange-300 transition-all cursor-pointer"
            title="Menu Profil"
          >
            {userInitials}
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-neutral-100">
                <p className="font-heading font-bold text-sm text-neutral-900">{displayName}</p>
                <p className="text-xs text-neutral-500 truncate">{displayEmail}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-bold text-secondary">
                  Plan Gratuit
                </span>
              </div>

              <div className="py-1">
                <Link 
                  href="/profile" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">person</span>
                  <span>Mon profil</span>
                </Link>
                <Link 
                  href="/dashboard" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                  <span>Tableau de bord</span>
                </Link>
                <Link 
                  href="/projects" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">menu_book</span>
                  <span>Mes Livres & Projets</span>
                </Link>
                <Link 
                  href="/settings" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                  <span>Paramètres du compte</span>
                </Link>
                
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-emerald-600">admin_panel_settings</span>
                    <span>Espace Administration</span>
                  </Link>
                )}
              </div>

              <div className="pt-1 border-t border-neutral-100">
                <button 
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
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
