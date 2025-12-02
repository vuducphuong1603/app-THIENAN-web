import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ProtectedLayoutClient } from "@/components/layout/protected-layout-client";
import type { NavSection } from "@/components/navigation/types";
import { getRoleLabel } from "@/lib/auth/roles";
import { resolveProfileRole } from "@/lib/auth/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/types/auth";

function buildSections(role: AppRole): NavSection[] {
  if (role === "admin") {
    return [
      {
        label: "Tổng quan",
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "So sánh hiệu suất", href: "/performance" },
        ],
      },
      {
        label: "Quản lý",
        items: [
          { label: "Người dùng", href: "/users" },
          { label: "Lớp học", href: "/classes" },
          { label: "Thiếu nhi", href: "/students" },
        ],
      },
      {
        label: "Hoạt động",
        items: [{ label: "Báo cáo", href: "/reports" }],
      },
      {
        label: "Hệ thống",
        items: [{ label: "Cài đặt", href: "/settings" }],
      },
    ];
  }

  if (role === "sector_leader") {
    return [
      {
        label: "Tổng quan",
        items: [{ label: "Dashboard", href: "/dashboard" }],
      },
      {
        label: "Quản lý",
        items: [
          { label: "Lớp học", href: "/classes" },
          { label: "Thiếu nhi", href: "/students" },
        ],
      },
      {
        label: "Hoạt động",
        items: [{ label: "Báo cáo", href: "/reports" }],
      },
      {
        label: "Hệ thống",
        items: [{ label: "Cài đặt", href: "/settings" }],
      },
    ];
  }

  // catechist role
  return [
    {
      label: "Tổng quan",
      items: [{ label: "Dashboard", href: "/dashboard" }],
    },
    {
      label: "Quản lý",
      items: [{ label: "Thiếu nhi", href: "/students" }],
    },
    {
      label: "Hoạt động",
      items: [{ label: "Báo cáo", href: "/reports" }],
    },
    {
      label: "Hệ thống",
      items: [{ label: "Cài đặt", href: "/settings" }],
    },
  ];
}

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
    sector: null, // user_profiles doesn't have sector
    className: null, // user_profiles doesn't have class_name
  } satisfies Profile;
}

export default async function AuthenticatedLayout({
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
    <ProtectedLayoutClient
      sections={buildSections(resolvedProfile.role)}
      userName={resolvedProfile.fullName || resolvedProfile.username}
      roleLabel={getRoleLabel(resolvedProfile.role)}
    >
      {children}
    </ProtectedLayoutClient>
  );
}
