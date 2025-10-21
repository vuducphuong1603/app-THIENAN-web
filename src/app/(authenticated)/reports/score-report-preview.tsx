"use client";
import Image from "next/image";
import { forwardRef } from "react";
import clsx from "clsx";

export type ScoreReportPreviewRow = {
  studentId: string;
  saintName?: string | null;
  fullName?: string | null;
  className?: string | null;
  attendance: {
    thursdayPresent: number;
    thursdayTotal: number;
    thursdayScore: number | null;
    sundayPresent: number;
    sundayTotal: number;
    sundayScore: number | null;
    averageScore: number | null;
  };
  catechism: {
    semester145: number | null;
    semester1Exam: number | null;
    semester245: number | null;
    semester2Exam: number | null;
    average: number | null;
  };
  totalScore: number | null;
  rank: number | null;
  result?: string | null;
};

export type ScoreReportPreviewSummary = {
  thursdaySessions: number;
  sundaySessions: number;
  totalSessions: number;
};

export type ScoreReportPreviewData = {
  className: string;
  dateRangeLabel: string;
  generatedAtLabel: string;
  startDate?: string;
  endDate?: string;
  rows: ScoreReportPreviewRow[];
  summary: ScoreReportPreviewSummary;
};

export interface ScoreReportPreviewProps {
  data: ScoreReportPreviewData | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onExportImage?: () => void;
  onExportExcel?: () => void;
  exportDisabled?: boolean;
  exportingMode?: "image" | "excel" | null;
}

const SCORE_NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const REPORT_COLORS = {
  border: "#e2e8f0",
  background: "#ffffff",
  bodyText: "#475569",
  headingText: "#0f172a",
  mutedText: "#64748b",
  highlightText: "#059669",
};

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "";
  }
  return SCORE_NUMBER_FORMATTER.format(value);
}

