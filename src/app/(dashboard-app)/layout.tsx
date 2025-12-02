import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardNavbar } from "@/components/dashboard";
import { getRoleLabel } from "@/lib/auth/roles";
import { resolveProfileRole } from "@/lib/auth/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/auth";

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, phone, role, full_name, saint_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch profile", error);
    return null;
  }

  if (!data) return null;

  const resolvedRole = await resolveProfileRole(supabase, {
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

export default async function DashboardAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn("Failed to verify user session", error);
  }

  if (!user) {
    redirect("/login");
  }

  const profile = await fetchProfile(user.id);

  const resolvedProfile =
    profile ??
    ({
      id: user.id,
      username: user.email ?? "",
      role: "catechist",
      fullName: user.user_metadata?.full_name ?? "",
    } satisfies Profile);

  return (
    <div className="min-h-screen">
      <DashboardNavbar
        userName={resolvedProfile.fullName || resolvedProfile.username}
        roleLabel={getRoleLabel(resolvedProfile.role)}
      />
      <main className="px-6 pb-8">
        {children}
      </main>
    </div>
  );
}
