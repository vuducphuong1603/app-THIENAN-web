
"use client";

import { forwardRef } from "react";
import clsx from "clsx";

export type NormalizedPreviewWeekday = "thursday" | "sunday" | "other";

export type AttendancePreviewColumn = {
  isoDate: string;
  displayDate: string;
  weekdayLabel: string;
  normalizedWeekday: NormalizedPreviewWeekday;
};

export type AttendancePreviewRow = {
  studentId: string;
  saintName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  statuses: Record<string, "present" | "absent" | "unmarked">;
};

export type AttendancePreviewSummary = {
  thursdayPresent: number;
  sundayPresent: number;
  missingCount: number;
  totalMarks: number;
  totalStudents: number;
};

export type AttendanceReportPreviewData = {
  className: string;
  dateRangeLabel: string;
  generatedAtLabel: string;
  startDate: string;
  endDate: string;
  columns: AttendancePreviewColumn[];
  rows: AttendancePreviewRow[];
  summary: AttendancePreviewSummary;
};

export interface AttendanceReportPreviewProps {
  data: AttendanceReportPreviewData | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onExportImage?: () => void;
  onExportExcel?: () => void;
  exportDisabled?: boolean;
  exportingMode?: "image" | "excel" | null;
}

const SUMMARY_CARD_META = [
  {
    key: "thursdayPresent" as const,
    label: "Có mặt Thứ 5",
    containerClass: "bg-indigo-50 border-indigo-100 text-indigo-700",
  },
  {
    key: "sundayPresent" as const,
    label: "Có mặt CN",
    containerClass: "bg-emerald-50 border-emerald-100 text-emerald-700",
  },
  {
    key: "missingCount" as const,
    label: "Học sinh chưa điểm danh",
    containerClass: "bg-rose-50 border-rose-100 text-rose-700",
  },
  {
    key: "totalMarks" as const,
    label: "Tổng lượt điểm danh",
    containerClass: "bg-amber-50 border-amber-100 text-amber-700",
  },
];

const WEEKDAY_HEADER_CLASS: Record<NormalizedPreviewWeekday, string> = {
  thursday: "bg-sky-100 border-sky-200 text-sky-700",
  sunday: "bg-emerald-100 border-emerald-200 text-emerald-700",
  other: "bg-slate-100 border-slate-200 text-slate-600",
};

const WEEKDAY_CELL_CLASS: Record<NormalizedPreviewWeekday, string> = {
  thursday: "border-sky-200",
  sunday: "border-emerald-200",
  other: "border-slate-200",
};

