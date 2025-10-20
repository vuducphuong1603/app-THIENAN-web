"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfWeek, format, startOfWeek, subWeeks } from "date-fns";

import { useAuth } from "@/providers/auth-provider";
import { fetchClasses } from "@/lib/queries/supabase";
import type { ClassRow } from "@/lib/queries/supabase";
import type { Sector } from "@/types/database";

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

const reportData = [
  {
    id: "report-1",
    type: "Điểm danh",
    time: "Tuần 3 - 2026",
    scope: "Ngành Chiên",
    createdAt: "25/01/2026",
  },
];

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
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Hủy</button>
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Tạo báo cáo</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Xem trước báo cáo</h3>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">{selectedType === "attendance" ? "Báo cáo điểm danh" : "Báo cáo điểm số"}</p>
            <p className="text-xs text-slate-500">Chọn thông số và nhấn xuất để tải xuống.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Xuất ảnh PNG</button>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Xuất Excel</button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {reportData.map((report) => (
            <div key={report.id} className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-700">{report.type}</p>
              <p>Khoảng thời gian: {report.time}</p>
              <p>Ngành/Lớp: {report.scope}</p>
              <p>Ngày tạo: {report.createdAt}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
