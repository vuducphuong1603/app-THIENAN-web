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
  first_name?: string | null;
  last_name?: string | null;
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

export type StudentBasicRow = {
  id: string;
  class_id?: string | null;
  saint_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  student_code?: string | null;
  code?: string | null;
  status?: string | null;
};

export type StudentScoreDetailRow = {
  id: string;
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

export type TeacherRow = {
  id: string;
  saint_name: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  class_id: string | null;
  class_name: string | null;
  sector: string | null;
};

const SUPABASE_IGNORED_ERROR_CODES = new Set(["42501", "42P01", "42703"]);
const SUPABASE_STUDENTS_PAGE_SIZE = 1000;
const SUPABASE_MAX_PARALLEL_PAGES = 4;
const SUPABASE_IN_QUERY_CHUNK = 100;

const STUDENT_TABLE_BASE_COLUMNS = ["id", "class_id", "full_name"] as const;
const STUDENT_TABLE_OPTIONAL_COLUMNS = ["status", "saint_name", "student_code", "code", "first_name", "last_name"] as const;
type StudentOptionalColumn = (typeof STUDENT_TABLE_OPTIONAL_COLUMNS)[number];
type StudentOptionalAvailability = Record<StudentOptionalColumn, boolean>;

let studentOptionalColumnsAvailability: StudentOptionalAvailability | null = null;
let studentOptionalColumnsAvailabilityPromise: Promise<StudentOptionalAvailability> | null = null;

const STUDENT_SCORE_OPTIONAL_COLUMNS = [
  "academic_hk1_fortyfive",
  "academic_hk1_exam",
  "academic_hk2_fortyfive",
  "academic_hk2_exam",
  "attendance_hk1_present",
  "attendance_hk1_total",
  "attendance_hk2_present",
  "attendance_hk2_total",
  "attendance_thursday_present",
  "attendance_thursday_total",
  "attendance_sunday_present",
  "attendance_sunday_total",
] as const;

type StudentScoreColumn = (typeof STUDENT_SCORE_OPTIONAL_COLUMNS)[number];
type StudentScoreColumnsAvailability = Record<StudentScoreColumn, boolean>;

let studentScoreColumnsAvailability: StudentScoreColumnsAvailability | null = null;
let studentScoreColumnsAvailabilityPromise: Promise<StudentScoreColumnsAvailability> | null = null;

function createStudentOptionalAvailability(defaultValue: boolean): StudentOptionalAvailability {
  return STUDENT_TABLE_OPTIONAL_COLUMNS.reduce<StudentOptionalAvailability>((accumulator, column) => {
    accumulator[column] = defaultValue;
    return accumulator;
  }, {} as StudentOptionalAvailability);
}

function createEmptyStudentOptionalAvailability(): StudentOptionalAvailability {
  return createStudentOptionalAvailability(false);
}

function buildStudentSelectColumns(availability: Record<StudentOptionalColumn, boolean>) {
  const columns: string[] = [...STUDENT_TABLE_BASE_COLUMNS];
  for (const column of STUDENT_TABLE_OPTIONAL_COLUMNS) {
    if (availability[column]) {
      columns.push(column);
    }
  }
  return columns.join(", ");
}

function createStudentScoreColumnsAvailability(defaultValue: boolean): StudentScoreColumnsAvailability {
  return STUDENT_SCORE_OPTIONAL_COLUMNS.reduce<StudentScoreColumnsAvailability>((accumulator, column) => {
    accumulator[column] = defaultValue;
    return accumulator;
  }, {} as StudentScoreColumnsAvailability);
}

function buildStudentScoreSelectColumns(availability: StudentScoreColumnsAvailability) {
  const columns: string[] = ["id"];
  for (const column of STUDENT_SCORE_OPTIONAL_COLUMNS) {
    if (availability[column]) {
      columns.push(column);
    }
  }
  return columns.join(", ");
}

function isStudentScoreColumn(column: string): column is StudentScoreColumn {
  return (STUDENT_SCORE_OPTIONAL_COLUMNS as readonly string[]).includes(column);
}

function extractMissingColumnFromError(error: {
  message?: string | null;
  details?: string | null;
}): string | null {
  const source = error.message ?? error.details ?? "";
  const match = source.match(/column\s+(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)\s+does not exist/i);
  if (!match) {
    return null;
  }
  return match[1] ?? null;
}

function extractMissingStudentColumn(error: { message?: string | null; details?: string | null }): StudentOptionalColumn | null {
  const column = extractMissingColumnFromError(error);
  if (!column) {
    return null;
  }
  return (STUDENT_TABLE_OPTIONAL_COLUMNS as readonly string[]).includes(column)
    ? (column as StudentOptionalColumn)
    : null;
}

export function isIgnorableSupabaseError(error?: { code?: string }) {
  if (!error?.code) {
    return false;
  }
  return SUPABASE_IGNORED_ERROR_CODES.has(error.code);
}

async function discoverStudentOptionalColumnsAvailability(
  supabase: SupabaseClient,
): Promise<StudentOptionalAvailability> {
  const availability = createEmptyStudentOptionalAvailability();

  const { data: sampleRow, error } = await supabase
    .from("students")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isIgnorableSupabaseError(error)) {
      console.warn("Supabase students column discovery fallback:", error.message);
    } else {
      console.warn("Failed to discover students optional columns", error);
    }
  }

  if (sampleRow && typeof sampleRow === "object") {
    for (const column of STUDENT_TABLE_OPTIONAL_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(sampleRow, column)) {
        availability[column] = true;
      }
    }
    return availability;
  }

  const { data: metadataRows, error: metadataError } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "students");

  if (metadataError) {
    if (isIgnorableSupabaseError(metadataError)) {
      console.warn("Supabase students column metadata fallback:", metadataError.message);
    } else {
      console.warn("Failed to retrieve students column metadata", metadataError);
    }
    return availability;
  }

  if (Array.isArray(metadataRows)) {
    for (const row of metadataRows as Array<{ column_name?: string | null }>) {
      const columnName = row.column_name;
      if (
        typeof columnName === "string" &&
        (STUDENT_TABLE_OPTIONAL_COLUMNS as readonly string[]).includes(columnName)
      ) {
        availability[columnName as StudentOptionalColumn] = true;
      }
    }
  }

  return availability;
}

