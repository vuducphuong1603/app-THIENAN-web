import type { SupabaseClient } from "@supabase/supabase-js";

import type { AcademicYear } from "@/types/database";
import { isIgnorableSupabaseError } from "./supabase";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type AcademicYearInput = {
  name: string;
  start_date: string;
  end_date: string;
  semester1_start: string;
  semester1_end: string;
  semester2_start: string;
  semester2_end: string;
  total_weeks?: number | null;
  semester1_weeks?: number | null;
  semester2_weeks?: number | null;
  is_current?: boolean;
};

type ResolvedDates = {
  start: Date;
  end: Date;
  sem1Start: Date;
  sem1End: Date;
  sem2Start: Date;
  sem2End: Date;
};

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function calculateWeeksBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil((diff + ONE_DAY_MS) / (7 * ONE_DAY_MS)));
}

function resolveDates(input: AcademicYearInput): { ok: true; dates: ResolvedDates } | { ok: false; message: string } {
  const start = parseDateOnly(input.start_date);
  const end = parseDateOnly(input.end_date);
  const sem1Start = parseDateOnly(input.semester1_start);
  const sem1End = parseDateOnly(input.semester1_end);
  const sem2Start = parseDateOnly(input.semester2_start);
  const sem2End = parseDateOnly(input.semester2_end);

  if (!start || !end || !sem1Start || !sem1End || !sem2Start || !sem2End) {
    return { ok: false, message: "Ngày tháng không hợp lệ. Vui lòng chọn lại." };
  }

  if (start > end) {
    return { ok: false, message: "Ngày bắt đầu phải trước ngày kết thúc năm học." };
  }

  if (sem1Start < start || sem1End < sem1Start) {
    return { ok: false, message: "Thời gian học kỳ 1 không hợp lệ." };
  }

  if (sem2Start <= sem1End || sem2End < sem2Start) {
    return { ok: false, message: "Thời gian học kỳ 2 phải sau học kỳ 1 và hợp lệ." };
  }

  if (sem2End > end) {
    return { ok: false, message: "Ngày kết thúc học kỳ 2 phải nằm trong năm học." };
  }

  return {
    ok: true,
    dates: {
      start,
      end,
      sem1Start,
      sem1End,
      sem2Start,
      sem2End,
    },
  };
}

function normalizeWeeks(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.round(value));
}

function buildPersistPayload(input: AcademicYearInput) {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Vui lòng nhập tên năm học.");
  }

  const resolved = resolveDates(input);
  if (!resolved.ok) {
    throw new Error(resolved.message);
  }

  const { dates } = resolved;
  const totalWeeks = normalizeWeeks(
    input.total_weeks,
    calculateWeeksBetween(dates.start, dates.end),
  );
  const semester1Weeks = normalizeWeeks(
    input.semester1_weeks,
    calculateWeeksBetween(dates.sem1Start, dates.sem1End),
  );
  const semester2Weeks = normalizeWeeks(
    input.semester2_weeks,
    calculateWeeksBetween(dates.sem2Start, dates.sem2End),
  );

  return {
    name: trimmedName,
    start_date: formatDateOnly(dates.start),
    end_date: formatDateOnly(dates.end),
    semester1_start: formatDateOnly(dates.sem1Start),
    semester1_end: formatDateOnly(dates.sem1End),
    semester2_start: formatDateOnly(dates.sem2Start),
    semester2_end: formatDateOnly(dates.sem2End),
    total_weeks: totalWeeks,
    semester1_weeks: semester1Weeks,
    semester2_weeks: semester2Weeks,
    is_current: Boolean(input.is_current),
  };
}

export async function fetchAcademicYears(supabase: SupabaseClient): Promise<AcademicYear[]> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    if (isIgnorableSupabaseError(error)) {
      console.warn("Supabase academic_years query fallback:", error.message);
      return [];
    }
    throw new Error(error.message);
  }

  return (data as AcademicYear[] | null) ?? [];
}

export async function createAcademicYear(supabase: SupabaseClient, input: AcademicYearInput): Promise<AcademicYear> {
  const payload = buildPersistPayload(input);

  const { data, error } = await supabase
    .from("academic_years")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message ?? "Không thể tạo năm học mới.");
  }

  return data as AcademicYear;
}

export async function updateAcademicYear(
  supabase: SupabaseClient,
  id: string,
  input: AcademicYearInput,
): Promise<AcademicYear> {
  if (!id) {
    throw new Error("Thiếu mã năm học để cập nhật.");
  }

  const payload = buildPersistPayload(input);

  const { data, error } = await supabase
    .from("academic_years")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Không thể cập nhật năm học.");
  }

  if (!data) {
    throw new Error("Không tìm thấy năm học cần cập nhật.");
  }

  return data as AcademicYear;
}

export async function setCurrentAcademicYear(supabase: SupabaseClient, id: string): Promise<AcademicYear> {
  if (!id) {
    throw new Error("Thiếu mã năm học để kích hoạt.");
  }

  // Database trigger trg_ensure_single_current_academic_year tự động
  // tắt is_current cho các năm học khác, chỉ cần 1 UPDATE
  const { data, error } = await supabase
    .from("academic_years")
    .update({ is_current: true })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Không thể kích hoạt năm học.");
  }

  if (!data) {
    throw new Error("Không tìm thấy năm học cần kích hoạt.");
  }

  return data as AcademicYear;
}
