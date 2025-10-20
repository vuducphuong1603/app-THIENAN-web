"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import clsx from "clsx";

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
import type { Sector } from "@/types/database";
import AttendanceReportPreview, {
  type AttendanceReportPreviewData,
  type AttendancePreviewRow,
  type NormalizedPreviewWeekday,
} from "./attendance-report-preview";
import ScoreReportPreview, { type ScoreReportPreviewData } from "./score-report-preview";

type WeekOption = {
  value: string;
  optionLabel: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
};

type TimeMode = "week" | "date";

const DEFAULT_WEEK_COUNT = 12;

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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();
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

function calculateAttendanceScore(present?: number | null, total?: number | null) {
  if (present == null || total == null || total === 0) {
    return null;
  }
  return Number(((present / total) * 10).toFixed(2));
}

function calculateCatechismAverage(
  semester145?: number | null,
  semester1Exam?: number | null,
  semester245?: number | null,
  semester2Exam?: number | null,
) {
  if (
    semester145 == null &&
    semester1Exam == null &&
    semester245 == null &&
    semester2Exam == null
  ) {
    return null;
  }

  const sum =
    (semester145 ?? 0) +
    (semester245 ?? 0) +
    (semester1Exam ?? 0) * 2 +
    (semester2Exam ?? 0) * 2;

  return Number((sum / 6).toFixed(2));
}

function calculateTotalScore(catechismAvg: number | null, attendanceAvg: number | null) {
  if (catechismAvg == null && attendanceAvg == null) {
    return null;
  }
  const catechismComponent = catechismAvg ?? 0;
  const attendanceComponent = attendanceAvg ?? 0;
  return Number((catechismComponent * 0.6 + attendanceComponent * 0.4).toFixed(2));
}

type BuildScoreReportArgs = {
  students: StudentBasicRow[];
  scoreDetails: StudentScoreDetailRow[];
  attendanceRecords: AttendanceRecordRow[];
  className: string;
  startDate?: string;
  endDate?: string;
};

