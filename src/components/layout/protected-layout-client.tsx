"use client";

import { useAuth } from "@/providers/auth-provider";
import type { NavSection } from "@/components/navigation/types";
import { AppShell } from "./app-shell";

interface ProtectedLayoutClientProps {
  sections: NavSection[];
  userName?: string;
  roleLabel?: string;
  children: React.ReactNode;
}

export function ProtectedLayoutClient({ sections, userName, roleLabel, children }: ProtectedLayoutClientProps) {
  const { signOut } = useAuth();

  return (
    <AppShell sections={sections} userName={userName} roleLabel={roleLabel} onSignOut={signOut}>
      {children}
    </AppShell>
  );
}
