import type { SupabaseClient } from "@supabase/supabase-js";

import StudentsPage from "./students-page-client";

import { resolveProfileRole } from "@/lib/auth/profile-role";
import {
  fetchClasses,
  fetchSectors,
  fetchStudents,
  isIgnorableSupabaseError,
} from "@/lib/queries/supabase";
import type { ClassRow, SectorRow, StudentRow } from "@/lib/queries/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/auth";

function resolveSettledValue<T>(result: PromiseSettledResult<T>, label: string): T | undefined {
  if (result.status === "fulfilled") {
    return result.value;
  }

  console.warn(`Failed to prefetch ${label} data on server`, result.reason);
  return undefined;
}

function normalizeClassId(value?: string | null) {
  return value ? value.trim().toLowerCase() : "";
}

type UserScope = {
  role: AppRole;
  assignedClassId: string | null;
};

async function resolveUserScope(supabase: SupabaseClient): Promise<UserScope> {
  const defaultScope: UserScope = { role: "catechist", assignedClassId: null };

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn("Failed to verify user session for students scope", userError);
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
      console.warn("Failed to load user profile for students scope", profileError);
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
      console.warn("Failed to resolve profile role for students scope", roleError);
    }

    const normalizedProfileClassId = normalizeClassId(profile?.class_id);
    let assignedClassId = profile?.class_id?.trim() || null;

    if (!assignedClassId && profile?.phone) {
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
            console.warn("Failed to resolve teacher assignment for students scope", teacherError);
          }
        } else if (teacher?.class_id) {
          const trimmed = teacher.class_id?.trim();
          assignedClassId = trimmed ? trimmed : null;
        }
      } catch (teacherLookupError) {
        console.warn("Teacher lookup failed for students scope", teacherLookupError);
      }
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
    console.warn("Failed to resolve user scope for students page", error);
    return defaultScope;
  }
}

export default async function StudentsPageRoute() {
  const supabase = await createSupabaseServerClient();
  const { role: currentRole, assignedClassId } = await resolveUserScope(supabase);

  const normalizedAssignedClassId = normalizeClassId(assignedClassId);
  const isCatechist = currentRole === "catechist";
  const hasAssignedClass = normalizedAssignedClassId.length > 0;
  const classScopeId = hasAssignedClass ? assignedClassId : null;
  const shouldFetchStudents = !isCatechist || hasAssignedClass;

  const studentsPromise: Promise<StudentRow[]> = shouldFetchStudents
    ? fetchStudents(supabase, classScopeId ? { classId: classScopeId } : undefined)
    : Promise.resolve([]);

  const [sectorsResult, classesResult, studentsResult] = (await Promise.allSettled([
    fetchSectors(supabase),
    fetchClasses(supabase),
    studentsPromise,
  ])) as [
    PromiseSettledResult<SectorRow[]>,
    PromiseSettledResult<ClassRow[]>,
    PromiseSettledResult<StudentRow[]>,
  ];

  const initialSectors = resolveSettledValue(sectorsResult, "sectors");
  let initialClasses = resolveSettledValue(classesResult, "classes");
  const initialStudents = resolveSettledValue(studentsResult, "students");

  if (isCatechist) {
    if (hasAssignedClass && initialClasses) {
      initialClasses = initialClasses.filter(
        (cls) => normalizeClassId(cls.id) === normalizedAssignedClassId,
      );
    } else if (initialClasses) {
      initialClasses = [];
    }
  }

  return (
    <StudentsPage
      currentRole={currentRole}
      assignedClassId={classScopeId}
      initialSectors={initialSectors}
      initialClasses={initialClasses}
      initialStudents={initialStudents}
    />
  );
}
