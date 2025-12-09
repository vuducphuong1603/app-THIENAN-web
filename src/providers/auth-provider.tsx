"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

type RegisterCredentials = {
  username: string;
  email: string;
  password: string;
};

interface AuthContextValue {
  supabase: SupabaseClient;
  session: SessionState;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ error?: string }>;
  register: (credentials: RegisterCredentials) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
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
      register: async ({ username, email, password }) => {
        const cleanedUsername = username.trim();
        const cleanedEmail = email.trim().toLowerCase();
        const phoneEmail = `${cleanedUsername}@phone.local`.toLowerCase();

        console.log("[Register] Attempting signup with:", { phoneEmail, cleanedEmail });

        const { data, error } = await supabase.auth.signUp({
          email: phoneEmail,
          password,
          options: {
            data: {
              phone: cleanedUsername,
              email: cleanedEmail,
              full_name: cleanedUsername,
            },
          },
        });

        console.log("[Register] Signup response:", { data, error });

        if (error) {
          console.error("[Register] Signup error:", error);
          if (error.message.includes("already registered")) {
            return { error: "Tên đăng nhập này đã được sử dụng" };
          }
          if (error.message.includes("Signups not allowed")) {
            return { error: "Chức năng đăng ký đã bị tắt. Vui lòng liên hệ quản trị viên." };
          }
          return { error: error.message };
        }

        const authSession = data.session;
        const user = data.user;

        console.log("[Register] User created:", { userId: user?.id, hasSession: !!authSession });

        if (!user) {
          return { error: "Không thể tạo tài khoản. Vui lòng thử lại." };
        }

        if (authSession) {
          const profile = await loadProfile(supabase, user.id);
          applySession(snapshotFromSession(authSession, profile ?? fallbackProfile(user)));
        }

        return {};
      },
      resetPassword: async (email: string) => {
        const cleanedEmail = email.trim().toLowerCase();

        const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          console.error("[ResetPassword] Error:", error);
          if (error.message.includes("rate limit")) {
            return { error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." };
          }
          return { error: "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại." };
        }

        return {};
      },
      signOut: async () => {
        // Always clear local state first to ensure logout works even if API fails
        authStorage.clear();
        applySession(null);

        try {
          // Try client-side signout - ignore errors as session may already be expired
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});

          // Try server-side signout - ignore errors as we've already cleared local state
          await fetch("/api/auth/signout", {
            method: "POST",
            cache: "no-store",
          }).catch(() => {});
        } catch {
          // Ignore all errors - we've already cleared local state
        }

        // Use window.location for a hard redirect to ensure complete state reset
        window.location.href = "/login";
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
    [applySession, session, supabase],
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