async function discoverStudentScoreColumnsAvailability(
  supabase: SupabaseClient,
): Promise<StudentScoreColumnsAvailability> {
  const availability = createStudentScoreColumnsAvailability(false);

  const { data: sampleRow, error } = await supabase
    .from("students")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isIgnorableSupabaseError(error)) {
      console.warn("Supabase students score column discovery fallback:", error.message);
    } else {
      console.warn("Failed to discover students score columns", error);
    }
  }

  if (sampleRow && typeof sampleRow === "object") {
    for (const column of STUDENT_SCORE_OPTIONAL_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(sampleRow, column)) {
        availability[column] = true;
      }
    }
    return availability;
  }

  const { data: metadataRows, error: metadataError } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "students")
    .in("column_name", STUDENT_SCORE_OPTIONAL_COLUMNS as unknown as string[]);

  if (metadataError) {
    if (isIgnorableSupabaseError(metadataError)) {
      console.warn("Supabase students score column metadata fallback:", metadataError.message);
    } else {
      console.warn("Failed to retrieve students score column metadata", metadataError);
    }
    return availability;
  }

  if (Array.isArray(metadataRows)) {
    for (const row of metadataRows as Array<{ column_name?: string | null }>) {
      const columnName = row.column_name;
      if (typeof columnName === "string" && (STUDENT_SCORE_OPTIONAL_COLUMNS as readonly string[]).includes(columnName)) {
        availability[columnName as StudentScoreColumn] = true;
      }
    }
  }

  return availability;
}

async function ensureStudentOptionalColumnsAvailability(
  supabase: SupabaseClient,
): Promise<StudentOptionalAvailability> {
  if (studentOptionalColumnsAvailability) {
    return { ...studentOptionalColumnsAvailability } as StudentOptionalAvailability;
  }

  if (!studentOptionalColumnsAvailabilityPromise) {
    studentOptionalColumnsAvailabilityPromise = discoverStudentOptionalColumnsAvailability(supabase);
  }

  let resolved = createEmptyStudentOptionalAvailability();
  try {
    resolved = await studentOptionalColumnsAvailabilityPromise;
  } catch (error) {
    console.warn("Failed to resolve students optional column availability", error);
  } finally {
    studentOptionalColumnsAvailabilityPromise = null;
  }

  studentOptionalColumnsAvailability = resolved;
  return { ...studentOptionalColumnsAvailability } as StudentOptionalAvailability;
}

