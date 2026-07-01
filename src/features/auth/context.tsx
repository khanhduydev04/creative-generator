"use client";
// Client Component: manages auth state, fetches user profile, provides sign out

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Profile } from "@/features/auth/types";
import type { UserMe } from "@/services/userService";

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      const res = await fetch("/api/user/me");
      if (!res.ok) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as UserMe;
      // Map UserMe to the legacy Profile shape so existing consumers keep working.
      // App-specific fields (role, department, is_active, etc.) are not returned by
      // the new endpoint — they default to safe values until those consumers
      // are migrated in a later phase.
      const mapped: Profile = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.is_platform_admin ? "super_admin" : "member",
        department: null,
        is_active: true,
        created_at: "",
        updated_at: "",
        created_by: null,
        last_login_at: null,
      };
      setProfile(mapped);
    } catch {
      setProfile(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadProfile();

    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
      } else if (event === "SIGNED_IN") {
        void loadProfile();
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider
      value={{ profile, loading, signOut, refreshProfile: loadProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
