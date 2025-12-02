import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveProfileRole } from "@/lib/auth/profile-role";
import { isIgnorableSupabaseError } from "@/lib/queries/supabase";
import type { AppRole } from "@/types/auth";

export type UserClassScope = {
  role: AppRole;
  assignedClassId: string | null;
};

export function sanitizeClassId(value?: string | null) {
  return value ? value.trim() : "";
}

export function normalizeClassId(value?: string | null) {
  return sanitizeClassId(value).toLowerCase();
}

export async function resolveUserScope(supabase: SupabaseClient): Promise<UserClassScope> {
  const defaultScope: UserClassScope = { role: "catechist", assignedClassId: null };

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn("Failed to verify user session for user scope", userError);
    }

    if (!user) {
      return defaultScope;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("user_profiles")
      .select("id, email, phone, role, class_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("Failed to load user profile for user scope", profileError);
    }

    const minimalProfile = {
      id: user.id,
      email: profile?.email ?? user.email ?? null,
      phone: profile?.phone ?? null,
      role: profile?.role ?? null,
    };

    let resolvedRole: AppRole = defaultScope.role;
    try {
      resolvedRole = await resolveProfileRole(supabase, minimalProfile);
    } catch (roleError) {
      console.warn("Failed to resolve profile role for user scope", roleError);
    }

    const sanitizedProfileClassId = sanitizeClassId(profile?.class_id);
    const normalizedProfileClassId = normalizeClassId(profile?.class_id);
    let assignedClassId = sanitizedProfileClassId.length > 0 ? sanitizedProfileClassId : null;
    let teacherClassId: string | null = null;

    if (profile?.phone) {
      try {
        const {
          data: teacher,
          error: teacherError,
        } = await supabase
          .from("teachers")
          .select("class_id")
          .eq("phone", profile.phone)
          .maybeSingle();

        if (teacherError) {
          if (!isIgnorableSupabaseError(teacherError)) {
            console.warn("Failed to resolve teacher assignment for user scope", teacherError);
          }
        } else if (teacher?.class_id) {
          const trimmed = sanitizeClassId(teacher.class_id);
          teacherClassId = trimmed.length > 0 ? trimmed : null;
        }
      } catch (teacherLookupError) {
        console.warn("Teacher lookup failed for user scope", teacherLookupError);
      }
    }

    const normalizedTeacherClassId = normalizeClassId(teacherClassId);
    if (normalizedTeacherClassId.length > 0) {
      assignedClassId = teacherClassId;
    }

    const normalizedAssignedClassId = normalizeClassId(assignedClassId);
    if (
      assignedClassId &&
      normalizedAssignedClassId.length > 0 &&
      normalizedAssignedClassId !== normalizedProfileClassId
    ) {
      try {
        const { error: syncError } = await supabase
          .from("user_profiles")
          .update({ class_id: assignedClassId })
          .eq("id", user.id);

        if (syncError) {
          if (!isIgnorableSupabaseError(syncError)) {
            console.warn("Failed to sync user profile class assignment", syncError);
          }
        }
      } catch (syncException) {
        console.warn("Unexpected error while syncing user profile class assignment", syncException);
      }
    }

    return { role: resolvedRole, assignedClassId };
  } catch (error) {
    console.warn("Failed to resolve user scope", error);
    return defaultScope;
  }
}
