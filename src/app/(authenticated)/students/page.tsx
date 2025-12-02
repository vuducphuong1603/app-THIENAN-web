import StudentsPage from "./students-page-client";

import {
  fetchAttendanceRecordsForStudents,
  fetchClasses,
  fetchSectors,
  fetchStudents,
} from "@/lib/queries/supabase";
import { fetchAcademicYears } from "@/lib/queries/academic-years";
import { resolveUserScope, normalizeClassId } from "@/lib/auth/user-scope";
import type { AttendanceRecordRow, ClassRow, SectorRow, StudentRow } from "@/lib/queries/supabase";
import type { AcademicYear } from "@/types/database";
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

  // Phase 1: Fetch independent data in parallel
  const [sectorsResult, classesResult, studentsResult, academicYearsResult] = (await Promise.allSettled([
    fetchSectors(supabase),
    fetchClasses(supabase),
    studentsPromise,
    fetchAcademicYears(supabase),
  ])) as [
    PromiseSettledResult<SectorRow[]>,
    PromiseSettledResult<ClassRow[]>,
    PromiseSettledResult<StudentRow[]>,
    PromiseSettledResult<AcademicYear[]>,
  ];

  const initialSectors = resolveSettledValue(sectorsResult, "sectors");
  let initialClasses = resolveSettledValue(classesResult, "classes");
  const initialStudents = resolveSettledValue(studentsResult, "students");
  const initialAcademicYears = resolveSettledValue(academicYearsResult, "academicYears");

  // Phase 2: Fetch attendance records (depends on studentIds)
  let initialAttendanceRecords: AttendanceRecordRow[] | undefined;
  if (initialStudents && initialStudents.length > 0) {
    const studentIds = initialStudents
      .map((s) => s.id?.trim())
      .filter((id): id is string => Boolean(id));

    if (studentIds.length > 0) {
      try {
        initialAttendanceRecords = await fetchAttendanceRecordsForStudents(supabase, studentIds);
      } catch (error) {
        console.warn("Failed to prefetch attendance records on server", error);
      }
    }
  }

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
      initialAttendanceRecords={initialAttendanceRecords}
      initialAcademicYears={initialAcademicYears}
    />
  );
}
