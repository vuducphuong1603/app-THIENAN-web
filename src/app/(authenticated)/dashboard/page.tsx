import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  code?: string | null;
  sector_id?: number | null;
  sector?: string | null;
  sector_code?: string | null;
  sector_name?: string | null;
  branch?: string | null;
  branch_code?: string | null;
  branch_name?: string | null;
};

type StudentRow = {
  id: string;
  status?: string | null;
  class_id?: string | null;
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

type UserProfileRow = {
  id: string;
  role?: string | null;
  status?: string | null;
  sector?: string | null;
  class_id?: string | null;
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

const DEFAULT_SECTOR_IDENTIFIERS: SectorIdentifier[] = [
  { key: "CHIEN", label: "Chiên", order: 0 },
  { key: "AU", label: "Ấu", order: 1 },
  { key: "THIEU", label: "Thiếu", order: 2 },
  { key: "NGHIA", label: "Nghĩa", order: 3 },
];

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
      return { key: "CHIEN", label: "Chiên", order: 0 };
    }
    if (normalized.includes("NGHIA")) {
      return { key: "NGHIA", label: "Nghĩa", order: 3 };
    }
    if (normalized.includes("THIEU")) {
      return { key: "THIEU", label: "Thiếu", order: 2 };
    }
    if (normalized.includes("AU")) {
      return { key: "AU", label: "Ấu", order: 1 };
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

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [
    summaryResult,
    sectorsCountResult,
    classesCountResult,
    studentsCountResult,
    usersCountResult,
    sectorsResult,
    classesResult,
    studentsResult,
    teachersResult,
  ] = await Promise.all([
    supabase.rpc("dashboard_summary").maybeSingle(),
    supabase.from("sectors").select("id", { count: "exact", head: true }),
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("sectors").select("id, name, code"),
    supabase.from("classes").select(
      "id, name, code, sector_id, sector, sector_code, sector_name, branch, branch_code, branch_name",
    ),
    supabase.from("students").select(
      "id, status, class_id, academic_hk1_fortyfive, academic_hk1_exam, academic_hk2_fortyfive, academic_hk2_exam, attendance_hk1_present, attendance_hk1_total, attendance_hk2_present, attendance_hk2_total, attendance_thursday_present, attendance_thursday_total, attendance_sunday_present, attendance_sunday_total",
    ),
    supabase.from("user_profiles").select("id, role, status, sector, class_id"),
  ]);

  const summaryData = summaryResult.data as Partial<SummaryMetrics> | null | undefined;
  const sectorRows = sectorsResult.error
    ? []
    : ((sectorsResult.data as SectorRow[] | null | undefined) ?? []);
  if (sectorsResult.error) {
    console.warn("Dashboard sectors query fallback:", sectorsResult.error.message ?? sectorsResult.error);
  }

  const classRows = classesResult.error
    ? []
    : ((classesResult.data as ClassRow[] | null | undefined) ?? []);
  if (classesResult.error) {
    console.warn("Dashboard classes query fallback:", classesResult.error.message ?? classesResult.error);
  }

  const studentRows = studentsResult.error
    ? []
    : ((studentsResult.data as StudentRow[] | null | undefined) ?? []);
  if (studentsResult.error) {
    console.warn("Dashboard students query fallback:", studentsResult.error.message ?? studentsResult.error);
  }

  const teacherProfiles = teachersResult.error
    ? []
    : ((teachersResult.data as UserProfileRow[] | null | undefined) ?? []);
  if (teachersResult.error) {
    console.warn("Dashboard teacher profiles query fallback:", teachersResult.error.message ?? teachersResult.error);
  }

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
    if (!cls.id) return;
    let sectorKey: string | null = null;
    if (typeof cls.sector_id === "number" && cls.sector_id !== null) {
      sectorKey = sectorIdToKey.get(cls.sector_id) ?? null;
    }
    if (!sectorKey) {
      const identifier = resolveSectorIdentifier(
        cls.sector_code,
        cls.sector_name,
        cls.sector,
        cls.branch_code,
        cls.branch_name,
        cls.branch,
        cls.name,
        cls.code,
      );
      sectorKey = ensureSectorFromIdentifier(sectorMeta, sectorAccumulators, identifier);
    }
    if (!sectorKey) {
      return;
    }
    registerSector(sectorMeta, sectorAccumulators, sectorKey);
    classIdToSectorKey.set(cls.id, sectorKey);
    const accumulator = sectorAccumulators.get(sectorKey);
    if (accumulator) {
      accumulator.total_classes += 1;
    }
  });

  studentRows.forEach((student) => {
    if (!student || student.status === "DELETED") {
      return;
    }
    if (!student.class_id) {
      return;
    }
    const sectorKey = classIdToSectorKey.get(student.class_id);
    if (!sectorKey) {
      return;
    }

    registerSector(sectorMeta, sectorAccumulators, sectorKey);
    const accumulator = sectorAccumulators.get(sectorKey);
    if (!accumulator) {
      return;
    }

    accumulator.total_students += 1;

    const hk1Present =
      toNumberOrNull(student.attendance_hk1_present) ??
      toNumberOrNull(student.attendance_thursday_present);
    const hk1Total =
      toNumberOrNull(student.attendance_hk1_total) ?? toNumberOrNull(student.attendance_thursday_total);
    const hk2Present =
      toNumberOrNull(student.attendance_hk2_present) ?? toNumberOrNull(student.attendance_sunday_present);
    const hk2Total =
      toNumberOrNull(student.attendance_hk2_total) ?? toNumberOrNull(student.attendance_sunday_total);

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

  teacherProfiles.forEach((profile) => {
    if (!profile?.id) return;
    if (profile.role !== "giao_ly_vien") return;
    if (profile.status && profile.status !== "ACTIVE") return;

    let sectorKey: string | null = null;

    if (profile.class_id) {
      sectorKey = classIdToSectorKey.get(profile.class_id) ?? null;
    }

    if (!sectorKey) {
      const identifier = resolveSectorIdentifier(profile.sector);
      sectorKey = ensureSectorFromIdentifier(sectorMeta, sectorAccumulators, identifier);
    }

    if (!sectorKey) {
      return;
    }

    registerSector(sectorMeta, sectorAccumulators, sectorKey);

    const accumulator = sectorAccumulators.get(sectorKey);
    if (!accumulator) {
      return;
    }

    let teacherIds = teacherIdsBySector.get(sectorKey);
    if (!teacherIds) {
      teacherIds = new Set<string>();
      teacherIdsBySector.set(sectorKey, teacherIds);
    }

    if (!teacherIds.has(profile.id)) {
      teacherIds.add(profile.id);
      accumulator.total_teachers += 1;
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

  const baseSummary: SummaryMetrics = {
    academic_year: summaryData?.academic_year ?? "Chưa cập nhật",
    total_weeks: summaryData?.total_weeks ?? 0,
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
    sectors: resolveCount(
      sectorsCountResult,
      baseSummary.sectors,
      "sector",
    ),
    classes: resolveCount(
      classesCountResult,
      baseSummary.classes,
      "class",
    ),
    students: resolveCount(
      studentsCountResult,
      baseSummary.students,
      "student",
    ),
    teachers: resolveCount(
      usersCountResult,
      baseSummary.teachers,
      "user",
    ),
  };

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

  const attendance = [
    { session: "Thứ 5", present: 210, pending: 18 },
    { session: "Chủ nhật", present: 298, pending: 4 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Chào mừng,</p>
          <h2 className="text-2xl font-semibold text-slate-900">Thiếu Nhi Thiên Ân!</h2>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p>Năm học hiện tại: {resolvedSummary.academic_year}</p>
          <p>Tổng số tuần: {resolvedSummary.total_weeks}</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng số ngành",
            value: resolvedSummary.sectors,
          },
          {
            label: "Tổng số lớp",
            value: resolvedSummary.classes,
            href: "/classes",
          },
          {
            label: "Tổng thiếu nhi",
            value: resolvedSummary.students,
            href: "/students",
          },
          {
            label: "Giáo lý viên",
            value: resolvedSummary.teachers,
            href: "/users",
          },
        ].map((card) => {
          const baseClasses =
            "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition";
          const interactiveClasses =
            "hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

          if (card.href) {
            return (
              <Link
                key={card.label}
                href={card.href}
                className={`${baseClasses} ${interactiveClasses}`}
              >
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{card.value}</p>
              </Link>
            );
          }

          return (
            <div key={card.label} className={baseClasses}>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{card.value}</p>
            </div>
          );
        })}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Thống kê theo ngành</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sectors.map((sector) => (
            <div key={sector.sector} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-800">{sector.sector}</p>
                <p className="text-xs text-slate-500">{sector.total_classes} lớp</p>
              </div>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>Số thiếu nhi: {sector.total_students}</p>
                <p>Giáo lý viên: {sector.total_teachers}</p>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>
                  Điểm danh TB:
                  <span className="font-semibold text-emerald-700">
                    {" "}
                    {sector.attendance_avg != null ? sector.attendance_avg : "-"}
                  </span>
                </p>
                <p>
                  Học tập TB:
                  <span className="font-semibold text-emerald-700">
                    {" "}
                    {sector.study_avg != null ? sector.study_avg : "-"}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Điểm danh 7 ngày qua</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {attendance.map((item) => (
            <div key={item.session} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-base font-semibold text-slate-800">{item.session}</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-emerald-700">Có mặt: {item.present}</p>
                <p className="text-slate-500">Chưa điểm danh: {item.pending}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
