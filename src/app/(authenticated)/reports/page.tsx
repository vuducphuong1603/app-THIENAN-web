"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import clsx from "clsx";

import { resolveUserScope, normalizeClassId, sanitizeClassId, type UserClassScope } from "@/lib/auth/user-scope";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchAttendanceRecordsForStudents,
  fetchClasses,
  fetchStudentsByClass,
  fetchStudentScoreDetails,
  type AttendanceRecordRow,
  type ClassRow,
  type StudentBasicRow,
  type StudentScoreDetailRow,
} from "@/lib/queries/supabase";
import { fetchAcademicYears } from "@/lib/queries/academic-years";
import {
  normalizeText,
  toNumberOrNull,
  isPresentStatus,
  calculateBulkAttendanceScores,
  calculateCatechismAverage,
  calculateTotalScore,
} from "@/lib/calculations/attendance-score";
import type { Sector } from "@/types/database";
import AttendanceReportPreview, {
  type AttendanceReportPreviewData,
  type AttendancePreviewRow,
  type NormalizedPreviewWeekday,
} from "./attendance-report-preview";
import ScoreReportPreview, {
  SCORE_COLUMN_DEFINITIONS,
  type ScoreColumnId,
  type ScoreReportPreviewData,
} from "./score-report-preview";

type WeekOption = {
  value: string;
  optionLabel: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
};

type TimeMode = "week" | "date";
type AttendanceSessionFilter = "all" | "thursday" | "sunday";

const DEFAULT_WEEK_COUNT = 12;

const ATTENDANCE_SESSION_OPTIONS: Array<{ value: AttendanceSessionFilter; label: string }> = [
  { value: "all", label: "Tất cả buổi" },
  { value: "thursday", label: "Thứ 5" },
  { value: "sunday", label: "Chủ nhật" },
];

const VI_DAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const SECTORS: Sector[] = ["CHIÊN", "ẤU", "THIẾU", "NGHĨA"];
const SECTOR_LABELS: Record<Sector, string> = {
  "CHIÊN": "Chiên",
  "ẤU": "Ấu",
  "THIẾU": "Thiếu",
  "NGHĨA": "Nghĩa",
};

const TIME_MODES: TimeMode[] = ["week", "date"];
const TIME_MODE_LABELS: Record<TimeMode, string> = {
  week: "Theo tuần",
  date: "Theo ngày",
};

const SECTOR_ID_TO_SECTOR: Record<number, Sector> = {
  1: "CHIÊN",
  2: "ẤU",
  3: "THIẾU",
  4: "NGHĨA",
};

type ClassOption = {
  value: string;
  label: string;
};

type ClassOptionWithSector = ClassOption & {
  sector: Sector | null;
};

const DEFAULT_SCORE_COLUMN_IDS: ScoreColumnId[] = SCORE_COLUMN_DEFINITIONS.map(
  (definition) => definition.id,
);

function getToggleButtonClasses(isActive: boolean, isDisabled?: boolean) {
  const base = "rounded-full border px-3 py-1 text-xs font-medium transition";
  if (isDisabled) {
    return `${base} border-slate-200 text-slate-400 opacity-60 cursor-not-allowed`;
  }
  return isActive
    ? `${base} border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm`
    : `${base} border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800`;
}

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function generateWeekOptions(referenceDate = new Date(), count = DEFAULT_WEEK_COUNT): WeekOption[] {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 });

  return Array.from({ length: count }, (_, index) => {
    const weekStart = subWeeks(start, index);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const startIso = toIsoDate(weekStart);
    const endIso = toIsoDate(weekEnd);

    return {
      value: startIso,
      optionLabel: `${VI_DAY_LABELS[weekStart.getDay()]} ${format(weekStart, "dd/MM/yyyy")} - ${VI_DAY_LABELS[weekEnd.getDay()]} ${format(weekEnd, "dd/MM/yyyy")}`,
      rangeLabel: `${format(weekStart, "dd/MM/yyyy")} - ${format(weekEnd, "dd/MM/yyyy")}`,
      startDate: startIso,
      endDate: endIso,
    };
  });
}

function getDefaultDateRange() {
  const start = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });
  return {
    from: toIsoDate(start),
    to: toIsoDate(end),
  };
}

function formatIsoDateLabel(value?: string) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return format(parsed, "dd/MM/yyyy");
}

function resolveSectorFromCandidates(...candidates: Array<string | null | undefined>): Sector | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeText(candidate);
    if (normalized.includes("CHIEN")) return "CHIÊN";
    if (normalized.includes("NGHIA")) return "NGHĨA";
    if (normalized.includes("THIEU")) return "THIẾU";
    if (normalized.includes("AU")) return "ẤU";
  }
  return null;
}

function inferClassSector(cls: ClassRow): Sector | null {
  if (typeof cls.sector_id === "number") {
    const resolvedFromId = SECTOR_ID_TO_SECTOR[cls.sector_id];
    if (resolvedFromId) {
      return resolvedFromId;
    }
  }

  return (
    resolveSectorFromCandidates(
      cls.sector,
      cls.sector_code,
      cls.sector_name,
      cls.branch,
      cls.branch_code,
      cls.branch_name,
      cls.name,
      cls.code,
    ) ?? null
  );
}

type ResolveDateRangeArgs = {
  timeMode: TimeMode;
  activeWeek?: WeekOption;
  selectedFromDate?: string;
  selectedToDate?: string;
};

function resolveDateRange({
  timeMode,
  activeWeek,
  selectedFromDate,
  selectedToDate,
}: ResolveDateRangeArgs) {
  if (timeMode === "week") {
    return {
      startDate: activeWeek?.startDate,
      endDate: activeWeek?.endDate,
    };
  }

  const from = selectedFromDate && selectedFromDate.trim().length > 0 ? selectedFromDate : undefined;
  const to = selectedToDate && selectedToDate.trim().length > 0 ? selectedToDate : undefined;

  return {
    startDate: from,
    endDate: to,
  };
}

type BuildAttendancePreviewArgs = {
  students: StudentBasicRow[];
  attendanceRecords: AttendanceRecordRow[];
  className: string;
  startDate: string;
  endDate: string;
};