async function ensureStudentScoreColumnsAvailability(
  supabase: SupabaseClient,
): Promise<StudentScoreColumnsAvailability> {
  if (studentScoreColumnsAvailability) {
    return { ...studentScoreColumnsAvailability };
  }

  if (!studentScoreColumnsAvailabilityPromise) {
    studentScoreColumnsAvailabilityPromise = discoverStudentScoreColumnsAvailability(supabase);
  }

  let resolved = createStudentScoreColumnsAvailability(false);
  try {
    resolved = await studentScoreColumnsAvailabilityPromise;
  } catch (error) {
    console.warn("Failed to resolve students score column availability", error);
  } finally {
    studentScoreColumnsAvailabilityPromise = null;
  }

  studentScoreColumnsAvailability = resolved;
  return { ...studentScoreColumnsAvailability };
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
  const pageSize = SUPABASE_STUDENTS_PAGE_SIZE;
  const allRows: StudentClassRow[] = [];

  const { data: firstBatchData, error: firstError, count } = await supabase
    .from("students")
    .select("id, class_id", { count: "exact" })
    .range(0, pageSize - 1);

  if (firstError) {
    if (isIgnorableSupabaseError(firstError)) {
      console.warn("Supabase students class count query fallback:", firstError.message);
      return [];
    }
    throw new Error(firstError.message);
  }

  const firstBatch = (firstBatchData as StudentClassRow[] | null) ?? [];
  allRows.push(...firstBatch);

  const totalRows = count ?? firstBatch.length;

  if (totalRows <= firstBatch.length) {
    return allRows;
  }

  let from = firstBatch.length;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from("students").select("id, class_id").range(from, to);

    if (error) {
      if (isIgnorableSupabaseError(error)) {
        console.warn("Supabase students class count paging fallback:", error.message);
        break;
      }
      throw new Error(error.message);
    }

    const batch = (data as StudentClassRow[] | null) ?? [];
    allRows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;

    if (count !== null && from >= totalRows) {
      break;
    }
  }

  return allRows;
}

type FetchStudentsOptions = {
  classId?: string | null;
};

