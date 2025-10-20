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
  type AttendanceRecordRow,
  type ClassRow,
  type StudentBasicRow,
} from "@/lib/queries/supabase";
import type { Sector } from "@/types/database";
import AttendanceReportPreview, {
  type AttendanceReportPreviewData,
  type AttendancePreviewRow,
  type NormalizedPreviewWeekday,
} from "./attendance-report-preview";

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

function buildWorksheetData(preview: AttendanceReportPreviewData): WorksheetBuildResult {
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
  className: string;
  startDate?: string;
  endDate?: string;
  extension: "png" | "xlsx";
};

function buildReportFilename({ className, startDate, endDate, extension }: BuildReportFilenameArgs) {
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

  const parts = ["bao-cao-diem-danh", classSegment, rangeSegment ?? timestamp];
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
  const [exportingMode, setExportingMode] = useState<"image" | "excel" | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const hasDateRange = useMemo(() => {
    if (timeMode === "week") {
      return Boolean(activeWeek?.startDate && activeWeek?.endDate);
    }
    return Boolean(selectedFromDate && selectedToDate);
  }, [timeMode, activeWeek, selectedFromDate, selectedToDate]);
  const isExportDisabled =
    isGeneratingReport ||
    exportingMode !== null ||
    !attendancePreview ||
    attendancePreview.rows.length === 0;

  const handleResetReport = useCallback(() => {
    setAttendancePreview(null);
    setReportError(null);
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (selectedType !== "attendance") {
      setAttendancePreview(null);
      setReportError("Báo cáo điểm số đang được phát triển. Vui lòng chọn báo cáo điểm danh.");
      return;
    }

    const trimmedClassId = selectedClass.trim();
    if (!trimmedClassId) {
      setAttendancePreview(null);
      setReportError("Vui lòng chọn lớp để tạo báo cáo điểm danh.");
      return;
    }

    const { startDate, endDate } = resolveDateRange({
      timeMode,
      activeWeek,
      selectedFromDate,
      selectedToDate,
    });

    if (!startDate || !endDate) {
      setAttendancePreview(null);
      setReportError("Khoảng thời gian chưa hợp lệ. Vui lòng chọn lại.");
      return;
    }

    setIsGeneratingReport(true);
    setReportError(null);

    try {
      const students = await fetchStudentsByClass(supabase, trimmedClassId);
      const studentIds = students
        .map((student) => student.id?.trim())
        .filter((value): value is string => Boolean(value));

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
    } catch (error) {
      console.error("Failed to generate attendance report preview:", error);
      setAttendancePreview(null);
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

  const handleExportImage = useCallback(async () => {
    if (!attendancePreview || attendancePreview.rows.length === 0) {
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
        className: attendancePreview.className,
        startDate: attendancePreview.startDate,
        endDate: attendancePreview.endDate,
        extension: "png",
      });
      link.click();
    } catch (error) {
      console.error("Failed to export attendance report PNG:", error);
      window.alert("Xuất ảnh không thành công. Vui lòng thử lại.");
    } finally {
      setExportingMode(null);
    }
  }, [attendancePreview]);

  const handleExportExcel = useCallback(async () => {
    if (!attendancePreview || attendancePreview.rows.length === 0) {
      window.alert("Không có dữ liệu để xuất.");
      return;
    }

    try {
      setExportingMode("excel");
      const XLSX = await import("xlsx");
      const { data, columnWidths } = buildWorksheetData(attendancePreview);
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      worksheet["!cols"] = columnWidths;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCao");
      XLSX.writeFile(
        workbook,
        buildReportFilename({
          className: attendancePreview.className,
          startDate: attendancePreview.startDate,
          endDate: attendancePreview.endDate,
          extension: "xlsx",
        }),
        { compression: true },
      );
    } catch (error) {
      console.error("Failed to export attendance report Excel:", error);
      window.alert("Xuất Excel không thành công. Vui lòng thử lại.");
    } finally {
      setExportingMode(null);
    }
  }, [attendancePreview]);

  const isGenerateDisabled =
    isGeneratingReport ||
    (selectedType === "attendance" && (!selectedClass || !hasDateRange));

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
      <AttendanceReportPreview
        ref={previewContainerRef}
        data={attendancePreview}
        isLoading={isGeneratingReport}
        errorMessage={reportError}
        exportDisabled={isExportDisabled}
        exportingMode={exportingMode}
        onExportImage={handleExportImage}
        onExportExcel={handleExportExcel}
      />
    </div>
  );
}
