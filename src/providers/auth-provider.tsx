"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, SessionState } from "@/types/auth";
import { resolveProfileRole } from "@/lib/auth/profile-role";

interface AuthContextValue {
  supabase: SupabaseClient;
  session: SessionState;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("user_profiles")
    .select("id, email, phone, role, full_name, saint_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to load profile", error);
    return null;
  }

  if (!data) return null;

  const resolvedRole = await resolveProfileRole(client, {
    id: data.id,
    email: data.email,
    phone: data.phone,
    role: data.role,
  });

  return {
    id: data.id,
    username: data.email ?? "",
    role: resolvedRole,
    fullName: data.full_name ?? `${data.saint_name ?? ""}`.trim(),
    sector: null, // user_profiles doesn't have sector
    className: null, // user_profiles doesn't have class_name
  } satisfies Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabase] = useState(createSupabaseBrowserClient);
  const [session, setSession] = useState<SessionState>({ isLoading: true });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error) {
        console.warn("Failed to verify auth state", error);
      }

      if (!user) {
        setSession({ isLoading: false, session: null });
        return;
      }

      const profile = await loadProfile(supabase, user.id);

      if (!mounted) return;

      if (!profile) {
        setSession({
          isLoading: false,
          session: {
            userId: user.id,
            profile: {
              id: user.id,
              username: user.email ?? "",
              role: "catechist",
              fullName: user.user_metadata?.full_name ?? "",
            },
          },
        });
        return;
      }

      setSession({
        isLoading: false,
        session: {
          userId: user.id,
          profile,
        },
      });
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error) {
        console.warn("Failed to refresh auth state", error);
      }

      if (!user) {
        setSession({ isLoading: false, session: null });
        return;
      }

      const profile = await loadProfile(supabase, user.id);

      if (!mounted) return;

      setSession({
        isLoading: false,
        session: {
          userId: user.id,
          profile:
            profile ?? {
              id: user.id,
              username: user.email ?? "",
              role: "catechist",
              fullName: user.user_metadata?.full_name ?? "",
            },
        },
      });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      signOut: async () => {
        try {
          await supabase.auth.signOut();
          setSession({ isLoading: false, session: null });
          router.push("/login");
        } catch (error) {
          console.error("Sign out error:", error);
          // Force redirect even if sign out fails
          window.location.href = "/login";
        }
      },
      refreshProfile: async () => {
        const currentUserId = session.session?.userId;
        if (!currentUserId) return;
        const profile = await loadProfile(supabase, currentUserId);
        if (profile) {
          setSession({
            isLoading: false,
            session: {
              userId: currentUserId,
              profile,
            },
          });
        }
      },
    }),
    [session, supabase, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
