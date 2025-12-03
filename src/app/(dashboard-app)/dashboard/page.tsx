import Link from "next/link";

import { StatCard, AttendanceWidget, SectorStatsWidget, AlertsWidget, WeeklyPlanWidget, NotesWidget } from "@/components/dashboard";
import { resolveUserScope } from "@/lib/auth/user-scope";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/auth";
import type { AcademicYear } from "@/types/database";

type SectorIdentifier = {
  key: string;
  label: string;
  order: number;
};

type SectorMeta = {
  label: string;
  order: number;
};

type SectorAccumulator = {
  total_classes: number;
  total_students: number;
  total_teachers: number;
  attendanceSum: number;
  attendanceCount: number;
  studySum: number;
  studyCount: number;
};

type SectorRow = {
  id: number;
  name: string | null;
  code: string | null;
};

type ClassRow = {
  id: string;
  name?: string | null;
  sector_id?: number | null;
};

type StudentRow = {
  id: string;
  class_id?: string | null;
  academic_hk1_fortyfive?: number | string | null;
  academic_hk1_exam?: number | string | null;
  academic_hk2_fortyfive?: number | string | null;
  academic_hk2_exam?: number | string | null;
  attendance_hk1_present?: number | string | null;
  attendance_hk1_total?: number | string | null;
  attendance_hk2_present?: number | string | null;
  attendance_hk2_total?: number | string | null;
};

type TeacherRow = {
  id: string;
  sector?: string | null;
  class_id?: string | null;
  class_name?: string | null;
};

type AttendanceRecordRow = {
  student_id: string;
  event_date: string | null;
  weekday: string | null;
  status: string | null;
  student_class_id?: string | null;
  student_class_name?: string | null;
  student_sector_id?: number | null;
  student_sector_code?: string | null;
  student_sector_name?: string | null;
  students?: {
    class_id?: string | null;
  } | null;
};

type SummaryMetrics = {
  academic_year: string;
  total_weeks: number;
  sectors: number;
  classes: number;
  students: number;
  teachers: number;
};

type SectorMetrics = {
  sector: string;
  total_classes: number;
  total_students: number;
  total_teachers: number;
  attendance_avg: number | null;
  study_avg: number | null;
};

type SectorMetricsWithOrder = SectorMetrics & { key: string; order: number };

const SUPABASE_STUDENTS_PAGE_SIZE = 1000;
const SUPABASE_ATTENDANCE_PAGE_SIZE = 1000;

type SummaryCardLinks = {
  classes?: string;
  students?: string;
  teachers?: string;
};

const SUMMARY_CARD_LINKS: Record<AppRole, SummaryCardLinks> = {
  admin: {
    classes: "/classes",
    students: "/students",
    teachers: "/users",
  },
  sector_leader: {
    classes: "/classes",
    students: "/students",
  },
  catechist: {
    students: "/students",
  },
};

const DEFAULT_SECTOR_IDENTIFIERS: SectorIdentifier[] = [
  { key: "CHIEN", label: "Chiên con", order: 0 },
  { key: "AU", label: "Ấu nhi", order: 1 },
  { key: "THIEU", label: "Thiếu nhi", order: 2 },
  { key: "NGHIA", label: "Nghĩa sĩ", order: 3 },
];

const KNOWN_SECTOR_KEYS = new Set(DEFAULT_SECTOR_IDENTIFIERS.map((identifier) => identifier.key));

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function resolveSectorIdentifier(
  ...candidates: Array<string | null | undefined>
): SectorIdentifier | null {
  let fallback: SectorIdentifier | null = null;

  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    const normalized = normalizeText(trimmed);
    if (!normalized) continue;

    if (normalized.includes("CHIEN")) {
      return { key: "CHIEN", label: "Chiên con", order: 0 };
    }
    if (normalized.includes("NGHIA")) {
      return { key: "NGHIA", label: "Nghĩa sĩ", order: 3 };
    }
    if (normalized.includes("THIEU")) {
      return { key: "THIEU", label: "Thiếu nhi", order: 2 };
    }
    if (normalized.includes("AU")) {
      return { key: "AU", label: "Ấu nhi", order: 1 };
    }

    if (!fallback) {
      fallback = { key: normalized, label: trimmed, order: 900 };
    }
  }

  return fallback;
}

