import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/types/auth";
import { normalizeAppRole, getRolePriority } from "./roles";

type MinimalProfileRow = {
  id: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

type TeacherRoleRow = {
  role: string | null;
};

/**
 * Fetches the teacher role by looking up the user's phone number in the teachers table.
 * The teachers table uses phone as the unique identifier.
 */
async function fetchTeacherRole(
  client: SupabaseClient,
  profile: MinimalProfileRow,
): Promise<string | null> {
  // Only link by phone number (the only common field between user_profiles and teachers)
  if (!profile.phone || profile.phone.trim() === "") {
    return null;
  }

  try {
    const { data, error } = await client
      .from("teachers")
      .select("role")
      .eq("phone", profile.phone)
      .maybeSingle();

    if (error) {
      // Ignore missing table/column errors
      if (shouldAbortTeacherLookup(error.code)) {
        return null;
      }
      console.warn("Teacher role lookup failed:", error);
      return null;
    }

    // The data returned from the query is of type `TeacherRoleRow` which has a `role` property.
    // We need to return the `role` property itself, which is a string or null.
    return data?.role ?? null;
  } catch (lookupError) {
    console.warn("Teacher role lookup failed:", lookupError);
    return null;
  }
}

function shouldAbortTeacherLookup(errorCode?: string) {
  // 42501: permission error; 42P01: undefined table; 42703: undefined column
  return errorCode === "42501" || errorCode === "42P01" || errorCode === "42703";
}

/**
 * Resolves the effective role for a user profile.
 * Checks both user_profiles table and teachers table, using the role with higher priority.
 *
 * Priority: admin (3) > sector_leader (2) > catechist (1)
 *
 * Note: The database uses different role values (phan_doan_truong, giao_ly_vien)
 * but normalizeAppRole handles the mapping.
 */
export async function resolveProfileRole(
  client: SupabaseClient,
  profile: MinimalProfileRow,
): Promise<AppRole> {
  const normalizedProfileRole = normalizeAppRole(profile.role);
  const teacherRole = await fetchTeacherRole(client, profile);

  if (teacherRole) {
    const normalizedTeacherRole = normalizeAppRole(teacherRole);
    // Only use teacher role if it has higher priority than profile role
    // This prevents teacher table from downgrading admin to catechist
    if (getRolePriority(normalizedTeacherRole) > getRolePriority(normalizedProfileRole)) {
      return normalizedTeacherRole;
    }
  }

  return normalizedProfileRole;
}
