
"use client";

import { forwardRef, type CSSProperties } from "react";
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

const REPORT_COLORS = {
  border: "#e2e8f0",
  background: "#ffffff",
  bodyText: "#475569",
  headingText: "#0f172a",
  mutedText: "#64748b",
  highlightText: "#059669",
  badgeText: "#b45309",
  badgeBorder: "#f59e0b",
  badgeBackground: "#fef3c7",
  zebraRow: "#f8fafc",
  absentText: "#94a3b8",
  presentText: "#059669",
};

const WEEKDAY_COLORS: Record<
  NormalizedPreviewWeekday,
  {
    header: CSSProperties;
    cellBorderColor: string;
  }
> = {
  thursday: {
    header: {
      backgroundColor: "#e0f2fe",
      borderColor: "#bae6fd",
      color: "#0369a1",
    },
    cellBorderColor: "#bae6fd",
  },
  sunday: {
    header: {
      backgroundColor: "#d1fae5",
      borderColor: "#a7f3d0",
      color: "#047857",
    },
    cellBorderColor: "#a7f3d0",
  },
  other: {
    header: {
      backgroundColor: "#f1f5f9",
      borderColor: "#e2e8f0",
      color: "#475569",
    },
    cellBorderColor: "#e2e8f0",
  },
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
          className="overflow-hidden rounded-2xl border"
          style={{
            borderColor: REPORT_COLORS.border,
            backgroundColor: REPORT_COLORS.background,
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div className="px-8 py-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{
                      border: `2px solid ${REPORT_COLORS.badgeBorder}`,
                      backgroundColor: REPORT_COLORS.badgeBackground,
                      color: REPORT_COLORS.badgeText,
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                    }}
                  >
                    TNTT
                  </div>
                  <div className="text-xs sm:text-sm" style={{ color: REPORT_COLORS.bodyText }}>
                    <p
                      className="text-xs font-semibold uppercase tracking-wider sm:text-[13px]"
                      style={{ color: REPORT_COLORS.headingText }}
                    >
                      Phong trào Thiếu Nhi Thánh Thể Việt Nam
                    </p>
                    <p className="mt-1 text-xs sm:text-[13px]" style={{ color: REPORT_COLORS.mutedText }}>
                      Giáo xứ Thiên Ân • Xứ đoàn Fatima
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] leading-5 sm:text-xs" style={{ color: REPORT_COLORS.bodyText }}>
                  <p className="font-semibold uppercase tracking-wider" style={{ color: REPORT_COLORS.headingText }}>
                    Giáo phận Phú Cường
                  </p>
                  <p>Giáo hạt Thuận An</p>
                  <p>Giáo xứ Thiên Ân</p>
                </div>
              </div>

              <div className="text-center">
                <p
                  className="text-[13px] font-semibold uppercase tracking-widest"
                  style={{ color: REPORT_COLORS.highlightText }}
                >
                  Sổ theo dõi - Báo cáo
                </p>
                <h3
                  className="mt-1 text-xl font-bold uppercase tracking-wide sm:text-2xl"
                  style={{ color: REPORT_COLORS.headingText }}
                >
                  Điểm danh tham dự Thánh lễ Thứ Năm và Chúa Nhật
                </h3>
                <p className="mt-2 text-sm" style={{ color: REPORT_COLORS.bodyText }}>
                  Lớp:{" "}
                  <span className="font-semibold" style={{ color: REPORT_COLORS.headingText }}>
                    {data.className}
                  </span>{" "}
                  • Khoảng thời gian:{" "}
                  <span className="font-semibold" style={{ color: REPORT_COLORS.headingText }}>
                    {data.dateRangeLabel}
                  </span>
                </p>
              </div>

              <div className="overflow-x-auto">
                <table
                  className="min-w-full border border-collapse text-sm"
                  style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.bodyText }}
                >
                  <thead>
                    <tr className="text-xs uppercase tracking-widest" style={{ color: REPORT_COLORS.bodyText }}>
                      <th
                        className="w-14 border px-3 py-3 text-center font-semibold"
                        style={{ backgroundColor: "#f1f5f9", borderColor: REPORT_COLORS.border }}
                      >
                        STT
                      </th>
                      <th
                        className="min-w-[140px] border px-3 py-3 text-left font-semibold"
                        style={{ backgroundColor: "#f1f5f9", borderColor: REPORT_COLORS.border }}
                      >
                        Tên thánh
                      </th>
                      <th
                        className="min-w-[220px] border px-3 py-3 text-left font-semibold"
                        style={{ backgroundColor: "#f1f5f9", borderColor: REPORT_COLORS.border }}
                      >
                        Họ và tên
                      </th>
                      {data.columns.map((column) => (
                        <th
                          key={column.isoDate}
                          className="min-w-[90px] border px-3 py-3 text-center font-semibold"
                          style={WEEKDAY_COLORS[column.normalizedWeekday].header}
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
                          className="px-4 py-6 text-center text-sm"
                          style={{ color: REPORT_COLORS.mutedText }}
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
                          <tr
                            key={row.studentId}
                            style={{ backgroundColor: index % 2 === 0 ? REPORT_COLORS.background : REPORT_COLORS.zebraRow }}
                          >
                            <td
                              className="border px-3 py-2 text-center text-sm font-semibold"
                              style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.bodyText }}
                            >
                              {index + 1}
                            </td>
                            <td
                              className="border px-3 py-2 text-sm"
                              style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.bodyText }}
                            >
                              {row.saintName || "—"}
                            </td>
                            <td
                              className="border px-3 py-2 text-sm font-semibold"
                              style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.headingText }}
                            >
                              {displayName || "—"}
                            </td>
                            {data.columns.map((column) => {
                              const status = row.statuses[column.isoDate];
                              const isPresent = status === "present";
                              return (
                                <td
                                  key={`${row.studentId}-${column.isoDate}`}
                                  className="border px-3 py-2 text-center text-sm font-semibold uppercase tracking-widest"
                                  style={{
                                    borderColor: WEEKDAY_COLORS[column.normalizedWeekday].cellBorderColor,
                                    color: isPresent ? REPORT_COLORS.presentText : REPORT_COLORS.absentText,
                                  }}
                                >
                                  {isPresent ? "X" : ""}
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

              <div
                className="flex flex-wrap items-start justify-between gap-4 text-[11px] sm:text-xs"
                style={{ color: REPORT_COLORS.mutedText }}
              >
                <div className="space-y-1" style={{ color: REPORT_COLORS.bodyText }}>
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
