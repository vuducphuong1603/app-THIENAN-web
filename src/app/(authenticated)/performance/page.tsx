import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClassRow, SectorRow } from "@/lib/queries/supabase";
import PerformanceContent from "./performance-content";
import { MAX_CHART_POINTS, SECTOR_KEYS, SECTOR_METADATA, WEEKDAY_METADATA } from "./constants";
import type {
  ChartDataPoint,
  ClassBreakdown,
  ClassBreakdownEntry,
  NormalizedWeekday,
  PerformancePageData,
  SectorKey,
} from "./types";

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

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type SectorTotals = { [K in SectorKey]: number };

type ClassInfo = {
  id: string;
  name: string;
  sectorKey: SectorKey;
};

const ATTENDANCE_LOOKBACK_DAYS = 120;
const SUPABASE_ATTENDANCE_PAGE_SIZE = 1000;

const weekLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export default async function PerformancePage() {
  const supabase = await createSupabaseServerClient();

  const [classesResult, sectorsResult] = await Promise.all([
    supabase.from("classes").select("id, name, sector_id, sector, sector_code, sector_name, branch, branch_name"),
    supabase.from("sectors").select("id, name, code"),
  ]);

  const sectorRows = sectorsResult.error
    ? []
    : ((sectorsResult.data as SectorRow[] | null | undefined) ?? []);
  if (sectorsResult.error) {
    console.warn("Performance page sectors query fallback:", sectorsResult.error.message ?? sectorsResult.error);
  }

  const classRows = classesResult.error
    ? []
    : ((classesResult.data as ClassRow[] | null | undefined) ?? []);
  if (classesResult.error) {
    console.warn("Performance page classes query fallback:", classesResult.error.message ?? classesResult.error);
  }

  const sectorKeyById = buildSectorKeyById(sectorRows);
  const classInfoById = buildClassInfoById(classRows, sectorKeyById);

  const attendanceFromDateIso = computeFromDateIso(ATTENDANCE_LOOKBACK_DAYS);
  const attendanceRecords = await fetchAttendanceRecords(supabase, attendanceFromDateIso);

  const performanceData = aggregateAttendance(attendanceRecords, classInfoById);

  const pageData: PerformancePageData = {
    charts: {
      sunday: performanceData.sundayChart,
      thursday: performanceData.thursdayChart,
    },
    classBreakdowns: performanceData.classBreakdowns,
  };

  return <PerformanceContent data={pageData} />;
}

function computeFromDateIso(daysBack: number) {
  const today = new Date();
  today.setUTCDate(today.getUTCDate() - daysBack);
  today.setUTCHours(0, 0, 0, 0);
  return today.toISOString().slice(0, 10);
}

function buildSectorKeyById(sectors: SectorRow[]) {
  const map = new Map<number, SectorKey>();
  sectors.forEach((sector) => {
    if (typeof sector.id !== "number") {
      return;
    }
    const sectorKey = detectSectorKey(sector.code, sector.name);
    if (sectorKey) {
      map.set(sector.id, sectorKey);
    }
  });
  return map;
}

function buildClassInfoById(classRows: ClassRow[], sectorKeyById: Map<number, SectorKey>) {
  const infos = new Map<string, ClassInfo>();

  classRows.forEach((cls) => {
    const classId = sanitizeClassId(cls.id);
    const normalizedId = normalizeClassId(classId);
    if (!classId || !normalizedId) {
      return;
    }

    const sectorKeyFromId =
      typeof cls.sector_id === "number" ? sectorKeyById.get(cls.sector_id) ?? null : null;

    const sectorKey =
      sectorKeyFromId ??
      detectSectorKey(
        cls.sector_code,
        cls.sector_name,
        cls.sector,
        cls.branch,
        cls.branch_name,
        cls.name,
      );

    if (!sectorKey) {
      return;
    }

    const displayName = (cls.name ?? "").trim() || classId;

    infos.set(normalizedId, {
      id: classId,
      name: displayName,
      sectorKey,
    });
  });

  return infos;
}

