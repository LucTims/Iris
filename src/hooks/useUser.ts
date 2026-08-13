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
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setProfile(data);
        }
      }
      setLoading(false);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
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

  return {
    user,
    profile: profile ? { ...profile, role: effectiveRole } : { role: effectiveRole },
    isAdmin: effectiveRole === "admin",
    loading,
    signOut,
    displayName,
    displayEmail,
    avatarUrl,
  };
}
