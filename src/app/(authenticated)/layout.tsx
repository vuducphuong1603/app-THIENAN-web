import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ProtectedLayoutClient } from "@/components/layout/protected-layout-client";
import type { NavSection } from "@/components/navigation/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/types/auth";

function mapRole(role?: string | null): AppRole {
  return role === "admin" ? "admin" : "catechist";
}

function roleLabel(role: AppRole) {
  return role === "admin" ? "Ban điều hành" : "Giáo lý viên";
}

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
    .from("profiles")
    .select("id, username, role, full_name, sector, class_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch profile", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    role: mapRole(data.role),
    fullName: data.full_name,
    sector: data.sector,
    className: data.class_name,
  } satisfies Profile;
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const profile = await fetchProfile(session.user.id);

  const resolvedProfile =
    profile ??
    ({
      id: session.user.id,
      username: session.user.email ?? "",
      role: "catechist",
      fullName: session.user.user_metadata?.full_name ?? "",
    } satisfies Profile);

  return (
    <ProtectedLayoutClient
      sections={buildSections(resolvedProfile.role)}
      userName={resolvedProfile.fullName || resolvedProfile.username}
      roleLabel={roleLabel(resolvedProfile.role)}
    >
      {children}
    </ProtectedLayoutClient>
  );
}