function buildAttendancePreviewData({
  students,
  attendanceRecords,
  className,
  startDate,
  endDate,
}: BuildAttendancePreviewArgs): AttendanceReportPreviewData {
  const dateMeta = new Map<
    string,
    {
      normalizedWeekday: NormalizedPreviewWeekday;
      weekdayLabel: string;
    }
  >();
  const statusesByStudent = new Map<string, Map<string, "present" | "absent">>();

  attendanceRecords.forEach((record) => {
    const studentId = record.student_id?.trim();
    const eventDate = record.event_date?.slice(0, 10);

    if (!studentId || !eventDate) {
      return;
    }

    const normalizedWeekday = resolveNormalizedWeekday(record.weekday, eventDate);
    if (!dateMeta.has(eventDate)) {
      dateMeta.set(eventDate, {
        normalizedWeekday,
        weekdayLabel: buildWeekdayLabel(normalizedWeekday),
      });
    }

    let statusMap = statusesByStudent.get(studentId);
    if (!statusMap) {
      statusMap = new Map();
      statusesByStudent.set(studentId, statusMap);
    }

    const isPresent = isPresentStatus(record.status);
    const existing = statusMap.get(eventDate);

    if (existing === "present") {
      return;
    }

    if (isPresent) {
      statusMap.set(eventDate, "present");
    } else if (!existing) {
      statusMap.set(eventDate, "absent");
    }
  });

  const sortedDates = Array.from(dateMeta.keys()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const columns = sortedDates.map((isoDate) => {
    const meta = dateMeta.get(isoDate);
    const normalizedWeekday = meta?.normalizedWeekday ?? "other";
    return {
      isoDate,
      displayDate: formatShortDateLabel(isoDate),
      weekdayLabel: meta?.weekdayLabel ?? buildWeekdayLabel(normalizedWeekday),
      normalizedWeekday,
    };
  });

  let thursdayPresent = 0;
  let sundayPresent = 0;
  let totalPresent = 0;

  statusesByStudent.forEach((dateMap) => {
    dateMap.forEach((status, isoDate) => {
      if (status !== "present") {
        return;
      }
      const normalizedWeekday = dateMeta.get(isoDate)?.normalizedWeekday ?? resolveNormalizedWeekday(null, isoDate);
      if (normalizedWeekday === "thursday") {
        thursdayPresent += 1;
      } else if (normalizedWeekday === "sunday") {
        sundayPresent += 1;
      }
      totalPresent += 1;
    });
  });

  const rows = students.map((student) => {
    const statusMap = statusesByStudent.get(student.id) ?? new Map<string, "present" | "absent">();
    const statuses: Record<string, "present" | "absent" | "unmarked"> = {};
    statusMap.forEach((value, isoDate) => {
      statuses[isoDate] = value;
    });

    return {
      studentId: student.id,
      saintName: student.saint_name,
      firstName: student.first_name,
      lastName: student.last_name,
      fullName: student.full_name,
      statuses,
    };
  });

  const missingCount = students.reduce((accumulator, student) => {
    const statusMap = statusesByStudent.get(student.id);
    if (!statusMap || statusMap.size === 0) {
      return accumulator + 1;
    }
    return accumulator;
  }, 0);

  return {
    className,
    dateRangeLabel: buildRangeLabel(startDate, endDate),
    generatedAtLabel: formatGeneratedAtLabel(new Date()),
    startDate,
    endDate,
    columns,
    rows,
    summary: {
      thursdayPresent,
      sundayPresent,
      missingCount,
      totalMarks: totalPresent,
      totalStudents: students.length,
    },
  };
}

function filterAttendancePreviewBySession(
  preview: AttendanceReportPreviewData | null,
  filter: AttendanceSessionFilter,
): AttendanceReportPreviewData | null {
  if (!preview) {
    return null;
  }

  if (filter === "all") {
    return preview;
  }

  const allowedWeekday: NormalizedPreviewWeekday = filter === "thursday" ? "thursday" : "sunday";
  const filteredColumns = preview.columns.filter((column) => column.normalizedWeekday === allowedWeekday);

  if (filteredColumns.length === preview.columns.length) {
    return preview;
  }

  let thursdayPresent = 0;
  let sundayPresent = 0;

  filteredColumns.forEach((column) => {
    const isoDate = column.isoDate;
    preview.rows.forEach((row) => {
      if (row.statuses[isoDate] === "present") {
        if (column.normalizedWeekday === "thursday") {
          thursdayPresent += 1;
        } else if (column.normalizedWeekday === "sunday") {
          sundayPresent += 1;
        }
      }
    });
  });

  return {
    ...preview,
    columns: filteredColumns,
    summary: {
      ...preview.summary,
      thursdayPresent,
      sundayPresent,
      totalMarks: thursdayPresent + sundayPresent,
    },
  };
}

type BuildScoreReportArgs = {
  students: StudentBasicRow[];
  scoreDetails: StudentScoreDetailRow[];
  attendanceRecords: AttendanceRecordRow[];
  className: string;
  startDate?: string;
  endDate?: string;
  totalWeeks: number;
};

function buildScoreReportPreviewData({
  students,
  scoreDetails,
  attendanceRecords,
  className,
  startDate,
  endDate,
  totalWeeks,
}: BuildScoreReportArgs): ScoreReportPreviewData {
  const detailById = new Map<string, StudentScoreDetailRow>();
  scoreDetails.forEach((detail) => {
    if (detail && detail.id) {
      detailById.set(detail.id, detail);
    }
  });

  // Use the new week-based calculation
  const attendanceScoresByStudent = calculateBulkAttendanceScores(attendanceRecords, totalWeeks);

  const tieBreaker = new Intl.Collator("vi", { sensitivity: "base" });

  const rows = students.map((student) => {
    const detail = detailById.get(student.id);
    const attendanceResult = attendanceScoresByStudent.get(student.id.trim());

    // Week-based counts
    const weeksWithThursday = attendanceResult?.weeksWithThursday ?? 0;
    const weeksWithSunday = attendanceResult?.weeksWithSunday ?? 0;
    const attendanceAverage = attendanceResult?.score ?? null;

    const attendance: ScoreReportPreviewData["rows"][number]["attendance"] = {
      thursdayPresent: weeksWithThursday,
      thursdayTotal: totalWeeks,
      thursdayScore: null, // No longer calculated separately
      sundayPresent: weeksWithSunday,
      sundayTotal: totalWeeks,
      sundayScore: null, // No longer calculated separately
      averageScore: attendanceAverage,
    };

    const semester145 = toNumberOrNull(detail?.academic_hk1_fortyfive);
    const semester1Exam = toNumberOrNull(detail?.academic_hk1_exam);
    const semester245 = toNumberOrNull(detail?.academic_hk2_fortyfive);
    const semester2Exam = toNumberOrNull(detail?.academic_hk2_exam);

    const catechismAvg = calculateCatechismAverage(semester145, semester1Exam, semester245, semester2Exam);

    const catechism: ScoreReportPreviewData["rows"][number]["catechism"] = {
      semester145,
      semester1Exam,
      semester245,
      semester2Exam,
      average: catechismAvg,
    };

    const totalScore = calculateTotalScore(catechismAvg, attendanceAverage);

    return {
      studentId: student.id,
      saintName: student.saint_name,
      fullName: student.full_name,
      className,
      attendance,
      catechism,
      totalScore,
      rank: null as number | null,
      result: null as string | null,
    };
  });

  const rankById = new Map<string, number>();
  const rankingCandidates = rows
    .filter((row) => typeof row.totalScore === "number" && Number.isFinite(row.totalScore))
    .sort((a, b) => {
      const scoreDelta = (b.totalScore ?? 0) - (a.totalScore ?? 0);
      if (Math.abs(scoreDelta) > Number.EPSILON) {
        return scoreDelta;
      }
      const nameA = a.fullName ?? "";
      const nameB = b.fullName ?? "";
      return tieBreaker.compare(nameA, nameB);
    });

  let previousScore: number | null = null;
  let currentRank = 0;
  rankingCandidates.forEach((row, index) => {
    if (previousScore === null || row.totalScore !== previousScore) {
      currentRank = index + 1;
      previousScore = row.totalScore ?? null;
    }
    rankById.set(row.studentId, currentRank);
  });

  rows.forEach((row) => {
    row.rank = rankById.get(row.studentId) ?? null;
  });

  const sortedRows = rows.slice().sort((a, b) => {
    const hasScoreA = typeof a.totalScore === "number" && Number.isFinite(a.totalScore);
    const hasScoreB = typeof b.totalScore === "number" && Number.isFinite(b.totalScore);

    if (hasScoreA && hasScoreB) {
      const scoreDelta = (b.totalScore! - a.totalScore!);
      if (Math.abs(scoreDelta) > Number.EPSILON) {
        return scoreDelta;
      }
      const nameCompare = tieBreaker.compare(a.fullName ?? "", b.fullName ?? "");
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return a.studentId.localeCompare(b.studentId);
    }

    if (hasScoreA) {
      return -1;
    }
    if (hasScoreB) {
      return 1;
    }

    const nameCompare = tieBreaker.compare(a.fullName ?? "", b.fullName ?? "");
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return a.studentId.localeCompare(b.studentId);
  });

  const resolvedStart = startDate?.trim() ? startDate : undefined;
  const resolvedEnd = endDate?.trim() ? endDate : undefined;

  let dateRangeLabel = "Không xác định";
  if (resolvedStart && resolvedEnd) {
    dateRangeLabel = buildRangeLabel(resolvedStart, resolvedEnd);
  } else if (resolvedStart) {
    dateRangeLabel = buildRangeLabel(resolvedStart, resolvedStart);
  } else if (resolvedEnd) {
    dateRangeLabel = buildRangeLabel(resolvedEnd, resolvedEnd);
  }

  return {
    className,
    dateRangeLabel,
    generatedAtLabel: formatGeneratedAtLabel(new Date()),
    startDate: resolvedStart,
    endDate: resolvedEnd,
    rows: sortedRows,
    summary: {
      thursdaySessions: totalWeeks,
      sundaySessions: totalWeeks,
      totalSessions: totalWeeks,
    },
  };
}

function resolveNormalizedWeekday(
  weekday?: string | null,
  eventDate?: string | null,
): NormalizedPreviewWeekday {
  if (weekday) {
    const normalized = normalizeText(weekday);
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
  }

  if (eventDate) {
    const parsed = new Date(`${eventDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const weekdayIndex = parsed.getUTCDay();
      if (weekdayIndex === 0) {
        return "sunday";
      }
      if (weekdayIndex === 4) {
        return "thursday";
      }
    }
  }

  return "other";
}

function buildWeekdayLabel(weekday: NormalizedPreviewWeekday) {
  switch (weekday) {
    case "thursday":
      return "Thứ 5";
    case "sunday":
      return "Chủ nhật";
    default:
      return "Khác";
  }
}

function formatShortDateLabel(value: string) {
  if (!value) return "";
  try {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return format(parsed, "dd/MM");
  } catch {
    return value;
  }
}

function formatGeneratedAtLabel(date: Date) {
  try {
    return format(date, "dd/MM/yyyy HH:mm");
  } catch {
    return date.toLocaleString("vi-VN");
  }
}

function buildRangeLabel(startDate: string, endDate: string) {
  const startLabel = formatIsoDateLabel(startDate);
  const endLabel = formatIsoDateLabel(endDate);

  if (startDate === endDate) {
    return startLabel || endLabel || "Không xác định";
  }

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }

  return startLabel || endLabel || "Không xác định";
}

const COLOR_PROPERTIES_FOR_EXPORT = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
] as const;

const UNSUPPORTED_COLOR_FUNCTION_PREFIXES = ["oklch(", "oklab(", "lab(", "color("] as const;
const COLOR_FUNCTION_UNSUPPORTED_REGEX = /color\(\s*(?:oklch|oklab|lab)\b/i;

type ColorPropertyName = (typeof COLOR_PROPERTIES_FOR_EXPORT)[number];
type RgbTriple = [number, number, number];

type ColorOverrideRecord = {
  element: HTMLElement | SVGElement;
  property: string;
  previousValue: string;
  previousPriority: string;
  hadInlineValue: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function linearToSrgbChannel(value: number) {
  const clamped = clamp(value, 0, 1);
  if (clamped <= 0.0031308) {
    return clamped * 12.92;
  }
  return 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function formatRgbColor(rgb: RgbTriple, alpha: number) {
  const [r, g, b] = rgb.map((channel) => Math.round(clamp01(channel) * 255));
  const normalizedAlpha = clamp01(alpha);
  if (normalizedAlpha >= 0.999) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  const alphaString = (Math.round(normalizedAlpha * 1000) / 1000).toString().replace(/0+$/, "").replace(/\.$/, "");
  return `rgba(${r}, ${g}, ${b}, ${alphaString})`;
}

function parseAlphaChannel(raw?: string | null) {
  if (!raw) {
    return 1;
  }
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "none") {
    return 1;
  }
  if (trimmed.endsWith("%")) {
    const value = parseFloat(trimmed.slice(0, -1));
    if (Number.isNaN(value)) {
      return 1;
    }
    return clamp01(value / 100);
  }
  const numeric = parseFloat(trimmed);
  if (Number.isNaN(numeric)) {
    return 1;
  }
  return clamp01(numeric);
}

function parseAngle(raw: string) {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.endsWith("deg")) {
    return (parseFloat(trimmed.slice(0, -3)) * Math.PI) / 180;
  }
  if (trimmed.endsWith("rad")) {
    return parseFloat(trimmed.slice(0, -3));
  }
  if (trimmed.endsWith("turn")) {
    return parseFloat(trimmed.slice(0, -4)) * 2 * Math.PI;
  }
  if (trimmed.endsWith("grad")) {
    return (parseFloat(trimmed.slice(0, -4)) * Math.PI) / 200;
  }
  return (parseFloat(trimmed) * Math.PI) / 180;
}

function labToRgb(l: number, a: number, b: number): RgbTriple | null {
  if ([l, a, b].some((value) => Number.isNaN(value))) {
    return null;
  }
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;

  const fx3 = fx ** 3;
  const fy3 = fy ** 3;
  const fz3 = fz ** 3;

  const xr = fx3 > epsilon ? fx3 : (116 * fx - 16) / kappa;
  const yr = l > kappa * epsilon ? fy3 : l / kappa;
  const zr = fz3 > epsilon ? fz3 : (116 * fz - 16) / kappa;

  const x = xr * 95.047 / 100;
  const y = yr * 100.0 / 100;
  const z = zr * 108.883 / 100;

  const rLinear = x * 3.2406 + y * -1.5372 + z * -0.4986;
  const gLinear = x * -0.9689 + y * 1.8758 + z * 0.0415;
  const bLinear = x * 0.0557 + y * -0.2040 + z * 1.0570;

  return [
    linearToSrgbChannel(rLinear),
    linearToSrgbChannel(gLinear),
    linearToSrgbChannel(bLinear),
  ];
}

function oklabToRgb(l: number, a: number, b: number): RgbTriple | null {
  if ([l, a, b].some((value) => Number.isNaN(value))) {
    return null;
  }

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const rLinear = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return [
    linearToSrgbChannel(rLinear),
    linearToSrgbChannel(gLinear),
    linearToSrgbChannel(bLinear),
  ];
}

function convertLabColorValue(raw: string) {
  const match = raw.match(/lab\((.*)\)/i);
  if (!match) {
    return null;
  }
  const [componentPart, alphaPart] = match[1].split("/");
  const components = componentPart.trim().split(/\s+/);
  if (components.length < 3) {
    return null;
  }
  const l = parseFloat(components[0]);
  const a = parseFloat(components[1]);
  const b = parseFloat(components[2]);
  const alpha = parseAlphaChannel(alphaPart);
  const rgb = labToRgb(l, a, b);
  if (!rgb) {
    return null;
  }
  return formatRgbColor(rgb, alpha);
}

function convertOklabColorValue(raw: string) {
  const match = raw.match(/oklab\((.*)\)/i);
  if (!match) {
    return null;
  }
  const [componentPart, alphaPart] = match[1].split("/");
  const components = componentPart.trim().split(/\s+/);
  if (components.length < 3) {
    return null;
  }
  const lRaw = components[0];
  const l = lRaw.endsWith("%") ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
  const a = parseFloat(components[1]);
  const b = parseFloat(components[2]);
  const alpha = parseAlphaChannel(alphaPart);
  const rgb = oklabToRgb(l, a, b);
  if (!rgb) {
    return null;
  }
  return formatRgbColor(rgb, alpha);
}

function convertOklchColorValue(raw: string) {
  const match = raw.match(/oklch\((.*)\)/i);
  if (!match) {
    return null;
  }
  const [componentPart, alphaPart] = match[1].split("/");
  const components = componentPart.trim().split(/\s+/);
  if (components.length < 3) {
    return null;
  }
  const lRaw = components[0];
  const l = lRaw.endsWith("%") ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
  const c = parseFloat(components[1]);
  const angle = parseAngle(components[2]);
  if ([l, c, angle].some((value) => Number.isNaN(value))) {
    return null;
  }
  const alpha = parseAlphaChannel(alphaPart);
  const a = c * Math.cos(angle);
  const b = c * Math.sin(angle);
  const rgb = oklabToRgb(l, a, b);
  if (!rgb) {
    return null;
  }
  return formatRgbColor(rgb, alpha);
}

function convertColorFunctionValue(raw: string) {
  const match = raw.match(/color\((.*)\)/i);
  if (!match) {
    return null;
  }
  const inner = match[1].trim();
  if (!inner) {
    return null;
  }
  let spaceEnd = 0;
  while (spaceEnd < inner.length) {
    const char = inner[spaceEnd];
    if (char === " " || char === "\t" || char === "\n" || char === "\r" || char === "/") {
      break;
    }
    spaceEnd += 1;
  }
  if (spaceEnd === 0) {
    return null;
  }
  const space = inner.slice(0, spaceEnd).toLowerCase();
  const remainder = inner.slice(spaceEnd).trim();
  if (!remainder) {
    return null;
  }
  let componentPart = remainder;
  let alphaPart: string | undefined;
  const slashIndex = remainder.indexOf("/");
  if (slashIndex !== -1) {
    componentPart = remainder.slice(0, slashIndex).trim();
    alphaPart = remainder.slice(slashIndex + 1).trim();
  }
  if (!componentPart) {
    return null;
  }
  const normalizedAlpha = alphaPart ? ` / ${alphaPart}` : "";
  const normalizedComponent = componentPart.trim();
  if (!normalizedComponent) {
    return null;
  }
  if (space === "lab") {
    return convertLabColorValue(`lab(${normalizedComponent}${normalizedAlpha})`);
  }
  if (space === "oklab") {
    return convertOklabColorValue(`oklab(${normalizedComponent}${normalizedAlpha})`);
  }
  if (space === "oklch") {
    return convertOklchColorValue(`oklch(${normalizedComponent}${normalizedAlpha})`);
  }
  return null;
}

function convertUnsupportedCssColor(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("lab(")) {
    return convertLabColorValue(trimmed);
  }
  if (lower.startsWith("oklab(")) {
    return convertOklabColorValue(trimmed);
  }
  if (lower.startsWith("oklch(")) {
    return convertOklchColorValue(trimmed);
  }
  if (lower.startsWith("color(")) {
    return convertColorFunctionValue(trimmed);
  }
  return null;
}

function containsUnsupportedColorFunction(value: string) {
  if (!value) {
    return false;
  }
  const lower = value.toLowerCase();
  for (const prefix of UNSUPPORTED_COLOR_FUNCTION_PREFIXES) {
    if (prefix === "color(") {
      if (COLOR_FUNCTION_UNSUPPORTED_REGEX.test(lower)) {
        return true;
      }
      continue;
    }
    if (lower.includes(prefix)) {
      return true;
    }
  }
  return false;
}

function findColorFunctionEnd(value: string, openIndex: number) {
  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function replaceUnsupportedColorFunctions(value: string) {
  const lower = value.toLowerCase();
  let cursor = 0;
  let result = "";
  let hasChanges = false;

  while (cursor < value.length) {
    let nextIndex = Number.POSITIVE_INFINITY;
    let matchedPrefix: (typeof UNSUPPORTED_COLOR_FUNCTION_PREFIXES)[number] | null = null;

    for (const prefix of UNSUPPORTED_COLOR_FUNCTION_PREFIXES) {
      const index = lower.indexOf(prefix, cursor);
      if (index !== -1 && index < nextIndex) {
        nextIndex = index;
        matchedPrefix = prefix;
      }
    }

    if (matchedPrefix == null) {
      result += value.slice(cursor);
      break;
    }

    result += value.slice(cursor, nextIndex);
    const openIndex = nextIndex + matchedPrefix.length - 1;
    const endIndex = findColorFunctionEnd(value, openIndex);
    if (endIndex === -1) {
      result += value.slice(nextIndex);
      break;
    }

    const raw = value.slice(nextIndex, endIndex + 1);
    const converted = convertUnsupportedCssColor(raw);
    if (converted) {
      result += converted;
      hasChanges = true;
    } else {
      result += raw;
    }
    cursor = endIndex + 1;
  }

  return hasChanges ? result : value;
}

function collectElementsForDocumentSanitization(doc: Document) {
  const elements: Element[] = [];
  const seen = new Set<Element>();
  const pushUnique = (element: Element | null) => {
    if (element && !seen.has(element)) {
      seen.add(element);
      elements.push(element);
    }
  };

  pushUnique(doc.documentElement);
  pushUnique(doc.body);
  const root = doc.querySelector<HTMLElement>("[data-report-export-root]");
  if (root) {
    pushUnique(root);
    root.querySelectorAll("*").forEach((element) => {
      pushUnique(element);
    });
  }
  if (doc.body) {
    doc.body.querySelectorAll("*").forEach((element) => {
      pushUnique(element);
    });
  }

  return elements;
}

function collectElementsForSubtreeSanitization(root: HTMLElement) {
  const elements: Element[] = [];
  const seen = new Set<Element>();
  const pushUnique = (element: Element | null) => {
    if (element && !seen.has(element)) {
      seen.add(element);
      elements.push(element);
    }
  };

  pushUnique(root);
  root.querySelectorAll("*").forEach((element) => {
    pushUnique(element);
  });

  return elements;
}

function sanitizeColorElements(
  elements: Element[],
  view: Window,
  { recordOverrides }: { recordOverrides: boolean },
) {
  const overrides: ColorOverrideRecord[] = [];

  elements.forEach((element) => {
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
      return;
    }
    const computed = view.getComputedStyle(element);
    const processed = new Set<string>();

    const processProperty = (property: string | null) => {
      if (!property || processed.has(property)) {
        return;
      }
      processed.add(property);
      const value = computed.getPropertyValue(property);
      if (!containsUnsupportedColorFunction(value)) {
        return;
      }
      const sanitized = replaceUnsupportedColorFunctions(value);
      if (sanitized === value) {
        return;
      }

      const style = element.style;
      let previousValue = "";
      let previousPriority = "";
      let hadInlineValue = false;

      if (recordOverrides) {
        previousValue = style.getPropertyValue(property);
        previousPriority = style.getPropertyPriority(property);
        hadInlineValue = Boolean(previousValue) || Boolean(previousPriority);
      }

      style.setProperty(property, sanitized, "important");

      if (recordOverrides) {
        overrides.push({
          element,
          property,
          previousValue,
          previousPriority,
          hadInlineValue,
        });
      }
    };

    COLOR_PROPERTIES_FOR_EXPORT.forEach((property: ColorPropertyName) => {
      processProperty(property);
    });
    for (let index = 0; index < computed.length; index += 1) {
      processProperty(computed.item(index));
    }
  });

  return overrides;
}

function sanitizeCloneColors(doc: Document) {
  const view = doc.defaultView;
  if (!view) {
    return;
  }

  doc
    .querySelectorAll<HTMLElement>("[data-export-hide-on-image='true']")
    .forEach((element) => {
      element.style.setProperty("display", "none", "important");
    });

  const elements = collectElementsForDocumentSanitization(doc);
  sanitizeColorElements(elements, view, { recordOverrides: false });
}

function applyColorSanitization(root: HTMLElement) {
  const view = root.ownerDocument?.defaultView;
  if (!view) {
    return () => {};
  }

  const elements = collectElementsForSubtreeSanitization(root);
  const overrides = sanitizeColorElements(elements, view, { recordOverrides: true });

  return () => {
    for (let index = overrides.length - 1; index >= 0; index -= 1) {
      const override = overrides[index];
      const { element, property, previousPriority, previousValue, hadInlineValue } = override;
      if (hadInlineValue) {
        element.style.setProperty(property, previousValue, previousPriority);
      } else {
        element.style.removeProperty(property);
      }
    }
  };
}

type WorksheetBuildResult = {
  data: (string | number)[][];
  columnWidths: Array<{ wch: number }>;
};

function buildAttendanceWorksheetData(preview: AttendanceReportPreviewData): WorksheetBuildResult {
  const header = [
    "STT",
    "Tên thánh",
    "Họ",
    "Tên",
    ...preview.columns.map((column) => `${column.weekdayLabel} ${column.displayDate}`),
  ];

  const rows = preview.rows.map((row, index) => {
    const names = deriveNameParts(row);
    const statuses = preview.columns.map((column) =>
      row.statuses[column.isoDate] === "present" ? "X" : "",
    );

    return [
      index + 1,
      row.saintName ?? "",
      names.lastName,
      names.firstName,
      ...statuses,
    ];
  });

  const data: (string | number)[][] = [
    [`Báo cáo điểm danh - Lớp ${preview.className}`],
    [`Khoảng thời gian: ${preview.dateRangeLabel}`],
    [],
    header,
    ...rows,
    [],
    ["Có mặt Thứ 5", preview.summary.thursdayPresent],
    ["Có mặt Chủ nhật", preview.summary.sundayPresent],
    ["Học sinh chưa điểm danh", preview.summary.missingCount],
    ["Tổng lượt điểm danh", preview.summary.totalMarks],
    ["Tổng số học sinh", preview.summary.totalStudents],
  ];

  const baseColumns = [
    { wch: 5 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
  ];

  const dynamicColumns = preview.columns.map(() => ({ wch: 12 }));

  return {
    data,
    columnWidths: [...baseColumns, ...dynamicColumns],
  };
}

function buildScoreWorksheetData(
  preview: ScoreReportPreviewData,
  visibleColumns?: ScoreColumnId[],
): WorksheetBuildResult {
  const resolvedColumns = Array.isArray(visibleColumns) ? visibleColumns : DEFAULT_SCORE_COLUMN_IDS;
  const visibleSet = new Set<ScoreColumnId>(resolvedColumns);
  const orderedVisibleColumns = SCORE_COLUMN_DEFINITIONS.filter((definition) =>
    visibleSet.has(definition.id),
  );

  const header = [
    "STT",
    "Tên thánh",
    "Họ và tên",
    "Lớp",
    ...orderedVisibleColumns.map((column) => column.headerLabel),
    "Hạng",
    "Kết quả",
  ];

  const rows = preview.rows.map((row, index) => {
    const dynamicValues = orderedVisibleColumns.map((column) => column.getRawValue(row) ?? "");
    return [
      index + 1,
      row.saintName ?? "",
      row.fullName ?? "",
      row.className ?? preview.className,
      ...dynamicValues,
      row.rank ?? "",
      row.result ?? "",
    ];
  });

  const data: (string | number)[][] = [
    ["Báo cáo điểm số - Lớp " + preview.className],
    ["Khoảng thời gian: " + preview.dateRangeLabel],
    [],
    header,
    ...rows,
    [],
    ["Tổng buổi Thứ 5", preview.summary.thursdaySessions],
    ["Tổng buổi Chủ nhật", preview.summary.sundaySessions],
    ["Tổng số buổi", preview.summary.totalSessions],
    ["Tổng số thiếu nhi", preview.rows.length],
  ];

  const columnWidths = [
    { wch: 5 },
    { wch: 18 },
    { wch: 26 },
    { wch: 12 },
    ...orderedVisibleColumns.map((column) => ({ wch: column.worksheetWidth })),
    { wch: 8 },
    { wch: 12 },
  ];

  return {
    data,
    columnWidths,
  };
}

function deriveNameParts(row: Pick<AttendancePreviewRow, "firstName" | "lastName" | "fullName">) {
  const trimmedFullName = row.fullName?.trim() ?? "";
  let firstName = row.firstName?.trim() ?? "";
  let lastName = row.lastName?.trim() ?? "";

  if (!trimmedFullName) {
    const fallback = [lastName, firstName].filter(Boolean).join(" ").trim();
    return {
      fullName: fallback,
      firstName,
      lastName,
    };
  }

  const fullName = trimmedFullName;

  if (!firstName) {
    const parts = fullName.split(/\s+/);
    firstName = parts.pop() ?? "";
    lastName = parts.join(" ").trim();
  } else if (!lastName) {
    const lowerFull = fullName.toLowerCase();
    const lowerFirst = firstName.toLowerCase();
    if (lowerFull.endsWith(lowerFirst)) {
      lastName = fullName.slice(0, fullName.length - firstName.length).trim();
    }
  }

  if (!lastName) {
    const parts = fullName.split(/\s+/);
    if (parts.length > 1) {
      lastName = parts.slice(0, -1).join(" ").trim();
    } else {
      lastName = fullName;
    }
  }

  return {
    fullName,
    firstName,
    lastName,
  };
}

type BuildReportFilenameArgs = {
  reportType: "attendance" | "score";
  className: string;
  startDate?: string;
  endDate?: string;
  extension: "png" | "xlsx";
};

function buildReportFilename({ reportType, className, startDate, endDate, extension }: BuildReportFilenameArgs) {
  const classSegment = slugifyForFilename(className);
  const startSegment = startDate ? startDate.replace(/-/g, "") : null;
  const endSegment = endDate ? endDate.replace(/-/g, "") : null;
  const rangeSegment =
    startSegment && endSegment
      ? startSegment === endSegment
        ? startSegment
      : `${startSegment}-${endSegment}`
      : null;
  const timestamp = format(new Date(), "yyyyMMdd_HHmmss");

  const prefix = reportType === "attendance" ? "bao-cao-diem-danh" : "bao-cao-diem-so";
  const parts = [prefix, classSegment, rangeSegment ?? timestamp];
  const filename = parts.filter(Boolean).join("_");
  return `${filename}.${extension}`;
}

function slugifyForFilename(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "lop";
}

export default function ReportsPage() {
  const { supabase } = useAuth();
  const [userScope, setUserScope] = useState<UserClassScope | null>(null);
  const [isLoadingScope, setIsLoadingScope] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadScope = async () => {
      setIsLoadingScope(true);
      const scope = await resolveUserScope(supabase);
      if (!mounted) {
        return;
      }
      setUserScope(scope);
      setIsLoadingScope(false);
    };

    loadScope().catch((error) => {
      console.warn("Failed to load user scope for reports page", error);
      if (mounted) {
        setUserScope({ role: "catechist", assignedClassId: null });
        setIsLoadingScope(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const {
    data: classRows = [],
    isLoading: isLoadingClasses,
  } = useQuery<ClassRow[]>({
    queryKey: ["classes", "list"],
    queryFn: () => fetchClasses(supabase),
    enabled: !!supabase,
  });

  // Fetch academic years to get total_weeks for attendance calculation
  const { data: academicYears = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => fetchAcademicYears(supabase),
    enabled: !!supabase,
  });

  const totalWeeksForYear = useMemo(() => {
    const currentYear = academicYears.find((year) => year.is_current);
    return currentYear?.total_weeks ?? 0;
  }, [academicYears]);

  const sanitizedAssignedClassId = sanitizeClassId(userScope?.assignedClassId);
  const normalizedAssignedClassId = normalizeClassId(userScope?.assignedClassId);
  const isCatechist = userScope?.role === "catechist";
  const hasAssignedClass = sanitizedAssignedClassId.length > 0;
  const restrictClassSelection = Boolean(isCatechist);

  const classRowsForDisplay = useMemo(() => {
    if (!isCatechist) {
      return classRows;
    }

    if (!hasAssignedClass) {
      return [];
    }

    return classRows.filter((cls) => normalizeClassId(cls.id) === normalizedAssignedClassId);
  }, [classRows, isCatechist, hasAssignedClass, normalizedAssignedClassId]);

  const [timeMode, setTimeMode] = useState<TimeMode>("week");
  const [selectedType, setSelectedType] = useState("attendance");
  const weekOptions = useMemo(() => generateWeekOptions(), []);
  const defaultWeekValue = useMemo(() => {
    const fallback = weekOptions[0]?.value ?? "";
    const previousWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const previousWeekValue = toIsoDate(previousWeekStart);
    return weekOptions.some((option) => option.value === previousWeekValue) ? previousWeekValue : fallback;
  }, [weekOptions]);
  const [selectedWeekValue, setSelectedWeekValue] = useState(defaultWeekValue);
  const defaultDateRange = useMemo(() => getDefaultDateRange(), []);
  const [selectedFromDate, setSelectedFromDate] = useState(defaultDateRange.from);
  const [selectedToDate, setSelectedToDate] = useState(defaultDateRange.to);

  const activeWeek = useMemo(() => {
    if (weekOptions.length === 0) {
      return undefined;
    }
    const found = weekOptions.find((option) => option.value === selectedWeekValue);
    return found ?? weekOptions[0];
  }, [selectedWeekValue, weekOptions]);

  useEffect(() => {
    setSelectedWeekValue((prev) => (prev ? prev : defaultWeekValue));
  }, [defaultWeekValue]);

  useEffect(() => {
    if (timeMode !== "date") {
      return;
    }
    setSelectedFromDate((prev) => (prev ? prev : defaultDateRange.from));
    setSelectedToDate((prev) => {
      if (prev) {
        return prev;
      }
      return defaultDateRange.to;
    });
  }, [timeMode, defaultDateRange]);

  const timeSummary = useMemo(() => {
    if (timeMode === "date") {
      if (!selectedFromDate || !selectedToDate) {
        return "Chọn khoảng thời gian mong muốn.";
      }
      const fromLabel = formatIsoDateLabel(selectedFromDate);
      const toLabel = formatIsoDateLabel(selectedToDate);
      if (!fromLabel || !toLabel) {
        return "Chọn khoảng thời gian mong muốn.";
      }
      return `Khoảng thời gian: ${fromLabel} - ${toLabel}`;
    }
    if (activeWeek) {
      return `Khoảng thời gian: ${activeWeek.rangeLabel}`;
    }
    return "Chọn một tuần để xem khoảng thời gian.";
  }, [timeMode, activeWeek, selectedFromDate, selectedToDate]);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    classRows.forEach((cls) => {
      const trimmedId = cls.id?.trim();
      if (!trimmedId) {
        return;
      }
      const trimmedName = cls.name?.trim();
      const trimmedCode = cls.code?.trim();
      const displayName =
        (trimmedName && trimmedName.length > 0 ? trimmedName : null) ??
        (trimmedCode && trimmedCode.length > 0 ? trimmedCode : null) ??
        trimmedId;
      map.set(trimmedId, displayName);
    });
    return map;
  }, [classRows]);

  const classOptions = useMemo<ClassOptionWithSector[]>(() => {
    return classRowsForDisplay
      .map((cls) => {
        const trimmedId = cls.id?.trim();
        if (!trimmedId) {
          return null;
        }

        const trimmedName = cls.name?.trim();
        const trimmedCode = cls.code != null ? cls.code.toString().trim() : "";
        const displayLabel =
          (trimmedName && trimmedName.length > 0 ? trimmedName : null) ??
          (trimmedCode && trimmedCode.length > 0 ? trimmedCode : null) ??
          trimmedId;

        return {
          value: trimmedId,
          label: displayLabel,
          sector: inferClassSector(cls),
        };
      })
      .filter((value): value is ClassOptionWithSector => Boolean(value));
  }, [classRowsForDisplay]);

  const classesBySector = useMemo(() => {
    const initial: Record<Sector, ClassOption[]> = {
      "CHIÊN": [],
      "ẤU": [],
      "THIẾU": [],
      "NGHĨA": [],
    };
    const seen = new Set<string>();

    classOptions.forEach((option) => {
      if (!option.sector) {
        return;
      }
      const dedupeKey = `${option.sector}::${option.value}`;
      if (seen.has(dedupeKey)) {
        return;
      }
      seen.add(dedupeKey);
      initial[option.sector].push({ value: option.value, label: option.label });
    });

    (Object.values(initial) as ClassOption[][]).forEach((options) => {
      options.sort((a, b) => a.label.localeCompare(b.label, "vi", { sensitivity: "base" }));
    });

    return initial;
  }, [classOptions]);

  const assignedClassOption = useMemo(() => {
    if (!hasAssignedClass) {
      return null;
    }
    return (
      classOptions.find(
        (option) => normalizeClassId(option.value) === normalizedAssignedClassId,
      ) ?? null
    );
  }, [classOptions, hasAssignedClass, normalizedAssignedClassId]);

  const [selectedSector, setSelectedSector] = useState<Sector | "">("");
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
    if (!restrictClassSelection) {
      return;
    }

    if (!hasAssignedClass) {
      if (selectedSector !== "") {
        setSelectedSector("");
      }
      if (selectedClass !== "") {
        setSelectedClass("");
      }
      return;
    }

    if (assignedClassOption) {
      if (assignedClassOption.sector && selectedSector !== assignedClassOption.sector) {
        setSelectedSector(assignedClassOption.sector);
      }
      if (selectedClass !== assignedClassOption.value) {
        setSelectedClass(assignedClassOption.value);
      }
      return;
    }

    if (selectedClass !== sanitizedAssignedClassId) {
      setSelectedClass(sanitizedAssignedClassId);
    }
  }, [
    restrictClassSelection,
    hasAssignedClass,
    assignedClassOption,
    selectedSector,
    selectedClass,
    sanitizedAssignedClassId,
  ]);

  useEffect(() => {
    if (restrictClassSelection) {
      return;
    }
    if (!selectedSector) {
      if (selectedClass !== "") {
        setSelectedClass("");
      }
      return;
    }

    const options = classesBySector[selectedSector];
    if (selectedClass && !options.some((option) => option.value === selectedClass)) {
      setSelectedClass("");
    }
  }, [restrictClassSelection, selectedSector, classesBySector, selectedClass]);

  const sectorClassOptions = useMemo(() => {
    if (restrictClassSelection) {
      return classOptions
        .map(({ value, label }) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "vi", { sensitivity: "base" }));
    }

    return selectedSector ? classesBySector[selectedSector] : [];
  }, [restrictClassSelection, classOptions, selectedSector, classesBySector]);

  const isClassSelectDisabled = restrictClassSelection
    ? true
    : isLoadingScope || !selectedSector || isLoadingClasses || sectorClassOptions.length === 0;

  const classPlaceholder = restrictClassSelection
    ? hasAssignedClass
      ? "Lớp được phân"
      : "Chưa được phân lớp"
    : !selectedSector
      ? "Chọn ngành trước"
      : isLoadingClasses
        ? "Đang tải lớp..."
        : sectorClassOptions.length === 0
          ? "Không có lớp cho ngành này"
          : "Tất cả lớp";

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [attendancePreview, setAttendancePreview] = useState<AttendanceReportPreviewData | null>(null);
  const [attendanceSessionFilter, setAttendanceSessionFilter] = useState<AttendanceSessionFilter>("all");
  const [selectedScoreColumns, setSelectedScoreColumns] = useState<ScoreColumnId[]>(() => [
    ...DEFAULT_SCORE_COLUMN_IDS,
  ]);
  const [scorePreview, setScorePreview] = useState<ScoreReportPreviewData | null>(null);
  const [exportingMode, setExportingMode] = useState<"image" | "excel" | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const hasDateRange = useMemo(() => {
    if (timeMode === "week") {
      return Boolean(activeWeek?.startDate && activeWeek?.endDate);
    }
    return Boolean(selectedFromDate && selectedToDate);
  }, [timeMode, activeWeek, selectedFromDate, selectedToDate]);
  const attendancePreviewView = useMemo(
    () => filterAttendancePreviewBySession(attendancePreview, attendanceSessionFilter),
    [attendancePreview, attendanceSessionFilter],
  );
  const activePreview = selectedType === "attendance" ? attendancePreviewView : scorePreview;
  const isExportDisabled =
    isGeneratingReport || exportingMode !== null || !activePreview || activePreview.rows.length === 0;

  const handleResetReport = useCallback(() => {
    setAttendancePreview(null);
    setScorePreview(null);
    setReportError(null);
    setAttendanceSessionFilter("all");
    setSelectedScoreColumns([...DEFAULT_SCORE_COLUMN_IDS]);
  }, []);

  const handleGenerateReport = useCallback(async () => {
    const trimmedClassId = sanitizeClassId(selectedClass);

    if (!trimmedClassId) {
      setAttendancePreview(null);
      setScorePreview(null);
      setReportError(
        selectedType === "attendance"
          ? "Vui lòng chọn lớp để tạo báo cáo điểm danh."
          : "Vui lòng chọn lớp để tạo bảng điểm.",
      );
      return;
    }

    const { startDate, endDate } = resolveDateRange({
      timeMode,
      activeWeek,
      selectedFromDate,
      selectedToDate,
    });

    setIsGeneratingReport(true);
    setReportError(null);

    try {
      const students = await fetchStudentsByClass(supabase, trimmedClassId);
      const studentIds = students
        .map((student) => student.id?.trim())
        .filter((value): value is string => Boolean(value));

      if (selectedType === "attendance") {
        if (!startDate || !endDate) {
          setAttendancePreview(null);
          setScorePreview(null);
          setReportError("Khoảng thời gian chưa hợp lệ. Vui lòng chọn lại.");
          return;
        }

        const attendanceRecords =
          studentIds.length > 0
            ? await fetchAttendanceRecordsForStudents(supabase, studentIds, startDate, endDate)
            : [];

        const previewData = buildAttendancePreviewData({
          students,
          attendanceRecords,
          className: classNameById.get(trimmedClassId) ?? trimmedClassId,
          startDate,
          endDate,
        });

        setAttendancePreview(previewData);
        setScorePreview(null);
        return;
      }

      if (selectedType === "score") {
        const [scoreDetails, attendanceRecords] =
          studentIds.length > 0
            ? await Promise.all([
                fetchStudentScoreDetails(supabase, studentIds),
                fetchAttendanceRecordsForStudents(supabase, studentIds, startDate, endDate),
              ])
            : [[], []];

        const previewData = buildScoreReportPreviewData({
          students,
          scoreDetails,
          attendanceRecords,
          className: classNameById.get(trimmedClassId) ?? trimmedClassId,
          startDate,
          endDate,
          totalWeeks: totalWeeksForYear,
        });

        setScorePreview(previewData);
        setAttendancePreview(null);
        return;
      }
    } catch (error) {
      console.error("Failed to generate report preview:", error);
      setAttendancePreview(null);
      setScorePreview(null);
      setReportError("Không thể tạo báo cáo. Vui lòng thử lại sau.");
    } finally {
      setIsGeneratingReport(false);
    }
  }, [
    selectedType,
    selectedClass,
    timeMode,
    activeWeek,
    selectedFromDate,
    selectedToDate,
    supabase,
    classNameById,
    totalWeeksForYear,
  ]);

  const handleExportImage = useCallback(
    async (reportType: "attendance" | "score") => {
      const preview = reportType === "attendance" ? attendancePreviewView : scorePreview;

      if (!preview || preview.rows.length === 0) {
        window.alert("Không có dữ liệu để xuất.");
        return;
      }

      if (!previewContainerRef.current) {
        window.alert("Không tìm thấy nội dung báo cáo để xuất.");
        return;
      }

      let restoreColors: (() => void) | null = null;
      try {
        setExportingMode("image");
        try {
          restoreColors = applyColorSanitization(previewContainerRef.current);
        } catch (sanitizationError) {
          console.warn("Failed to sanitize colors before export:", sanitizationError);
        }
        const html2canvasModule = await import("html2canvas");
        const canvas = await html2canvasModule.default(previewContainerRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
          onclone: sanitizeCloneColors,
        });
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = buildReportFilename({
          reportType,
          className: preview.className,
          startDate: preview.startDate,
          endDate: preview.endDate,
          extension: "png",
        });
        link.click();
      } catch (error) {
        console.error("Failed to export report PNG:", error);
        window.alert("Xuất ảnh không thành công. Vui lòng thử lại.");
      } finally {
        if (restoreColors) {
          restoreColors();
        }
        setExportingMode(null);
      }
    },
    [attendancePreviewView, scorePreview],
  );

  const handleExportExcel = useCallback(
    async (reportType: "attendance" | "score") => {
      const preview = reportType === "attendance" ? attendancePreviewView : scorePreview;

      if (!preview || preview.rows.length === 0) {
        window.alert("Không có dữ liệu để xuất.");
        return;
      }

      try {
        setExportingMode("excel");
        const XLSX = await import("xlsx");
        const worksheetData =
          reportType === "attendance"
            ? buildAttendanceWorksheetData(preview as AttendanceReportPreviewData)
            : buildScoreWorksheetData(preview as ScoreReportPreviewData, selectedScoreColumns);
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData.data);
        worksheet["!cols"] = worksheetData.columnWidths;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          reportType === "attendance" ? "BaoCaoDiemDanh" : "BangDiem",
        );
        XLSX.writeFile(
          workbook,
          buildReportFilename({
            reportType,
            className: preview.className,
            startDate: preview.startDate,
            endDate: preview.endDate,
            extension: "xlsx",
          }),
          { compression: true },
        );
      } catch (error) {
        console.error("Failed to export report Excel:", error);
        window.alert("Xuất Excel không thành công. Vui lòng thử lại.");
      } finally {
        setExportingMode(null);
      }
    },
    [attendancePreviewView, scorePreview, selectedScoreColumns],
  );

  const isGenerateDisabled =
    isGeneratingReport ||
    isLoadingScope ||
    !selectedClass ||
    (selectedType === "attendance" && !hasDateRange);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Báo cáo</h2>
        <p className="text-sm text-slate-500">Tạo và xem trước báo cáo điểm danh, điểm số.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Tạo báo cáo mới</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="col-span-full flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Chọn thời gian:</span>
            <div className="flex flex-wrap gap-2">
              {TIME_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={getToggleButtonClasses(timeMode === mode)}
                  onClick={() => setTimeMode(mode)}
                  aria-pressed={timeMode === mode}
                >
                  {TIME_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
          {timeMode === "week" && (
            <div className="flex flex-col gap-1">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                value={selectedWeekValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedWeekValue(value || defaultWeekValue);
                }}
              >
                <option value="">Chọn tuần</option>
                {weekOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.optionLabel}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">{timeSummary}</span>
            </div>
          )}
          {timeMode === "date" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Từ ngày</label>
                <input
                  type="date"
                  lang="vi"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  value={selectedFromDate}
                  max={selectedToDate || undefined}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedFromDate(value);
                    setSelectedToDate((prev) => {
                      if (prev && value && value > prev) {
                        return value;
                      }
                      return prev;
                    });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Đến ngày</label>
                <input
                  type="date"
                  lang="vi"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  value={selectedToDate}
                  min={selectedFromDate || undefined}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedToDate(value);
                    setSelectedFromDate((prev) => {
                      if (prev && value && value < prev) {
                        return value;
                      }
                      return prev;
                    });
                  }}
                />
              </div>
              <div className="col-span-full">
                <span className="text-xs text-slate-500">{timeSummary}</span>
              </div>
            </>
          )}
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
          >
            <option value="attendance">Báo cáo điểm danh</option>
            <option value="score">Báo cáo điểm số</option>
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={selectedSector}
            onChange={(event) => {
              const value = event.target.value as Sector | "";
              setSelectedSector(value);
              setSelectedClass("");
            }}
            disabled={restrictClassSelection || isLoadingScope}
          >
            <option value="">Tất cả ngành</option>
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                Ngành {SECTOR_LABELS[sector]}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={selectedClass}
            onChange={(event) => setSelectedClass(sanitizeClassId(event.target.value))}
            disabled={isClassSelectDisabled}
          >
            <option value="">{classPlaceholder}</option>
            {sectorClassOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
            <option>Năm học 2025-2026</option>
          </select>
          {selectedType === "attendance" && (
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={attendanceSessionFilter}
              onChange={(event) => setAttendanceSessionFilter(event.target.value as AttendanceSessionFilter)}
            >
              {ATTENDANCE_SESSION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedType === "score" && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Chọn cột điểm số để xuất</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              {SCORE_COLUMN_DEFINITIONS.map((column) => {
                const isChecked = selectedScoreColumns.includes(column.id);
                return (
                  <label key={column.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={isChecked}
                      onChange={(event) => {
                        const { checked } = event.target;
                        setSelectedScoreColumns((prev) => {
                          if (checked) {
                            if (prev.includes(column.id)) {
                              return prev;
                            }
                            const nextSet = new Set<ScoreColumnId>(prev);
                            nextSet.add(column.id);
                            return DEFAULT_SCORE_COLUMN_IDS.filter((id) => nextSet.has(id));
                          }
                          return prev.filter((id) => id !== column.id);
                        });
                      }}
                    />
                    {column.selectionLabel}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleResetReport}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 transition hover:border-slate-400 hover:text-slate-950"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerateDisabled}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
              isGenerateDisabled
                ? "cursor-not-allowed bg-emerald-200"
                : "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            {isGeneratingReport ? "Đang tạo..." : "Tạo báo cáo"}
          </button>
        </div>
      </section>
      {selectedType === "attendance" ? (
        <AttendanceReportPreview
          ref={previewContainerRef}
          data={attendancePreviewView}
          isLoading={isGeneratingReport}
          errorMessage={reportError}
          exportDisabled={isExportDisabled}
          exportingMode={exportingMode}
          onExportImage={() => handleExportImage("attendance")}
          onExportExcel={() => handleExportExcel("attendance")}
        />
      ) : (
        <ScoreReportPreview
          ref={previewContainerRef}
          data={scorePreview}
          isLoading={isGeneratingReport}
          errorMessage={reportError}
          exportDisabled={isExportDisabled}
          exportingMode={exportingMode}
          visibleColumns={selectedScoreColumns}
          onExportImage={() => handleExportImage("score")}
          onExportExcel={() => handleExportExcel("score")}
        />
      )}
    </div>
  );
}