function registerSector(
  sectorMeta: Map<string, SectorMeta>,
  sectorAccumulators: Map<string, SectorAccumulator>,
  key: string,
  label?: string,
  order?: number,
) {
  const existingMeta = sectorMeta.get(key);
  if (!existingMeta) {
    sectorMeta.set(key, { label: label ?? key, order: order ?? 999 });
  } else {
    if (label && existingMeta.label !== label && existingMeta.label !== key) {
      sectorMeta.set(key, { label, order: existingMeta.order });
    }
    if (typeof order === "number" && order < existingMeta.order) {
      sectorMeta.set(key, { label: sectorMeta.get(key)?.label ?? label ?? key, order });
    }
  }

  if (!sectorAccumulators.has(key)) {
    sectorAccumulators.set(key, {
      total_classes: 0,
      total_students: 0,
      total_teachers: 0,
      attendanceSum: 0,
      attendanceCount: 0,
      studySum: 0,
      studyCount: 0,
    });
  }
}

function ensureSectorFromIdentifier(
  sectorMeta: Map<string, SectorMeta>,
  sectorAccumulators: Map<string, SectorAccumulator>,
  identifier: SectorIdentifier | null,
): string | null {
  if (!identifier) return null;
  registerSector(sectorMeta, sectorAccumulators, identifier.key, identifier.label, identifier.order);
  return identifier.key;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function calculateAttendanceAverage(
  hk1Present?: number | null,
  hk1Total?: number | null,
  hk2Present?: number | null,
  hk2Total?: number | null,
) {
  const totalSessions = (hk1Total ?? 0) + (hk2Total ?? 0);
  const totalPresent = (hk1Present ?? 0) + (hk2Present ?? 0);
  if (totalSessions === 0) return null;
  return Number(((totalPresent / totalSessions) * 10).toFixed(2));
}

function calculateCatechismAverage(
  s1_45min?: number | null,
  s1_exam?: number | null,
  s2_45min?: number | null,
  s2_exam?: number | null,
) {
  if (s1_45min == null && s1_exam == null && s2_45min == null && s2_exam == null) {
    return null;
  }
  const sum = (s1_45min || 0) + (s2_45min || 0) + (s1_exam || 0) * 2 + (s2_exam || 0) * 2;
  return Number((sum / 6).toFixed(2));
}

function sanitizeClassId(value?: string | null) {
  return (value ?? "").trim();
}

function normalizeClassId(value?: string | null) {
  return sanitizeClassId(value).toLowerCase();
}

async function fetchAllStudents(client: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const pageSize = SUPABASE_STUDENTS_PAGE_SIZE;
  const allRows: StudentRow[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from("students")
      .select(
        "id, class_id, academic_hk1_fortyfive, academic_hk1_exam, academic_hk2_fortyfive, academic_hk2_exam, attendance_hk1_present, attendance_hk1_total, attendance_hk2_present, attendance_hk2_total",
      )
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      console.warn("Dashboard students query fallback:", error.message ?? error);
      break;
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

async function fetchRecentAttendanceRecords(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  fromDateIso: string,
) {
  const pageSize = SUPABASE_ATTENDANCE_PAGE_SIZE;
  const allRows: AttendanceRecordRow[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from("attendance_records")
      .select(
        "student_id, event_date, weekday, status, student_class_id, student_class_name, student_sector_id, student_sector_code, student_sector_name, students(class_id)",
      )
      .gte("event_date", fromDateIso)
      .order("event_date", { ascending: false })
      .range(from, to);

    if (error) {
      console.warn("Dashboard attendance query fallback:", error.message ?? error);
      break;
    }

    const batch = (data as AttendanceRecordRow[] | null) ?? [];
    allRows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

// Get Vietnamese day of week
function getVietnameseWeekday(date: Date): string {
  const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return days[date.getDay()];
}

// Get Vietnamese month name
function getVietnameseMonth(date: Date): string {
  const months = [
    "Tháng Một", "Tháng Hai", "Tháng Ba", "Tháng Tư", "Tháng Năm", "Tháng Sáu",
    "Tháng Bảy", "Tháng Tám", "Tháng Chín", "Tháng Mười", "Tháng Mười Một", "Tháng Mười Hai"
  ];
  return months[date.getMonth()];
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const userScopePromise = resolveUserScope(supabase);

  // Get current user profile for greeting
  const { data: { user } } = await supabase.auth.getUser();
  const userProfile = user ? await supabase
    .from("user_profiles")
    .select("full_name, saint_name")
    .eq("id", user.id)
    .maybeSingle() : null;

  const userName = userProfile?.data?.full_name || userProfile?.data?.saint_name || "Người dùng";

  const [
    summaryResult,
    currentAcademicYearResult,
    sectorsCountResult,
    classesCountResult,
    studentsCountResult,
    usersCountResult,
    sectorsResult,
    classesResult,
    teachersResult,
  ] = await Promise.all([
    supabase.rpc("dashboard_summary").maybeSingle(),
    supabase
      .from("academic_years")
      .select("id, name, total_weeks, start_date, end_date, is_current")
      .eq("is_current", true)
      .maybeSingle(),
    supabase.from("sectors").select("id", { count: "exact", head: true }),
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("sectors").select("id, name, code"),
    supabase.from("classes").select("id, name, sector_id"),
    supabase.from("teachers").select("id, sector, class_id, class_name"),
  ]);

  const { role: currentRole } = await userScopePromise;

  const summaryData = summaryResult.data as Partial<SummaryMetrics> | null | undefined;
  const currentAcademicYear =
    currentAcademicYearResult.error || !currentAcademicYearResult.data
      ? null
      : ((currentAcademicYearResult.data as Partial<AcademicYear>) ?? null);

  const sectorRows = sectorsResult.error
    ? []
    : ((sectorsResult.data as SectorRow[] | null | undefined) ?? []);

  const classRows = classesResult.error
    ? []
    : ((classesResult.data as ClassRow[] | null | undefined) ?? []);

  const studentRows = await fetchAllStudents(supabase);

  const teacherRows = teachersResult.error
    ? []
    : ((teachersResult.data as TeacherRow[] | null | undefined) ?? []);

  const sectorMeta = new Map<string, SectorMeta>();
  const sectorAccumulators = new Map<string, SectorAccumulator>();

  DEFAULT_SECTOR_IDENTIFIERS.forEach((identifier) => {
    registerSector(sectorMeta, sectorAccumulators, identifier.key, identifier.label, identifier.order);
  });

  const sectorIdToKey = new Map<number, string>();

  sectorRows.forEach((sector) => {
    if (typeof sector.id !== "number") return;
    const identifier = resolveSectorIdentifier(sector.code, sector.name);
    const key = ensureSectorFromIdentifier(sectorMeta, sectorAccumulators, identifier);
    if (key) {
      sectorIdToKey.set(sector.id, key);
    }
  });

  const classIdToSectorKey = new Map<string, string>();

  classRows.forEach((cls) => {
    const classId = sanitizeClassId(cls.id);
    if (!classId) return;
    let sectorKey: string | null = null;
    if (typeof cls.sector_id === "number" && cls.sector_id !== null) {
      sectorKey = sectorIdToKey.get(cls.sector_id) ?? null;
    }
    const identifierFromName = resolveSectorIdentifier(cls.name);
    const recognizedIdentifier =
      identifierFromName && KNOWN_SECTOR_KEYS.has(identifierFromName.key) ? identifierFromName : null;
    if (!sectorKey && recognizedIdentifier) {
      sectorKey = ensureSectorFromIdentifier(sectorMeta, sectorAccumulators, recognizedIdentifier);
    }
    if (!sectorKey) {
      return;
    }
    registerSector(sectorMeta, sectorAccumulators, sectorKey);
    classIdToSectorKey.set(normalizeClassId(classId), sectorKey);
    const accumulator = sectorAccumulators.get(sectorKey);
    if (accumulator) {
      accumulator.total_classes += 1;
    }
  });

  studentRows.forEach((student) => {
    if (!student) return;
    const classId = sanitizeClassId(student.class_id);
    if (!classId) return;
    const sectorKey = classIdToSectorKey.get(normalizeClassId(classId));
    if (!sectorKey) return;

    registerSector(sectorMeta, sectorAccumulators, sectorKey);
    const accumulator = sectorAccumulators.get(sectorKey);
    if (!accumulator) return;

    accumulator.total_students += 1;

    const hk1Present = toNumberOrNull(student.attendance_hk1_present);
    const hk1Total = toNumberOrNull(student.attendance_hk1_total);
    const hk2Present = toNumberOrNull(student.attendance_hk2_present);
    const hk2Total = toNumberOrNull(student.attendance_hk2_total);

    const attendanceAvg = calculateAttendanceAverage(hk1Present, hk1Total, hk2Present, hk2Total);
    if (attendanceAvg != null) {
      accumulator.attendanceSum += attendanceAvg;
      accumulator.attendanceCount += 1;
    }

    const semester145 = toNumberOrNull(student.academic_hk1_fortyfive);
    const semester1Exam = toNumberOrNull(student.academic_hk1_exam);
    const semester245 = toNumberOrNull(student.academic_hk2_fortyfive);
    const semester2Exam = toNumberOrNull(student.academic_hk2_exam);

    const studyAvg = calculateCatechismAverage(semester145, semester1Exam, semester245, semester2Exam);
    if (studyAvg != null) {
      accumulator.studySum += studyAvg;
      accumulator.studyCount += 1;
    }
  });

  const teacherIdsBySector = new Map<string, Set<string>>();

  teacherRows.forEach((teacher) => {
    if (!teacher?.id) return;

    const identifier = resolveSectorIdentifier(teacher.sector, teacher.class_name, teacher.class_id);
    const recognizedIdentifier =
      identifier && KNOWN_SECTOR_KEYS.has(identifier.key) ? identifier : null;
    const sectorKey = ensureSectorFromIdentifier(sectorMeta, sectorAccumulators, recognizedIdentifier);
    if (!sectorKey) return;

    registerSector(sectorMeta, sectorAccumulators, sectorKey);
    const accumulator = sectorAccumulators.get(sectorKey);
    if (!accumulator) return;

    let teacherIds = teacherIdsBySector.get(sectorKey);
    if (!teacherIds) {
      teacherIds = new Set<string>();
      teacherIdsBySector.set(sectorKey, teacherIds);
    }

    if (!teacherIds.has(teacher.id)) {
      teacherIds.add(teacher.id);
      accumulator.total_teachers += 1;
    }
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const attendanceFromDateIso = sevenDaysAgo.toISOString().slice(0, 10);

  const attendanceRecords = await fetchRecentAttendanceRecords(supabase, attendanceFromDateIso);

  type AttendanceDailyAccumulator = {
    weekday: string;
    eventDate: string;
    presentCount: number;
  };

  const attendanceByDate = new Map<string, AttendanceDailyAccumulator>();

  attendanceRecords.forEach((record) => {
    if (!record?.event_date) return;
    const weekday = (record.weekday ?? "").trim() || "Khác";
    const key = `${weekday}|${record.event_date}`;
    let accumulator = attendanceByDate.get(key);
    if (!accumulator) {
      accumulator = {
        weekday,
        eventDate: record.event_date,
        presentCount: 0,
      };
      attendanceByDate.set(key, accumulator);
    }

    if ((record.status ?? "").toLowerCase() === "present") {
      accumulator.presentCount += 1;
    }
  });

  const attendanceSummaryByWeekday = new Map<
    string,
    { weekday: string; eventDate: string; present: number }
  >();

  attendanceByDate.forEach((daily) => {
    const existing = attendanceSummaryByWeekday.get(daily.weekday);
    if (!existing || daily.eventDate > existing.eventDate) {
      attendanceSummaryByWeekday.set(daily.weekday, {
        weekday: daily.weekday,
        eventDate: daily.eventDate,
        present: daily.presentCount,
      });
    }
  });

  const aggregatedSectors = Array.from(sectorAccumulators.entries())
    .map(([key, accumulator]) => {
      const meta = sectorMeta.get(key) ?? { label: key, order: 999 };
      const attendanceAvg =
        accumulator.attendanceCount > 0
          ? Number((accumulator.attendanceSum / accumulator.attendanceCount).toFixed(2))
          : null;
      const studyAvg =
        accumulator.studyCount > 0
          ? Number((accumulator.studySum / accumulator.studyCount).toFixed(2))
          : null;

      return {
        key,
        order: meta.order,
        sector: meta.label,
        total_classes: accumulator.total_classes,
        total_students: accumulator.total_students,
        total_teachers: accumulator.total_teachers,
        attendance_avg: attendanceAvg,
        study_avg: studyAvg,
      } satisfies SectorMetricsWithOrder;
    });

  const resolvedAcademicYearName =
    currentAcademicYear?.name ?? summaryData?.academic_year ?? "Chưa cập nhật";
  const resolvedTotalWeeks =
    (typeof currentAcademicYear?.total_weeks === "number" && Number.isFinite(currentAcademicYear.total_weeks)
      ? currentAcademicYear.total_weeks
      : null) ??
    summaryData?.total_weeks ??
    0;

  const baseSummary: SummaryMetrics = {
    academic_year: resolvedAcademicYearName,
    total_weeks: resolvedTotalWeeks,
    sectors: summaryData?.sectors ?? 0,
    classes: summaryData?.classes ?? 0,
    students: summaryData?.students ?? 0,
    teachers: summaryData?.teachers ?? 0,
  };

  const resolveCount = (
    result: { count: number | null; error: { message?: string } | null },
    fallback: number,
    label: string,
  ) => {
    if (result.error) {
      console.warn(`Dashboard ${label} count fallback:`, result.error.message ?? result.error);
      return fallback;
    }
    return typeof result.count === "number" ? result.count : fallback;
  };

  const resolvedSummary: SummaryMetrics = {
    ...baseSummary,
    sectors: resolveCount(sectorsCountResult, baseSummary.sectors, "sector"),
    classes: resolveCount(classesCountResult, baseSummary.classes, "class"),
    students: resolveCount(studentsCountResult, baseSummary.students, "student"),
    teachers: resolveCount(usersCountResult, baseSummary.teachers, "user"),
  };

  const cardLinks = SUMMARY_CARD_LINKS[currentRole] ?? SUMMARY_CARD_LINKS.catechist;

  const totalStudentsCount = Math.max(resolvedSummary.students, 0);

  const fallbackSectors: SectorMetricsWithOrder[] = DEFAULT_SECTOR_IDENTIFIERS.map((identifier) => ({
    key: identifier.key,
    order: identifier.order,
    sector: identifier.label,
    total_classes: 0,
    total_students: 0,
    total_teachers: 0,
    attendance_avg: null,
    study_avg: null,
  }));

  const resolvedSectors = (aggregatedSectors.length > 0 ? aggregatedSectors : fallbackSectors).sort(
    (a, b) => a.order - b.order || a.sector.localeCompare(b.sector),
  );

  const sectors: SectorMetrics[] = resolvedSectors.map(
    ({ sector, total_classes, total_students, total_teachers, attendance_avg, study_avg }) => ({
      sector,
      total_classes,
      total_students,
      total_teachers,
      attendance_avg,
      study_avg,
    }),
  );

  const DEFAULT_ATTENDANCE_SESSIONS = ["Thứ 5", "Chủ nhật"];

  const orderedAttendance = DEFAULT_ATTENDANCE_SESSIONS.map((session) => {
    const summary = attendanceSummaryByWeekday.get(session);
    const presentCount = summary?.present ?? 0;
    return {
      session: summary?.weekday ?? session,
      present: presentCount,
      pending: Math.max(totalStudentsCount - presentCount, 0),
    };
  });

  // Current date info
  const now = new Date();
  const dayOfMonth = now.getDate();
  const weekdayName = getVietnameseWeekday(now);
  const monthName = getVietnameseMonth(now);

  // Icons for stat cards
  const SectorsIcon = (
    <svg className="size-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );

  const ClassesIcon = (
    <svg className="size-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );

  const StudentsIcon = (
    <svg className="size-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  const TeachersIcon = (
    <svg className="size-4 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  // Sample alerts (in a real app, these would come from the database)
  const alerts = [
    {
      id: "1",
      title: "Báo cáo tuần 2 đã sẵn sàng",
      time: "2 giờ trước",
      source: "System",
      priority: "low" as const,
      processed: false,
    },
    {
      id: "2",
      title: "Báo cáo tuần 1 đã sẵn sàng",
      time: "2 tuần trước",
      source: "System",
      priority: "high" as const,
      processed: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-manrope text-[22px] text-[#5b5a64]">Chúc ngày tốt lành</p>
          <h1 className="font-manrope text-[42px] font-bold leading-tight tracking-tight text-black">
            Chào mừng, {userName}!
          </h1>
        </div>

        {/* Date & Notifications */}
        <div className="flex items-center gap-4">
          {/* Date Circle */}
          <div className="flex items-center gap-4">
            <div className="flex size-[92px] items-center justify-center rounded-full border-4 border-[#fa865e]/20">
              <span className="font-outfit text-[32px] text-black">{dayOfMonth}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-inter-tight text-base text-black">{weekdayName},</span>
              <span className="font-inter-tight text-lg text-black">{monthName}</span>
            </div>
          </div>

          {/* Separator */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Notification Button */}
          <Link
            href="/reports"
            className="rounded-full bg-[#fa865e] px-8 py-4 font-outfit text-base text-white transition hover:bg-[#e5764e]"
          >
            Xem thông báo
          </Link>

          {/* Calendar Icon */}
          <button className="flex size-14 items-center justify-center rounded-full border border-gray-200 bg-white">
            <svg className="size-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Tổng số ngành"
          value={resolvedSummary.sectors}
          variant="primary"
          icon={SectorsIcon}
        />
        <StatCard
          label="Tổng số lớp"
          value={resolvedSummary.classes}
          href={cardLinks.classes}
          icon={ClassesIcon}
        />
        <StatCard
          label="Tổng thiếu nhi"
          value={resolvedSummary.students}
          href={cardLinks.students}
          icon={StudentsIcon}
        />
        <StatCard
          label="Giáo lý viên"
          value={resolvedSummary.teachers}
          href={cardLinks.teachers}
          icon={TeachersIcon}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column - Notes Widget */}
        <div className="col-span-4">
          <NotesWidget
            classesTeaching={8}
            studentsInClasses={240}
            activitiesJoined="20/10"
            activityLocation="Tại nhà thờ"
            activityTime="14:00"
            completionPercentage={65}
            currentTask={{
              title: "Dạy Giáo Lý",
              time: "3:00",
              location: "Lớp Ấu nhi",
              room: "Phòng A2",
              status: "in_progress",
            }}
          />
        </div>

        {/* Middle Column - Weekly Plan Widget */}
        <div className="col-span-4">
          <WeeklyPlanWidget
            weekNumber={3}
            activitiesCount={3}
            progress={{
              completed: 100,
              inProgress: 50,
              pending: 0,
            }}
          />
        </div>

        {/* Right Column - Sector Stats Widget */}
        <div className="col-span-4 row-span-2">
          <SectorStatsWidget
            sectors={sectors.map((s) => ({
              sector: s.sector,
              totalClasses: s.total_classes,
              totalStudents: s.total_students,
              totalTeachers: s.total_teachers,
              attendanceAvg: s.attendance_avg,
              studyAvg: s.study_avg,
            }))}
          />
        </div>

        {/* Attendance Widget */}
        <div className="col-span-4">
          <AttendanceWidget sessions={orderedAttendance} />
        </div>

        {/* Alerts Widget */}
        <div className="col-span-4">
          <AlertsWidget alerts={alerts} />
        </div>
      </div>

      {/* Academic Year Info */}
      <div className="rounded-lg border border-[#fa865e]/20 bg-[#fa865e]/5 px-4 py-3 text-sm text-[#fa865e]">
        <p>Năm học hiện tại: {resolvedSummary.academic_year} | Tổng số tuần: {resolvedSummary.total_weeks}</p>
      </div>
    </div>
  );
}