export async function fetchStudents(
  supabase: SupabaseClient,
  options?: FetchStudentsOptions,
): Promise<StudentRow[]> {
  const pageSize = SUPABASE_STUDENTS_PAGE_SIZE;
  const allRows: StudentRow[] = [];
  const scopedClassId = options?.classId?.trim() ?? "";
  const hasClassScope = scopedClassId.length > 0;

  const buildStudentQuery = (withCount: boolean) => {
    let query = supabase
      .from("students")
      .select("*", withCount ? { count: "exact" as const } : undefined);
    if (hasClassScope) {
      query = query.eq("class_id", scopedClassId);
    }
    return query;
  };

  const {
    data: firstBatchData,
    error: firstError,
    count,
  } = await buildStudentQuery(true).range(0, pageSize - 1);

  if (firstError) {
    if (isIgnorableSupabaseError(firstError)) {
      console.warn("Supabase students query fallback:", firstError.message);
      return [];
    }
    throw new Error(firstError.message);
  }

  const firstBatch = (firstBatchData as StudentRow[] | null) ?? [];
  allRows.push(...firstBatch);

  const totalRows = count ?? firstBatch.length;

  // If we have either the full dataset already or the count is smaller than the page size, exit early.
  if (totalRows <= firstBatch.length) {
    return allRows;
  }

  // If we weren't able to retrieve an accurate count, fall back to the sequential paging approach.
  if (count === null) {
    let from = firstBatch.length;
    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await buildStudentQuery(false).range(from, to);

      if (error) {
        if (isIgnorableSupabaseError(error)) {
          console.warn("Supabase students query fallback:", error.message);
          return allRows;
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

  const totalPages = Math.ceil(totalRows / pageSize);
  if (totalPages <= 1) {
    return allRows;
  }

  const remainingPageIndexes = Array.from({ length: totalPages - 1 }, (_, index) => index + 1);

  for (let i = 0; i < remainingPageIndexes.length; i += SUPABASE_MAX_PARALLEL_PAGES) {
    const pageChunk = remainingPageIndexes.slice(i, i + SUPABASE_MAX_PARALLEL_PAGES);
    const responses = await Promise.all(
      pageChunk.map((page) => {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        return buildStudentQuery(false).range(from, to);
      }),
    );

    for (const response of responses) {
      if (response.error) {
        if (isIgnorableSupabaseError(response.error)) {
          console.warn("Supabase students query fallback:", response.error.message);
          return allRows;
        }
        throw new Error(response.error.message);
      }

      const batch = (response.data as StudentRow[] | null) ?? [];
      allRows.push(...batch);
    }
  }

  return allRows;
}

export async function fetchStudentsByClass(
  supabase: SupabaseClient,
  classId: string,
): Promise<StudentBasicRow[]> {
  if (!classId.trim()) {
    return [];
  }

  const trimmedClassId = classId.trim();
  const initialAvailability = await ensureStudentOptionalColumnsAvailability(supabase);

  let availability: StudentOptionalAvailability = { ...initialAvailability };

  while (true) {
    const selectColumns = buildStudentSelectColumns(availability);
    let query = supabase
      .from("students")
      .select(selectColumns)
      .eq("class_id", trimmedClassId)
      .order("full_name", { ascending: true, nullsFirst: false });

    if (availability.status) {
      query = query.neq("status", "DELETED");
    }

    const { data, error } = await query;

    if (!error) {
      studentOptionalColumnsAvailability = { ...availability };
      return (data as StudentBasicRow[] | null) ?? [];
    }

    if (!isIgnorableSupabaseError(error)) {
      throw new Error(error.message);
    }

    if (error.code === "42703") {
      const missingColumn = extractMissingStudentColumn(error);
      if (missingColumn && availability[missingColumn]) {
        console.warn(
          `Supabase students by class query missing column '${missingColumn}', retrying without it.`,
        );
        availability = { ...availability, [missingColumn]: false };
        if (studentOptionalColumnsAvailability === null) {
          studentOptionalColumnsAvailability = { ...availability, [missingColumn]: false };
        } else {
          studentOptionalColumnsAvailability = {
            ...studentOptionalColumnsAvailability,
            [missingColumn]: false,
          };
        }
        continue;
      }
    }

    console.warn("Supabase students by class query fallback:", error.message);
    return [];
  }
}

export async function fetchStudentScoreDetails(
  supabase: SupabaseClient,
  studentIds: string[],
): Promise<StudentScoreDetailRow[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const trimmedIds = studentIds
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (trimmedIds.length === 0) {
    return [];
  }

  const results: StudentScoreDetailRow[] = [];
  const initialAvailability = await ensureStudentScoreColumnsAvailability(supabase);
  let availability: StudentScoreColumnsAvailability = { ...initialAvailability };

  for (let index = 0; index < trimmedIds.length; index += SUPABASE_IN_QUERY_CHUNK) {
    const chunk = trimmedIds.slice(index, index + SUPABASE_IN_QUERY_CHUNK);

    let retry = 0;
    while (true) {
      const selectColumns = buildStudentScoreSelectColumns(availability);
      const query = supabase.from("students").select(selectColumns).in("id", chunk);
      const { data, error } = await query;

      if (!error) {
        if (Array.isArray(data)) {
          results.push(...(data as StudentScoreDetailRow[]));
        }
        break;
      }

      if (!isIgnorableSupabaseError(error)) {
        throw new Error(error.message);
      }

      if (error.code === "42703") {
        const missingColumn = extractMissingColumnFromError(error);
        if (missingColumn && isStudentScoreColumn(missingColumn) && availability[missingColumn]) {
          availability = { ...availability, [missingColumn]: false };
          studentScoreColumnsAvailability = {
            ...(studentScoreColumnsAvailability ?? availability),
            [missingColumn]: false,
          };
          retry += 1;
          if (retry > STUDENT_SCORE_OPTIONAL_COLUMNS.length) {
            console.warn("Supabase student score query fallback after removing missing columns:", error.message);
            break;
          }
          continue;
        }
      }

      console.warn("Supabase student score query fallback:", error.message);
      break;
    }
  }

  return results;
}

export type AttendanceRecordRow = {
  student_id: string;
  event_date: string | null;
  status?: string | null;
  weekday?: string | null;
  student_class_id?: string | null;
  student_class_name?: string | null;
};

export async function fetchAttendanceRecordsForStudents(
  supabase: SupabaseClient,
  studentIds: string[],
  startDate?: string,
  endDate?: string,
): Promise<AttendanceRecordRow[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const trimmedIds = studentIds
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (trimmedIds.length === 0) {
    return [];
  }

  const results: AttendanceRecordRow[] = [];

  for (let index = 0; index < trimmedIds.length; index += SUPABASE_IN_QUERY_CHUNK) {
    const chunk = trimmedIds.slice(index, index + SUPABASE_IN_QUERY_CHUNK);

    let query = supabase
      .from("attendance_records")
      .select("student_id, event_date, status, weekday, student_class_id, student_class_name")
      .in("student_id", chunk)
      .order("event_date", { ascending: true })
      .order("student_id", { ascending: true });

    if (startDate) {
      query = query.gte("event_date", startDate);
    }
    if (endDate) {
      query = query.lte("event_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      if (isIgnorableSupabaseError(error)) {
        console.warn("Supabase attendance records query fallback:", error.message);
        continue;
      }
      throw new Error(error.message);
    }

    if (Array.isArray(data)) {
      results.push(...(data as AttendanceRecordRow[]));
    }
  }

  return results;
}
