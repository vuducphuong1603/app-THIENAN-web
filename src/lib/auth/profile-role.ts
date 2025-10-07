import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/types/auth";
import { normalizeAppRole, getRolePriority } from "./roles";

type MinimalProfileRow = {
  id: string;
  username?: string | null;
  role?: string | null;
};

type TeacherRoleRow = {
  role: string | null;
};

const TEACHER_TABLE_CANDIDATES = ["teachers", "teacher"];

const TEACHER_COLUMNS_BY_PRIORITY: Array<{
  column: string;
  derive: (profile: MinimalProfileRow) => string | null;
}> = [
  { column: "auth_user_id", derive: (profile) => profile.id },
  { column: "user_id", derive: (profile) => profile.id },
  { column: "profile_id", derive: (profile) => profile.id },
  { column: "username", derive: (profile) => profile.username ?? null },
  {
    column: "phone",
    derive: (profile) => extractPhoneCandidate(profile.username),
  },
  {
    column: "phone_number",
    derive: (profile) => extractPhoneCandidate(profile.username),
  },
];

function extractPhoneCandidate(identifier?: string | null) {
  if (!identifier) return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const localPart = trimmed.includes("@") ? trimmed.split("@")[0] ?? "" : trimmed;
  const digits = localPart.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

async function fetchTeacherRole(
  client: SupabaseClient,
  profile: MinimalProfileRow,
): Promise<string | null> {
  for (const table of TEACHER_TABLE_CANDIDATES) {
    for (const { column, derive } of TEACHER_COLUMNS_BY_PRIORITY) {
      const value = derive(profile);
      if (!value) continue;

      try {
        const { data, error } = await client
          .from(table)
          .select("role")
          .eq(column as never, value)
          .maybeSingle();

        if (error) {
          // Ignore missing table/column errors and keep trying other combinations
          if (shouldAbortTeacherLookup(error.code)) {
            return null;
          }
          continue;
        }

        if (data?.role) {
          return data.role;
        }
      } catch (lookupError) {
        console.warn(`Teacher role lookup failed for ${table}.${column}`, lookupError);
      }
    }
  }

  return null;
}

function shouldAbortTeacherLookup(errorCode?: string) {
  // 42501: permission error; 42P01: undefined table; 42703: undefined column
  return errorCode === "42501" || errorCode === "42P01" || errorCode === "42703";
}

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
