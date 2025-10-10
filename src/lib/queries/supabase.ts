import type { SupabaseClient } from "@supabase/supabase-js";

export type ClassRow = {
  id: string;
  name?: string | null;
  sector_id?: number | null;
  sector?: string | null;
  sector_code?: string | null;
  sector_name?: string | null;
  branch?: string | null;
  branch_code?: string | null;
  branch_name?: string | null;
  code?: string | null;
};

export type SectorRow = {
  id: number;
  name: string | null;
  code: string | null;
};

export type StudentRow = {
  id: string;
  class_id?: string | null;
  saint_name?: string | null;
  full_name?: string | null;
  code?: string | null;
  student_code?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  parent_phone1?: string | null;
  parent_phone2?: string | null;
  parent_phone_1?: string | null;
  parent_phone_2?: string | null;
  address?: string | null;
  notes?: string | null;
  academic_hk1_fortyfive?: number | string | null;
  academic_hk1_exam?: number | string | null;
  academic_hk2_fortyfive?: number | string | null;
  academic_hk2_exam?: number | string | null;
  attendance_hk1_present?: number | string | null;
  attendance_hk1_total?: number | string | null;
  attendance_hk2_present?: number | string | null;
  attendance_hk2_total?: number | string | null;
  attendance_thursday_present?: number | string | null;
  attendance_thursday_total?: number | string | null;
  attendance_sunday_present?: number | string | null;
  attendance_sunday_total?: number | string | null;
};

export type StudentClassRow = Pick<StudentRow, "id" | "class_id">;

export type TeacherRow = {
  id: string;
  saint_name: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  class_id?: string | null;
  class_name: string | null;
  class_code: string | null;
  sector: string | null;
};

const SUPABASE_IGNORED_ERROR_CODES = new Set(["42501", "42P01", "42703"]);
const SUPABASE_STUDENTS_PAGE_SIZE = 1000;

export function isIgnorableSupabaseError(error?: { code?: string }) {
  if (!error?.code) {
    return false;
  }
  return SUPABASE_IGNORED_ERROR_CODES.has(error.code);
}

export async function fetchSectors(supabase: SupabaseClient): Promise<SectorRow[]> {
  const { data, error } = await supabase.from("sectors").select("id, name, code");

  if (error) {
    if (isIgnorableSupabaseError(error)) {
      console.warn("Supabase sectors query fallback:", error.message);
      return [];
    }
    throw new Error(error.message);
  }

  return (data as SectorRow[] | null) ?? [];
}

export async function fetchClasses(supabase: SupabaseClient): Promise<ClassRow[]> {
  const { data, error } = await supabase.from("classes").select("*");

  if (error) {
    if (isIgnorableSupabaseError(error)) {
      console.warn("Supabase classes query fallback:", error.message);
      return [];
    }
    throw new Error(error.message);
  }

  return (data as ClassRow[] | null) ?? [];
}

export async function fetchTeachers(supabase: SupabaseClient): Promise<TeacherRow[]> {
  const { data, error } = await supabase.from("teachers").select("*");

  if (error) {
    if (isIgnorableSupabaseError(error)) {
      console.warn("Supabase teachers query fallback:", error.message);
      return [];
    }
    throw new Error(error.message);
  }

  return (data as TeacherRow[] | null) ?? [];
}

export async function fetchStudentClassPairs(supabase: SupabaseClient): Promise<StudentClassRow[]> {
  const { data, error } = await supabase.from("students").select("id, class_id");

  if (error) {
    if (isIgnorableSupabaseError(error)) {
      console.warn("Supabase students class count query fallback:", error.message);
      return [];
    }
    throw new Error(error.message);
  }

  return (data as StudentClassRow[] | null) ?? [];
}

export async function fetchStudents(supabase: SupabaseClient): Promise<StudentRow[]> {
  const pageSize = SUPABASE_STUDENTS_PAGE_SIZE;
  const allRows: StudentRow[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from("students").select("*").range(from, to);

    if (error) {
      if (isIgnorableSupabaseError(error)) {
        console.warn("Supabase students query fallback:", error.message);
        return [];
      }
      throw new Error(error.message);
    }

    const batch = (data as StudentRow[] | null) ?? [];
    allRows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}
