import ClassesPage from "./classes-page-client";

import {
  fetchClasses,
  fetchSectors,
  fetchStudentClassPairs,
  fetchTeachers,
} from "@/lib/queries/supabase";
import type { ClassRow, SectorRow, StudentClassRow, TeacherRow } from "@/lib/queries/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function resolveSettledValue<T>(result: PromiseSettledResult<T>, label: string): T | undefined {
  if (result.status === "fulfilled") {
    return result.value;
  }

  console.warn(`Failed to prefetch ${label} data on server`, result.reason);
  return undefined;
}

export default async function ClassesPageRoute() {
  const supabase = await createSupabaseServerClient();

  const [
    classesResult,
    sectorsResult,
    teachersResult,
    studentClassPairsResult,
  ] = (await Promise.allSettled([
    fetchClasses(supabase),
    fetchSectors(supabase),
    fetchTeachers(supabase),
    fetchStudentClassPairs(supabase),
  ])) as [
    PromiseSettledResult<ClassRow[]>,
    PromiseSettledResult<SectorRow[]>,
    PromiseSettledResult<TeacherRow[]>,
    PromiseSettledResult<StudentClassRow[]>,
  ];

  const initialClasses = resolveSettledValue(classesResult, "classes");
  const initialSectors = resolveSettledValue(sectorsResult, "sectors");
  const initialTeachers = resolveSettledValue(teachersResult, "teachers");
  const initialStudentClassPairs = resolveSettledValue(studentClassPairsResult, "student class pairs");

  return (
    <ClassesPage
      initialClasses={initialClasses}
      initialSectors={initialSectors}
      initialTeachers={initialTeachers}
      initialStudentClassPairs={initialStudentClassPairs}
    />
  );
}
