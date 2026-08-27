"use client";

import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { 
  Settings,
  Bell,
  Moon,
  Sun,
  Shield,
  FileText,
  Monitor
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [appNotifications, setAppNotifications] = useState(true);

  // Avoid hydration mismatch & Load saved preferences
  useEffect(() => {
    setMounted(true);
    const savedAppNotif = localStorage.getItem("iris_app_notifications");
    const savedEmailNotif = localStorage.getItem("iris_email_notifications");
    if (savedAppNotif !== null) setAppNotifications(savedAppNotif === "true");
    if (savedEmailNotif !== null) setEmailNotifications(savedEmailNotif === "true");
  }, []);

  const handleToggleAppNotif = (val: boolean) => {
    setAppNotifications(val);
    localStorage.setItem("iris_app_notifications", String(val));
  };

  const handleToggleEmailNotif = (val: boolean) => {
    setEmailNotifications(val);
    localStorage.setItem("iris_email_notifications", String(val));
  };

  return (
    <AppLayout>
      <header className="bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-20 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-900 px-3 py-2 rounded-xl transition-all">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Tableau de bord</span>
          </Link>
          <h1 className="font-heading font-extrabold text-xl text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-secondary" strokeWidth={2.5} />
            <span>Paramètres de l'application</span>
          </h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">
        
        {/* Apparence Section */}
        <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-secondary">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-extrabold text-neutral-900 dark:text-neutral-100">Apparence</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Personnalisez le thème de l'interface.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${mounted && theme === 'light' ? 'border-secondary bg-orange-50 dark:bg-orange-950/20' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 bg-transparent'}`}
              >
                <Sun className={`w-8 h-8 ${mounted && theme === 'light' ? 'text-secondary' : 'text-neutral-400'}`} />
                <span className={`text-sm font-bold ${mounted && theme === 'light' ? 'text-secondary' : 'text-neutral-600 dark:text-neutral-400'}`}>Clair</span>
              </button>
              
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${mounted && theme === 'dark' ? 'border-secondary bg-orange-50 dark:bg-orange-950/20' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 bg-transparent'}`}
              >
                <Moon className={`w-8 h-8 ${mounted && theme === 'dark' ? 'text-secondary' : 'text-neutral-400'}`} />
                <span className={`text-sm font-bold ${mounted && theme === 'dark' ? 'text-secondary' : 'text-neutral-600 dark:text-neutral-400'}`}>Sombre</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${mounted && theme === 'system' ? 'border-secondary bg-orange-50 dark:bg-orange-950/20' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 bg-transparent'}`}
              >
                <Monitor className={`w-8 h-8 ${mounted && theme === 'system' ? 'text-secondary' : 'text-neutral-400'}`} />
                <span className={`text-sm font-bold ${mounted && theme === 'system' ? 'text-secondary' : 'text-neutral-600 dark:text-neutral-400'}`}>Système</span>
              </button>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-extrabold text-neutral-900 dark:text-neutral-100">Notifications</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Gérez comment nous vous contactons.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Notifications par e-mail</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Recevoir des actualités, promotions et alertes sur votre compte.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={emailNotifications} onChange={(e) => handleToggleEmailNotif(e.target.checked)} />
                  <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Notifications dans l'application</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Être alerté lorsque des annonces ou générations d'IA sont terminées.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={appNotifications} onChange={(e) => handleToggleAppNotif(e.target.checked)} />
                  <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Legal & Privacy Section */}
        <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-extrabold text-neutral-900 dark:text-neutral-100">Légal & Confidentialité</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Consultez nos politiques et conditions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/privacy" className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all group">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 group-hover:text-secondary group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-colors">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Politique de confidentialité</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Comment nous protégeons vos données</p>
                </div>
              </Link>
              
              <Link href="/terms" className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all group">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 group-hover:text-secondary group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Conditions d'utilisation</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Règles d'utilisation du service</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

      </main>
    </AppLayout>
  );
}