const AttendanceReportPreview = forwardRef<HTMLDivElement, AttendanceReportPreviewProps>(
  (
    { data, isLoading, errorMessage, onExportImage, onExportExcel, exportDisabled, exportingMode },
    ref,
  ) => {
    const isExporting = exportingMode != null;
    const isImageDisabled = exportDisabled || isExporting;
    const isExcelDisabled = exportDisabled || isExporting;
    const imageButtonLabel = exportingMode === "image" ? "Đang xuất..." : "Xuất ảnh PNG";
    const excelButtonLabel = exportingMode === "excel" ? "Đang xuất..." : "Xuất Excel";

    if (isLoading) {
      return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Đang tạo báo cáo…</p>
        </section>
      );
    }

    if (errorMessage) {
      return (
        <section className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-rose-700 shadow-sm">
          <p className="text-sm font-medium">{errorMessage}</p>
        </section>
      );
    }

    if (!data) {
      return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Xem trước báo cáo</h3>
          <p className="mt-2 text-sm text-slate-500">
            Chọn tham số ở trên và nhấn &quot;Tạo báo cáo&quot; để xem trước dữ liệu điểm danh.
          </p>
        </section>
      );
    }

    const { summary } = data;

    return (
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Xem trước báo cáo</h3>
            <p className="text-xs text-slate-500">
              Khoảng thời gian: {data.dateRangeLabel} • Lớp: {data.className} • Cập nhật:{" "}
              {data.generatedAtLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportImage}
              disabled={isImageDisabled}
              className={clsx(
                "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition",
                isImageDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-slate-400 hover:text-slate-900",
              )}
            >
              {imageButtonLabel}
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExcelDisabled}
              className={clsx(
                "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                isExcelDisabled ? "bg-emerald-200 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700",
              )}
            >
              {excelButtonLabel}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_CARD_META.map((card) => (
            <div
              key={card.key}
              className={clsx(
                "rounded-lg border p-3 text-sm font-semibold shadow-sm",
                card.containerClass,
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">{card.label}</p>
              <p className="mt-1 text-2xl font-bold">{summary[card.key]}</p>
            </div>
          ))}
        </div>

        <div
          ref={ref}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="px-8 py-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-400 bg-amber-100 text-[11px] font-bold uppercase tracking-widest text-amber-700 shadow-sm">
                    TNTT
                  </div>
                  <div className="text-xs text-slate-600 sm:text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 sm:text-[13px]">
                      Phong trào Thiếu Nhi Thánh Thể Việt Nam
                    </p>
                    <p className="mt-1 text-xs text-slate-500 sm:text-[13px]">Giáo xứ Thiên Ân • Xứ đoàn Fatima</p>
                  </div>
                </div>
                <div className="text-right text-[11px] leading-5 text-slate-600 sm:text-xs">
                  <p className="font-semibold uppercase tracking-wider text-slate-700">Giáo phận Phú Cường</p>
                  <p>Giáo hạt Thuận An</p>
                  <p>Giáo xứ Thiên Ân</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-600">
                  Sổ theo dõi - Báo cáo
                </p>
                <h3 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900 sm:text-2xl">
                  Điểm danh tham dự Thánh lễ Thứ Năm và Chúa Nhật
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Lớp: <span className="font-semibold text-slate-800">{data.className}</span> • Khoảng thời gian:{" "}
                  <span className="font-semibold text-slate-800">{data.dateRangeLabel}</span>
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-slate-200 border-collapse text-sm text-slate-700">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-slate-600">
                      <th className="w-14 border border-slate-200 bg-slate-100 px-3 py-3 text-center font-semibold">
                        STT
                      </th>
                      <th className="min-w-[140px] border border-slate-200 bg-slate-100 px-3 py-3 text-left font-semibold">
                        Tên thánh
                      </th>
                      <th className="min-w-[220px] border border-slate-200 bg-slate-100 px-3 py-3 text-left font-semibold">
                        Họ và tên
                      </th>
                      {data.columns.map((column) => (
                        <th
                          key={column.isoDate}
                          className={clsx(
                            "min-w-[90px] border px-3 py-3 text-center font-semibold",
                            WEEKDAY_HEADER_CLASS[column.normalizedWeekday],
                          )}
                        >
                          <div className="text-sm font-bold leading-tight">{column.displayDate}</div>
                          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide">
                            {column.weekdayLabel}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3 + data.columns.length}
                          className="px-4 py-6 text-center text-sm text-slate-500"
                        >
                          Không tìm thấy dữ liệu điểm danh cho khoảng thời gian này.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((row, index) => {
                        const displayName =
                          row.fullName?.trim() ||
                          [row.lastName, row.firstName]
                            .filter((value) => value && value.trim().length > 0)
                            .join(" ")
                            .trim();

                        return (
                          <tr key={row.studentId} className={clsx(index % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                            <td className="border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-600">
                              {index + 1}
                            </td>
                            <td className="border border-slate-200 px-3 py-2 text-sm text-slate-700">
                              {row.saintName || "—"}
                            </td>
                            <td className="border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                              {displayName || "—"}
                            </td>
                            {data.columns.map((column) => {
                              const status = row.statuses[column.isoDate];
                              const isPresent = status === "present";
                              return (
                                <td
                                  key={`${row.studentId}-${column.isoDate}`}
                                  className={clsx(
                                    "border px-3 py-2 text-center text-sm font-semibold uppercase tracking-widest",
                                    WEEKDAY_CELL_CLASS[column.normalizedWeekday],
                                    isPresent ? "text-emerald-600" : "text-slate-300",
                                  )}
                                >
                                  {isPresent ? "x" : ""}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4 text-[11px] text-slate-500 sm:text-xs">
                <div className="space-y-1">
                  <p>X: Có mặt • Trống: Vắng hoặc chưa điểm danh.</p>
                  <p>Báo cáo được tạo lúc {data.generatedAtLabel}.</p>
                </div>
                <div className="text-right leading-6">
                  <p>Người lập biểu: ___________________________</p>
                  <p>Giáo lý viên phụ trách: ___________________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  },
);

AttendanceReportPreview.displayName = "AttendanceReportPreview";

export default AttendanceReportPreview;
