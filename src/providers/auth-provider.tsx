"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session, SupabaseClient, User } from "@supabase/supabase-js";

import { authStorage } from "@/lib/auth/storage";
import { resolveProfileRole } from "@/lib/auth/profile-role";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, SessionSnapshot, SessionState } from "@/types/auth";

type LoginCredentials = {
  phone: string;
  password: string;
  remember?: boolean;
};

interface AuthContextValue {
  supabase: SupabaseClient;
  session: SessionState;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ error?: string }>;
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
    sector: null,
    className: null,
  } satisfies Profile;
}

function fallbackProfile(user: User): Profile {
  return {
    id: user.id,
    username: user.email ?? "",
    role: "catechist",
    fullName: user.user_metadata?.full_name ?? "",
    sector: null,
    className: null,
  };
}

function snapshotFromSession(session: Session, profile: Profile): SessionSnapshot {
  return {
    userId: session.user.id,
    profile,
    accessToken: session.access_token ?? undefined,
    refreshToken: session.refresh_token ?? undefined,
    expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
  };
}

function ensureSnapshotTokens(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    ...snapshot,
    accessToken: snapshot.accessToken,
    refreshToken: snapshot.refreshToken,
    expiresAt: snapshot.expiresAt,
  };
}

function isTerminalSignOut(event: AuthChangeEvent) {
  return event === "SIGNED_OUT" || (event as string) === "USER_DELETED";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabase] = useState(createSupabaseBrowserClient);
  const [session, setSession] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    session: null,
  });

  const applySession = useCallback((snapshot: SessionSnapshot | null) => {
    setSession({
      isLoading: false,
      isAuthenticated: Boolean(snapshot),
      session: snapshot ? ensureSnapshotTokens(snapshot) : null,
    });

    if (!snapshot) {
      authStorage.setSession(null);
      authStorage.setRole(null);
      return;
    }

    if (snapshot.accessToken) {
      authStorage.setSession({
        accessToken: snapshot.accessToken,
        refreshToken: snapshot.refreshToken,
        expiresAt: snapshot.expiresAt,
      });
    } else {
      authStorage.setSession(null);
    }
    authStorage.setRole(snapshot.profile.role);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.warn("Failed to verify auth state", error);
      }

      if (!currentSession?.user) {
        applySession(null);
        return;
      }

      const profile = await loadProfile(supabase, currentSession.user.id);

      if (!mounted) return;

      applySession(snapshotFromSession(currentSession, profile ?? fallbackProfile(currentSession.user)));
    };

    bootstrap().catch((error) => console.warn("Auth bootstrap failed", error));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (!nextSession?.user) {
        if (isTerminalSignOut(event)) {
          authStorage.clear();
        } else {
          authStorage.setSession(null);
          authStorage.setRole(null);
        }
        applySession(null);
        return;
      }

      const profile = await loadProfile(supabase, nextSession.user.id);
      if (!mounted) return;

      applySession(snapshotFromSession(nextSession, profile ?? fallbackProfile(nextSession.user)));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      isAuthenticated: session.isAuthenticated,
      login: async ({ phone, password, remember }) => {
        const cleanedPhone = phone.trim();
        const phoneEmail = `${cleanedPhone}@phone.local`.toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
          email: phoneEmail,
          password,
        });

        if (error) {
          return { error: error.message };
        }

        const authSession = data.session;
        const user = data.user ?? authSession?.user;

        if (!authSession || !user) {
          return { error: "Không thể xác thực người dùng. Vui lòng thử lại." };
        }

        const profile = await loadProfile(supabase, user.id);
        applySession(snapshotFromSession(authSession, profile ?? fallbackProfile(user)));

        if (remember) {
          authStorage.setAccount({ phone: cleanedPhone, password });
        } else {
          authStorage.setAccount(null);
        }

        return {};
      },
      signOut: async () => {
        try {
          const { error: clientError } = await supabase.auth.signOut({ scope: "local" });
          if (clientError) {
            console.warn("Client session sign-out warning:", clientError);
          }

          const response = await fetch("/api/auth/signout", {
            method: "POST",
            cache: "no-store",
          });

          if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(detail || `Server sign-out failed with status ${response.status}`);
          }
        } catch (error) {
          console.error("Sign out error:", error);
          window.location.href = "/login";
          return;
        } finally {
          authStorage.clear();
          applySession(null);
        }

        router.replace("/login");
        router.refresh();
      },
      refreshProfile: async () => {
        const current = session.session;
        if (!current) return;
        const profile = await loadProfile(supabase, current.userId);
        if (profile) {
          applySession({
            ...current,
            profile,
          });
        }
      },
    }),
    [applySession, router, session, supabase],
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
