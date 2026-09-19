"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "announcement" | "update" | "promo" | "warning";
  link?: string;
  created_at: string;
  is_read: boolean;
}

export function useNotifications() {
  const { data, error, mutate, isLoading } = useSWR("/api/notifications", fetcher, {
    refreshInterval: 15000, // Rafraîchissement automatique toutes les 15 secondes
    revalidateOnFocus: true,
  });

  /**
   * Un `fetch` ne lève PAS sur une réponse 4xx/5xx : le `try/catch` seul ne
   * couvrait que les pannes réseau. Un refus serveur (RLS, session expirée)
   * passait donc pour un succès, et seul le `mutate()` suivant — qui
   * réaffichait les mêmes non-lus — trahissait le problème.
   */
  const postRead = async (payload: Record<string, unknown>, label: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error(`${label} : le serveur a refusé la requête`, data?.error || res.status);
        return false;
      }

      await mutate();
      return true;
    } catch (e) {
      console.error(`${label} :`, e);
      return false;
    }
  };

  const markAsRead = (notificationId: string) =>
    postRead({ notification_id: notificationId }, "Marquage comme lu");

  const markAllAsRead = () =>
    postRead({ mark_all_read: true }, "Marquage de toutes les notifications comme lues");

  return {
    notifications: (data?.notifications || []) as NotificationItem[],
    unreadCount: (data?.unreadCount || 0) as number,
    isLoading,
    isError: !!error,
    mutate,
    markAsRead,
    markAllAsRead,
  };
}
