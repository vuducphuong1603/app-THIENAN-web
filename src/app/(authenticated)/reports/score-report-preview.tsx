"use client";

import { forwardRef } from "react";
import clsx from "clsx";

export type ScoreReportPreviewRow = {
  studentId: string;
  status?: string | null;
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

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang học",
  INACTIVE: "Nghỉ",
  GRADUATED: "Tốt nghiệp",
  TRANSFERRED: "Chuyển lớp",
  DELETED: "Đã xóa",
};

function formatStatus(value?: string | null) {
  if (!value) return "";
  const normalized = value.trim().toUpperCase();
  return STATUS_LABELS[normalized] ?? value;
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "";
  }
  return SCORE_NUMBER_FORMATTER.format(value);
}

const ScoreReportPreview = forwardRef<HTMLDivElement, ScoreReportPreviewProps>(
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

    return (
      <section ref={ref} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Xem trước báo cáo</h3>
            <p className="text-xs text-slate-500">
              Khoảng thời gian: {data.dateRangeLabel} • Lớp: {data.className} • Cập nhật: {data.generatedAtLabel}
            </p>
            <p className="text-xs text-slate-500">
              Tổng buổi Thứ 5: {data.summary.thursdaySessions} • Chủ nhật: {data.summary.sundaySessions} • Tổng cộng: {data.summary.totalSessions}
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

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-xs md:text-sm">
            <thead>
              <tr className="bg-emerald-50 text-center text-slate-700">
                <th className="border border-slate-200 px-2 py-3" rowSpan={2}>
                  Stt
                </th>
                <th className="border border-slate-200 px-2 py-3" rowSpan={2}>
                  Trạng thái
                </th>
                <th className="border border-slate-200 px-2 py-3" rowSpan={2}>
                  Tên thánh
                </th>
                <th className="border border-slate-200 px-2 py-3" rowSpan={2}>
                  Họ và tên
                </th>
                <th className="border border-slate-200 px-2 py-3" rowSpan={2}>
                  Lớp
                </th>
                <th className="border border-slate-200 px-2 py-3" colSpan={3}>
                  Điểm danh
                </th>
                <th className="border border-slate-200 px-2 py-3" colSpan={5}>
                  Điểm giáo lý
                </th>
                <th className="border border-slate-200 px-2 py-3" rowSpan={2}>
                  Điểm tổng
                </th>
                <th className="border border-slate-200 px-2 py-3" rowSpan={2}>
                  Hạng
                </th>
                <th className="border border-slate-200 px-2 py-3" rowSpan={2}>
                  Kết quả
                </th>
              </tr>
              <tr className="bg-emerald-50 text-center text-slate-700">
                <th className="border border-slate-200 px-2 py-2">Đi lễ T5</th>
                <th className="border border-slate-200 px-2 py-2">Học GL</th>
                <th className="border border-slate-200 px-2 py-2">Điểm TB</th>
                <th className="border border-slate-200 px-2 py-2">45&apos; HK1</th>
                <th className="border border-slate-200 px-2 py-2">Thi HK1</th>
                <th className="border border-slate-200 px-2 py-2">45&apos; HK2</th>
                <th className="border border-slate-200 px-2 py-2">Thi HK2</th>
                <th className="border border-slate-200 px-2 py-2">Điểm TB</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-6 text-center text-sm text-slate-500">
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
                        {formatStatus(row.status)}
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
      </section>
    );
  },
);

ScoreReportPreview.displayName = "ScoreReportPreview";

export default ScoreReportPreview;
