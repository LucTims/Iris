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

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId }),
      });
      mutate();
    } catch (e) {
      console.error("Erreur lors du marquage comme lu:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
      mutate();
    } catch (e) {
      console.error("Erreur lors du marquage de tout comme lu:", e);
    }
  };

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