function detectSectorKey(...candidates: Array<string | null | undefined>): SectorKey | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeText(candidate);
    if (!normalized) continue;
    if (normalized.includes("CHIEN")) {
      return "chien";
    }
    if (normalized.includes("NGHIA")) {
      return "nghia";
    }
    if (normalized.includes("THIEU")) {
      return "thieu";
    }
    if (normalized.includes("AU")) {
      return "au";
    }
  }

  return null;
}

function normalizeWeekday(value?: string | null): NormalizedWeekday | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.includes("SUNDAY") || normalized.includes("CHUNHAT") || normalized === "CN" || normalized === "SUN") {
    return "sunday";
  }
  if (
    normalized.includes("THURSDAY") ||
    normalized.includes("THUNAM") ||
    normalized.includes("THU5") ||
    normalized === "T5"
  ) {
    return "thursday";
  }
  return null;
}

function isPresentStatus(status?: string | null) {
  if (!status) {
    return false;
  }
  const normalized = normalizeText(status);
  if (!normalized) {
    return false;
  }
  if (
    normalized === "PRESENT" ||
    normalized === "YES" ||
    normalized === "TRUE" ||
    normalized === "1" ||
    normalized === "ATTENDED" ||
    normalized === "ATTEND" ||
    normalized === "CO" ||
    normalized === "X"
  ) {
    return true;
  }
  if (
    normalized === "ABSENT" ||
    normalized === "NO" ||
    normalized === "FALSE" ||
    normalized === "0" ||
    normalized === "VANG" ||
    normalized === "NGHI"
  ) {
    return false;
  }
  return normalized === "P"; // fallback for shorthand
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function sanitizeClassId(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function normalizeClassId(value?: string | null) {
  const sanitized = sanitizeClassId(value);
  return sanitized ? sanitized.toLowerCase() : null;
}

function formatWeekLabel(eventDate: string) {
  try {
    return weekLabelFormatter.format(new Date(`${eventDate}T00:00:00Z`));
  } catch {
    return eventDate;
  }
}

function formatFullDateLabel(eventDate: string) {
  try {
    return fullDateFormatter.format(new Date(`${eventDate}T00:00:00Z`));
  } catch {
    return eventDate;
  }
}

function createEmptySectorTotals(): SectorTotals {
  return {
    chien: 0,
    au: 0,
    thieu: 0,
    nghia: 0,
  };
}

function aggregateAttendance(records: AttendanceRecordRow[], classInfoById: Map<string, ClassInfo>) {
  const chartTotals: Record<NormalizedWeekday, Map<string, SectorTotals>> = {
    sunday: new Map(),
    thursday: new Map(),
  };

  const classTotals = new Map<string, Map<string, ClassBreakdownEntry>>();

  records.forEach((record) => {
    if (!record?.event_date) {
      return;
    }
    const normalizedWeekday = normalizeWeekday(record.weekday);
    if (!normalizedWeekday) {
      return;
    }
    const rawClassId = sanitizeClassId(record.student_class_id ?? record.students?.class_id);
    const normalizedClassId = normalizeClassId(rawClassId);
    if (!normalizedClassId) {
      return;
    }

    let classInfo = classInfoById.get(normalizedClassId);
    if (!classInfo) {
      const fallbackSectorKey = detectSectorKey(
        record.student_sector_code,
        record.student_sector_name,
        record.student_class_name,
      );
      if (!fallbackSectorKey) {
        return;
      }
      const fallbackClassName =
        (record.student_class_name ?? "").trim() ||
        rawClassId ||
        normalizedClassId;
      classInfo = {
        id: rawClassId ?? normalizedClassId,
        name: fallbackClassName,
        sectorKey: fallbackSectorKey,
      };
      classInfoById.set(normalizedClassId, classInfo);
    }

    if (!isPresentStatus(record.status)) {
      return;
    }

    const weekdayTotals = chartTotals[normalizedWeekday];
    let totals = weekdayTotals.get(record.event_date);
    if (!totals) {
      totals = createEmptySectorTotals();
      weekdayTotals.set(record.event_date, totals);
    }
    totals[classInfo.sectorKey] += 1;

    const breakdownKey = `${normalizedWeekday}|${record.event_date}|${classInfo.sectorKey}`;
    let classMap = classTotals.get(breakdownKey);
    if (!classMap) {
      classMap = new Map<string, ClassBreakdownEntry>();
      classTotals.set(breakdownKey, classMap);
    }

    let entry = classMap.get(classInfo.id);
    if (!entry) {
      entry = { classId: classInfo.id, className: classInfo.name, present: 0 };
      classMap.set(classInfo.id, entry);
    }
    entry.present += 1;
  });

  const sundayChart = convertChartMapToArray(chartTotals.sunday);
  const thursdayChart = convertChartMapToArray(chartTotals.thursday);
  const classBreakdowns = convertClassBreakdowns(classTotals);

  return { sundayChart, thursdayChart, classBreakdowns };
}

function convertChartMapToArray(source: Map<string, SectorTotals>): ChartDataPoint[] {
  const sortedDates = Array.from(source.keys()).sort();
  const recentDates = sortedDates.slice(-MAX_CHART_POINTS);
  return recentDates.map((eventDate) => {
    const totals = source.get(eventDate) ?? createEmptySectorTotals();
    const chartTotals = SECTOR_KEYS.reduce((acc, key) => acc + (totals[key] ?? 0), 0);
    return {
      eventDate,
      week: formatWeekLabel(eventDate),
      chien: totals.chien ?? 0,
      au: totals.au ?? 0,
      thieu: totals.thieu ?? 0,
      nghia: totals.nghia ?? 0,
      total: chartTotals,
    };
  });
}

function convertClassBreakdowns(
  source: Map<string, Map<string, ClassBreakdownEntry>>,
): ClassBreakdown[] {
  const breakdowns: ClassBreakdown[] = [];

  source.forEach((classMap, key) => {
    const [weekdayKey, eventDate, sectorKey] = key.split("|") as [
      NormalizedWeekday,
      string,
      SectorKey,
    ];

    const classes = Array.from(classMap.values()).sort((a, b) => {
      if (b.present !== a.present) {
        return b.present - a.present;
      }
      return a.className.localeCompare(b.className, "vi");
    });

    breakdowns.push({
      sectorKey,
      weekday: weekdayKey,
      eventDate,
      label: formatFullDateLabel(eventDate),
      classes,
    });
  });

  breakdowns.sort((a, b) => {
    if (a.eventDate !== b.eventDate) {
      return a.eventDate > b.eventDate ? -1 : 1;
    }
    if (a.weekday !== b.weekday) {
      return WEEKDAY_METADATA[a.weekday].order - WEEKDAY_METADATA[b.weekday].order;
    }
    return SECTOR_METADATA[a.sectorKey].order - SECTOR_METADATA[b.sectorKey].order;
  });

  return breakdowns;
}

async function fetchAttendanceRecords(
  client: SupabaseServerClient,
  fromDateIso: string,
): Promise<AttendanceRecordRow[]> {
  const rows: AttendanceRecordRow[] = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_ATTENDANCE_PAGE_SIZE - 1;
    const { data, error } = await client
      .from("attendance_records")
      .select(
        "student_id, event_date, weekday, status, student_class_id, student_class_name, student_sector_id, student_sector_code, student_sector_name, students(class_id)",
      )
      .gte("event_date", fromDateIso)
      .order("event_date", { ascending: true })
      .order("student_id", { ascending: true })
      .range(from, to);

    if (error) {
      console.warn("Performance page attendance query fallback:", error.message ?? error);
      break;
    }

    const batch = (data as AttendanceRecordRow[] | null) ?? [];
    rows.push(...batch);

    if (batch.length < SUPABASE_ATTENDANCE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_ATTENDANCE_PAGE_SIZE;
  }

  return rows;
}
