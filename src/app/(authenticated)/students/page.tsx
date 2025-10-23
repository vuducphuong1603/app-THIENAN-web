import StudentsPage from "./students-page-client";

import {
  fetchClasses,
  fetchSectors,
  fetchStudents,
} from "@/lib/queries/supabase";
import { resolveUserScope, normalizeClassId } from "@/lib/auth/user-scope";
import type { ClassRow, SectorRow, StudentRow } from "@/lib/queries/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function resolveSettledValue<T>(result: PromiseSettledResult<T>, label: string): T | undefined {
  if (result.status === "fulfilled") {
    return result.value;
  }

  console.warn(`Failed to prefetch ${label} data on server`, result.reason);
  return undefined;
}

export default async function StudentsPageRoute() {
  const supabase = await createSupabaseServerClient();
  const { role: currentRole, assignedClassId } = await resolveUserScope(supabase);

  const normalizedAssignedClassId = normalizeClassId(assignedClassId);
  const isCatechist = currentRole === "catechist";
  const hasAssignedClass = normalizedAssignedClassId.length > 0;
  const classScopeId = isCatechist && hasAssignedClass ? assignedClassId : null;
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