function buildScoreReportPreviewData({
  students,
  scoreDetails,
  attendanceRecords,
  className,
  startDate,
  endDate,
}: BuildScoreReportArgs): ScoreReportPreviewData {
  const detailById = new Map<string, StudentScoreDetailRow>();
  scoreDetails.forEach((detail) => {
    if (detail && detail.id) {
      detailById.set(detail.id, detail);
    }
  });

  const thursdayDates = new Set<string>();
  const sundayDates = new Set<string>();
  const statusesByStudent = new Map<string, Map<string, "present" | "absent">>();

  attendanceRecords.forEach((record) => {
    const studentId = record.student_id?.trim();
    const isoDate = record.event_date?.slice(0, 10);

    if (!studentId || !isoDate) {
      return;
    }

    const normalizedWeekday = resolveNormalizedWeekday(record.weekday, isoDate);
    if (normalizedWeekday === "thursday") {
      thursdayDates.add(isoDate);
    } else if (normalizedWeekday === "sunday") {
      sundayDates.add(isoDate);
    } else {
      return;
    }

    let statusMap = statusesByStudent.get(studentId);
    if (!statusMap) {
      statusMap = new Map();
      statusesByStudent.set(studentId, statusMap);
    }

    const present = isPresentStatus(record.status);
    const existing = statusMap.get(isoDate);
    if (existing === "present") {
      return;
    }
    if (present) {
      statusMap.set(isoDate, "present");
    } else if (!existing) {
      statusMap.set(isoDate, "absent");
    }
  });

  const thursdayTotal = thursdayDates.size;
  const sundayTotal = sundayDates.size;
  const totalSessions = thursdayTotal + sundayTotal;
  const tieBreaker = new Intl.Collator("vi", { sensitivity: "base" });

  const rows = students.map((student) => {
    const detail = detailById.get(student.id);
    const statusMap = statusesByStudent.get(student.id) ?? new Map<string, "present" | "absent">();

    let thursdayPresent = 0;
    let sundayPresent = 0;

    if (thursdayTotal > 0) {
      thursdayDates.forEach((date) => {
        if (statusMap.get(date) === "present") {
          thursdayPresent += 1;
        }
      });
    }

    if (sundayTotal > 0) {
      sundayDates.forEach((date) => {
        if (statusMap.get(date) === "present") {
          sundayPresent += 1;
        }
      });
    }

    const attendanceAverage =
      totalSessions > 0 ? calculateAttendanceScore(thursdayPresent + sundayPresent, totalSessions) : null;

    const attendance: ScoreReportPreviewData["rows"][number]["attendance"] = {
      thursdayPresent,
      thursdayTotal,
      thursdayScore: thursdayTotal > 0 ? calculateAttendanceScore(thursdayPresent, thursdayTotal) : null,
      sundayPresent,
      sundayTotal,
      sundayScore: sundayTotal > 0 ? calculateAttendanceScore(sundayPresent, sundayTotal) : null,
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
      status: student.status,
      saintName: student.saint_name,
      fullName: student.full_name,
      className,
      attendance,
      catechism,
      totalScore,
      rank: null,
      result: null,
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
    rows,
    summary: {
      thursdaySessions: thursdayTotal,
      sundaySessions: sundayTotal,
      totalSessions,
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
    normalized === "ATTEND" ||
    normalized === "ATTENDED" ||
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
  return normalized === "P";
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

function buildScoreWorksheetData(preview: ScoreReportPreviewData): WorksheetBuildResult {
  const header = [
    "STT",
    "Trạng thái",
    "Tên thánh",
    "Họ và tên",
    "Lớp",
    "Đi lễ T5",
    "Học GL",
    "Điểm danh TB",
    "45' HK1",
    "Thi HK1",
    "45' HK2",
    "Thi HK2",
    "Điểm GL TB",
    "Điểm tổng",
    "Hạng",
    "Kết quả",
  ];

  const rows = preview.rows.map((row, index) => [
    index + 1,
    row.status ?? "",
    row.saintName ?? "",
    row.fullName ?? "",
    row.className ?? preview.className,
    row.attendance.thursdayScore ?? "",
    row.attendance.sundayScore ?? "",
    row.attendance.averageScore ?? "",
    row.catechism.semester145 ?? "",
    row.catechism.semester1Exam ?? "",
    row.catechism.semester245 ?? "",
    row.catechism.semester2Exam ?? "",
    row.catechism.average ?? "",
    row.totalScore ?? "",
    row.rank ?? "",
    row.result ?? "",
  ]);

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
    { wch: 14 },
    { wch: 18 },
    { wch: 26 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
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
  const {
    data: classRows = [],
    isLoading: isLoadingClasses,
  } = useQuery<ClassRow[]>({
    queryKey: ["classes", "list"],
    queryFn: () => fetchClasses(supabase),
    enabled: !!supabase,
  });

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

  const classesBySector = useMemo(() => {
    const initial: Record<Sector, ClassOption[]> = {
      "CHIÊN": [],
      "ẤU": [],
      "THIẾU": [],
      "NGHĨA": [],
    };
    const seen = new Set<string>();

    classRows.forEach((cls) => {
      const trimmedId = cls.id?.trim();
      if (!trimmedId) {
        return;
      }

      const resolvedSector = inferClassSector(cls);
      if (!resolvedSector) {
        return;
      }

      const dedupeKey = `${resolvedSector}::${trimmedId}`;
      if (seen.has(dedupeKey)) {
        return;
      }
      seen.add(dedupeKey);

      const trimmedName = cls.name?.trim();
      const trimmedCode = cls.code?.trim();

      const displayLabel =
        (trimmedName && trimmedName.length > 0 ? trimmedName : null) ??
        (trimmedCode && trimmedCode.length > 0 ? trimmedCode : null) ??
        trimmedId;

      initial[resolvedSector].push({ value: trimmedId, label: displayLabel });
    });

    (Object.values(initial) as ClassOption[][]).forEach((options) => {
      options.sort((a, b) => a.label.localeCompare(b.label, "vi", { sensitivity: "base" }));
    });

    return initial;
  }, [classRows]);

  const [selectedSector, setSelectedSector] = useState<Sector | "">("");
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
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
  }, [selectedSector, classesBySector, selectedClass]);

  const sectorClassOptions = selectedSector ? classesBySector[selectedSector] : [];
  const isClassSelectDisabled = !selectedSector || isLoadingClasses || sectorClassOptions.length === 0;
  const classPlaceholder = !selectedSector
    ? "Chọn ngành trước"
    : isLoadingClasses
      ? "Đang tải lớp..."
      : sectorClassOptions.length === 0
        ? "Không có lớp cho ngành này"
        : "Tất cả lớp";

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [attendancePreview, setAttendancePreview] = useState<AttendanceReportPreviewData | null>(null);
  const [scorePreview, setScorePreview] = useState<ScoreReportPreviewData | null>(null);
  const [exportingMode, setExportingMode] = useState<"image" | "excel" | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const hasDateRange = useMemo(() => {
    if (timeMode === "week") {
      return Boolean(activeWeek?.startDate && activeWeek?.endDate);
    }
    return Boolean(selectedFromDate && selectedToDate);
  }, [timeMode, activeWeek, selectedFromDate, selectedToDate]);
  const activePreview = selectedType === "attendance" ? attendancePreview : scorePreview;
  const isExportDisabled =
    isGeneratingReport || exportingMode !== null || !activePreview || activePreview.rows.length === 0;

  const handleResetReport = useCallback(() => {
    setAttendancePreview(null);
    setScorePreview(null);
    setReportError(null);
  }, []);

  const handleGenerateReport = useCallback(async () => {
    const trimmedClassId = selectedClass.trim();

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
  ]);

  const handleExportImage = useCallback(
    async (reportType: "attendance" | "score") => {
      const preview = reportType === "attendance" ? attendancePreview : scorePreview;

      if (!preview || preview.rows.length === 0) {
        window.alert("Không có dữ liệu để xuất.");
        return;
      }

      if (!previewContainerRef.current) {
        window.alert("Không tìm thấy nội dung báo cáo để xuất.");
        return;
      }

      try {
        setExportingMode("image");
        const html2canvasModule = await import("html2canvas");
        const canvas = await html2canvasModule.default(previewContainerRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
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
        setExportingMode(null);
      }
    },
    [attendancePreview, scorePreview],
  );

  const handleExportExcel = useCallback(
    async (reportType: "attendance" | "score") => {
      const preview = reportType === "attendance" ? attendancePreview : scorePreview;

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
            : buildScoreWorksheetData(preview as ScoreReportPreviewData);
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
    [attendancePreview, scorePreview],
  );

  const isGenerateDisabled =
    isGeneratingReport ||
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
            onChange={(event) => setSelectedClass(event.target.value)}
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
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
            <option>Tất cả buổi</option>
            <option>Thứ 5</option>
            <option>Chủ nhật</option>
          </select>
        </div>

        {selectedType === "score" && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Chọn cột điểm số để xuất</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              {[
                "Đi lễ Thứ 5",
                "Thi HK1",
                "Học giáo lý",
                "45' HK2",
                "Điểm trung bình",
                "Thi HK2",
                "45' HK1",
                "Điểm tổng",
              ].map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" defaultChecked />
                  {label}
                </label>
              ))}
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
          data={attendancePreview}
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
          onExportImage={() => handleExportImage("score")}
          onExportExcel={() => handleExportExcel("score")}
        />
      )}
    </div>
  );
}
