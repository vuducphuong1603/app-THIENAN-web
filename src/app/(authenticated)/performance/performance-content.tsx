"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MAX_CHART_POINTS, SECTOR_KEYS, SECTOR_METADATA, WEEKDAY_KEYS, WEEKDAY_METADATA } from "./constants";
import type {
  ChartDataPoint,
  ClassBreakdown,
  PerformancePageData,
  SectorKey,
  NormalizedWeekday,
} from "./types";

type SelectionState = {
  sector: SectorKey;
  weekday: NormalizedWeekday;
  eventDate: string | null;
};

type ChartSectionKey = keyof PerformancePageData["charts"];

const WEEKDAY_SECTION_TITLES: Record<ChartSectionKey, string> = {
  sunday: WEEKDAY_METADATA.sunday.label,
  thursday: WEEKDAY_METADATA.thursday.label,
};

const NO_DATA_MESSAGE = "Không có dữ liệu điểm danh";

function getSummaryCards(data: ChartDataPoint[]) {
  if (data.length === 0) {
    return [];
  }
  const recent = data.slice(-3);
  return [...recent].reverse();
}

export default function PerformanceContent({ data }: { data: PerformancePageData }) {
  const chartSections: Array<{ key: ChartSectionKey; title: string; data: ChartDataPoint[] }> = [
    { key: "sunday", title: WEEKDAY_SECTION_TITLES.sunday, data: data.charts.sunday },
    { key: "thursday", title: WEEKDAY_SECTION_TITLES.thursday, data: data.charts.thursday },
  ];

  const breakdownIndex = React.useMemo(() => {
    const map = new Map<string, ClassBreakdown[]>();
    data.classBreakdowns.forEach((breakdown) => {
      const key = `${breakdown.sectorKey}|${breakdown.weekday}`;
      const existing = map.get(key);
      if (existing) {
        existing.push(breakdown);
      } else {
        map.set(key, [breakdown]);
      }
    });
    map.forEach((items) => {
      items.sort((a, b) => (a.eventDate > b.eventDate ? -1 : 1));
    });
    return map;
  }, [data.classBreakdowns]);

  const sectorsWithAttendance = React.useMemo(() => {
    const set = new Set<SectorKey>();
    data.classBreakdowns.forEach((item) => set.add(item.sectorKey));
    if (set.size === 0) {
      return SECTOR_KEYS;
    }
    return SECTOR_KEYS.filter((key) => set.has(key));
  }, [data.classBreakdowns]);

  const weekdaysWithAttendance = React.useMemo(() => {
    const set = new Set<NormalizedWeekday>();
    data.classBreakdowns.forEach((item) => set.add(item.weekday));
    if (set.size === 0) {
      return WEEKDAY_KEYS;
    }
    return WEEKDAY_KEYS.filter((key) => set.has(key));
  }, [data.classBreakdowns]);

  const initialSelection = React.useMemo<SelectionState>(() => {
    const fallbackSector = sectorsWithAttendance[0] ?? SECTOR_KEYS[0];
    const fallbackWeekday = weekdaysWithAttendance[0] ?? WEEKDAY_KEYS[0];
    const defaultBreakdown = data.classBreakdowns[0];
    if (defaultBreakdown) {
      return {
        sector: defaultBreakdown.sectorKey,
        weekday: defaultBreakdown.weekday,
        eventDate: defaultBreakdown.eventDate,
      };
    }
    return { sector: fallbackSector, weekday: fallbackWeekday, eventDate: null };
  }, [data.classBreakdowns, sectorsWithAttendance, weekdaysWithAttendance]);

  const [selection, setSelection] = React.useState<SelectionState>(initialSelection);

  React.useEffect(() => {
    setSelection((prev) => {
      if (
        prev.sector === initialSelection.sector &&
        prev.weekday === initialSelection.weekday &&
        prev.eventDate === initialSelection.eventDate
      ) {
        return prev;
      }
      return initialSelection;
    });
  }, [initialSelection]);

  const selectionKey = `${selection.sector}|${selection.weekday}`;

  const availableBreakdowns = React.useMemo(
    () => breakdownIndex.get(selectionKey) ?? [],
    [breakdownIndex, selectionKey],
  );

  React.useEffect(() => {
    if (availableBreakdowns.length === 0) {
      if (selection.eventDate !== null) {
        setSelection((prev) => ({ ...prev, eventDate: null }));
      }
      return;
    }

    const hasEvent = selection.eventDate
      ? availableBreakdowns.some((item) => item.eventDate === selection.eventDate)
      : false;

    if (!hasEvent) {
      setSelection((prev) => ({
        ...prev,
        eventDate: availableBreakdowns[0].eventDate,
      }));
    }
  }, [availableBreakdowns, selection.eventDate]);

  const activeBreakdown =
    (selection.eventDate
      ? availableBreakdowns.find((item) => item.eventDate === selection.eventDate)
      : availableBreakdowns[0]) ?? null;

  const classChartData =
    activeBreakdown?.classes.map((cls) => ({
      classId: cls.classId,
      className: cls.className,
      present: cls.present,
    })) ?? [];

  const totalPresent = classChartData.reduce((sum, item) => sum + item.present, 0);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Thống kê điểm danh</h2>
        <p className="text-sm text-slate-500">Xu hướng {MAX_CHART_POINTS} buổi gần nhất theo ngày học</p>
      </header>

      {chartSections.map((section) => (
        <section
          key={section.key}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
          <div className="h-80 w-full">
            {section.data.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={section.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" stroke="#475569" />
                  <YAxis stroke="#475569" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {SECTOR_KEYS.map((sectorKey) => {
                    const meta = SECTOR_METADATA[sectorKey];
                    return (
                      <Bar
                        key={sectorKey}
                        dataKey={sectorKey}
                        name={meta.label}
                        fill={meta.color}
                        radius={[4, 4, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                {NO_DATA_MESSAGE}
              </div>
            )}
          </div>
          {section.key === "sunday" && (
            <div className="grid gap-3 md:grid-cols-3">
              {getSummaryCards(section.data).map((item) => (
                <div
                  key={item.eventDate}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <p className="font-semibold text-slate-700">Ngày: {item.week}</p>
                  <p className="text-slate-600">Tổng thiếu nhi tham dự: {item.total}</p>
                </div>
              ))}
              {section.data.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  {NO_DATA_MESSAGE}
                </div>
              )}
            </div>
          )}
        </section>
      ))}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-800">Thống kê theo lớp trong ngành</h3>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
              value={selection.sector}
              onChange={(event) =>
                setSelection((prev) => ({
                  ...prev,
                  sector: event.target.value as SectorKey,
                }))
              }
            >
              {sectorsWithAttendance.map((sectorKey) => (
                <option key={sectorKey} value={sectorKey}>
                  {SECTOR_METADATA[sectorKey].label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
              value={selection.weekday}
              onChange={(event) =>
                setSelection((prev) => ({
                  ...prev,
                  weekday: event.target.value as NormalizedWeekday,
                }))
              }
            >
              {weekdaysWithAttendance.map((weekdayKey) => (
                <option key={weekdayKey} value={weekdayKey}>
                  {WEEKDAY_METADATA[weekdayKey].label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
              value={selection.eventDate ?? ""}
              onChange={(event) =>
                setSelection((prev) => ({
                  ...prev,
                  eventDate: event.target.value || null,
                }))
              }
              disabled={availableBreakdowns.length === 0}
            >
              {availableBreakdowns.length === 0 ? (
                <option value="">Không có dữ liệu</option>
              ) : (
                availableBreakdowns.map((item) => (
                  <option key={item.eventDate} value={item.eventDate}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {activeBreakdown
            ? `Ngày điểm danh: ${activeBreakdown.label}`
            : "Chưa có dữ liệu cho bộ lọc đã chọn"}
        </p>
        <div className="h-80 w-full">
          {classChartData.length > 0 ? (
            <ResponsiveContainer>
              <BarChart data={classChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="className" stroke="#475569" />
                <YAxis stroke="#475569" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="present"
                  name="Thiếu nhi điểm danh"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              {NO_DATA_MESSAGE}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {classChartData.length > 0
            ? `Tổng thiếu nhi tham dự: ${totalPresent}`
            : "Không có ghi nhận điểm danh cho lựa chọn này"}
        </p>
      </section>
    </div>
  );
}
