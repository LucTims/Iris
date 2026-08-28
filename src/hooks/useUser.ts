"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export function useUser() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ 
    full_name?: string; 
    avatar_url?: string; 
    role?: string;
    bio?: string;
    website_url?: string;
    twitter_url?: string;
    amazon_url?: string;
    has_seen_welcome_modal?: boolean;
  } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (profileData) {
          const meta = user.user_metadata || {};
          setProfile({
            ...profileData,
            bio: meta.bio || profileData.bio,
            website_url: meta.website_url || profileData.website_url,
            twitter_url: meta.twitter_url || profileData.twitter_url,
            amazon_url: meta.amazon_url || profileData.amazon_url
          });
        }

        // Fetch wallet
        const { data: walletData } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        if (walletData) {
          setWalletBalance(walletData.balance);
        }
      }
      setLoading(false);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setWalletBalance(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Auteur";
  const displayEmail = user?.email || "";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || "";
  
  const isMasterAdmin = displayEmail.toLowerCase().includes("martau@gmail.com");
  const effectiveRole = isMasterAdmin ? "admin" : (profile?.role || "user");

  const refreshWalletBalance = async () => {
    if (!user) return;
    const { data: walletData } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (walletData) {
      setWalletBalance(walletData.balance);
    }
  };

  const markWelcomeModalAsSeen = async () => {
    if (!user) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`iris_welcome_seen_${user.id}`, "true");
      }
      setProfile((prev) => (prev ? { ...prev, has_seen_welcome_modal: true } : prev));
      await supabase
        .from("profiles")
        .update({ has_seen_welcome_modal: true })
        .eq("id", user.id);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de l'état du modal de bienvenue:", err);
    }
  };

  return {
    user,
    profile: profile ? { ...profile, role: effectiveRole } : { role: effectiveRole },
    walletBalance,
    isAdmin: effectiveRole === "admin",
    loading,
    isLoading: loading,
    signOut,
    displayName,
    displayEmail,
    avatarUrl,
    refreshWalletBalance,
    markWelcomeModalAsSeen,
  };
}