const ScoreReportPreview = forwardRef<HTMLElement, ScoreReportPreviewProps>(
  ({ data, isLoading, errorMessage, onExportExcel, onExportImage, exportDisabled, exportingMode }, ref) => {
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
            Chọn lớp và nhấn &quot;Tạo báo cáo&quot; để xem trước bảng điểm.
          </p>
        </section>
      );
    }

    const { className, dateRangeLabel, generatedAtLabel } = data;
    const isImageExport = exportingMode === "image";

    return (
      <section
        ref={ref}
        data-report-export-root="true"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap justify-end gap-2" data-export-hide-on-image="true">
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

        <div
          className="overflow-hidden rounded-2xl border"
          style={{
            borderColor: REPORT_COLORS.border,
            backgroundColor: REPORT_COLORS.background,
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
            overflow: isImageExport ? "visible" : "hidden",
          }}
        >
          <div
            className="px-6 py-6 sm:px-8 sm:py-8"
            style={isImageExport ? { width: "max-content" } : undefined}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Image
                  src="/tntt-logo.png"
                  alt="Huy hiệu Thiếu Nhi Thánh Thể Việt Nam"
                  width={120}
                  height={120}
                  className="h-24 w-20 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-2"
                  priority
                />
                <div className="flex min-w-[220px] flex-1 flex-col items-center text-center">
                  <p
                    className="text-xs font-semibold uppercase tracking-widest sm:text-sm"
                    style={{ color: REPORT_COLORS.headingText }}
                  >
                    Phong trào Thiếu Nhi Thánh Thể Việt Nam
                  </p>
                  <p className="mt-1 text-xs sm:text-sm" style={{ color: REPORT_COLORS.mutedText }}>
                    Giáo xứ Thiên Ân • Xứ đoàn Fatima
                  </p>
                </div>
                <Image
                  src="/church-logo.jpg"
                  alt="Logo Xứ Đoàn Đức Mẹ Fatima - Giáo Xứ Thiên Ân"
                  width={120}
                  height={120}
                  className="h-24 w-24 shrink-0 rounded-full border border-slate-200 bg-white object-contain p-2"
                  priority
                />
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
                  Bảng điểm tổng hợp
                </h3>
                <p className="mt-2 text-sm" style={{ color: REPORT_COLORS.bodyText }}>
                  Lớp:{" "}
                  <span className="font-semibold" style={{ color: REPORT_COLORS.headingText }}>
                    {className}
                  </span>{" "}
                  • Khoảng thời gian:{" "}
                  <span className="font-semibold" style={{ color: REPORT_COLORS.headingText }}>
                    {dateRangeLabel}
                  </span>
                </p>
                <p className="mt-1 text-xs sm:text-sm" style={{ color: REPORT_COLORS.mutedText }}>
                  Ngày xuất báo cáo: {generatedAtLabel}
                </p>
              </div>
            </div>

            <div
              className="mt-6 overflow-x-auto"
              style={isImageExport ? { overflow: "visible" } : undefined}
            >
              <table
                className="min-w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-xs md:text-sm"
                style={isImageExport ? { width: "max-content" } : undefined}
              >
                <thead>
                  <tr className="text-center">
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" rowSpan={2}>
                      Stt
                    </th>
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" rowSpan={2}>
                      Tên thánh
                    </th>
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" rowSpan={2}>
                      Họ và tên
                    </th>
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" rowSpan={2}>
                      Lớp
                    </th>
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" colSpan={3}>
                      Điểm danh
                    </th>
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" colSpan={5}>
                      Điểm giáo lý
                    </th>
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" rowSpan={2}>
                      Điểm tổng
                    </th>
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" rowSpan={2}>
                      Hạng
                    </th>
                    <th className="border border-slate-200 px-2 py-3 bg-emerald-50 text-slate-700" rowSpan={2}>
                      Kết quả
                    </th>
                  </tr>
                  <tr className="text-center">
                    <th className="border border-slate-200 px-2 py-2 bg-emerald-50 text-slate-700">Đi lễ T5</th>
                    <th className="border border-slate-200 px-2 py-2 bg-emerald-50 text-slate-700">Học GL</th>
                    <th className="border border-slate-200 px-2 py-2 bg-emerald-50 text-slate-700">Điểm TB</th>
                    <th className="border border-slate-200 px-2 py-2 bg-emerald-50 text-slate-700">45&apos; HK1</th>
                    <th className="border border-slate-200 px-2 py-2 bg-emerald-50 text-slate-700">Thi HK1</th>
                    <th className="border border-slate-200 px-2 py-2 bg-emerald-50 text-slate-700">45&apos; HK2</th>
                    <th className="border border-slate-200 px-2 py-2 bg-emerald-50 text-slate-700">Thi HK2</th>
                    <th className="border border-slate-200 px-2 py-2 bg-emerald-50 text-slate-700">Điểm TB</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-6 text-center text-sm text-slate-500">
                        Không có dữ liệu cho bảng điểm.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row, index) => {
                      const zebra = index % 2 === 0 ? "bg-white" : "bg-slate-50";
                      return (
                        <tr key={row.studentId} className={zebra}>
                          <td className="border border-slate-200 px-2 py-2 text-center font-medium text-slate-700">
                            {index + 1}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {row.saintName ?? ""}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-left text-slate-800">
                            {row.fullName ?? ""}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {row.className ?? data.className}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {formatScore(row.attendance.thursdayScore)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {formatScore(row.attendance.sundayScore)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {formatScore(row.attendance.averageScore)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {formatScore(row.catechism.semester145)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {formatScore(row.catechism.semester1Exam)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {formatScore(row.catechism.semester245)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {formatScore(row.catechism.semester2Exam)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {formatScore(row.catechism.average)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center font-semibold text-emerald-700">
                            {formatScore(row.totalScore)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {row.rank ?? ""}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                            {row.result ?? ""}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    );
  },
);

ScoreReportPreview.displayName = "ScoreReportPreview";

export default ScoreReportPreview;
