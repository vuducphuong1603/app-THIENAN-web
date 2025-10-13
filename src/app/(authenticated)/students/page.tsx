import StudentsPage from "./students-page-client";

import { fetchClasses, fetchSectors, fetchStudents } from "@/lib/queries/supabase";
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

  const [sectorsResult, classesResult, studentsResult] = (await Promise.allSettled([
    fetchSectors(supabase),
    fetchClasses(supabase),
    fetchStudents(supabase),
  ])) as [
    PromiseSettledResult<SectorRow[]>,
    PromiseSettledResult<ClassRow[]>,
    PromiseSettledResult<StudentRow[]>,
  ];

  const initialSectors = resolveSettledValue(sectorsResult, "sectors");
  const initialClasses = resolveSettledValue(classesResult, "classes");
  const initialStudents = resolveSettledValue(studentsResult, "students");

  return (
    <StudentsPage
      initialSectors={initialSectors}
      initialClasses={initialClasses}
      initialStudents={initialStudents}
    />
  );
}
