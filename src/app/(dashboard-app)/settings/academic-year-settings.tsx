"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import clsx from "clsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2, Plus, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/providers/auth-provider";
import type { AcademicYear } from "@/types/database";
import {
  createAcademicYear,
  fetchAcademicYears,
  setCurrentAcademicYear,
  updateAcademicYear,
  type AcademicYearInput,
} from "@/lib/queries/academic-years";

type AcademicYearSettingsProps = {
  canEdit: boolean;
};

type FormState = {
  name: string;
  start_date: string;
  end_date: string;
  semester1_start: string;
  semester1_end: string;
  semester2_start: string;
  semester2_end: string;
  total_weeks: string;
  semester1_weeks: string;
  semester2_weeks: string;
  is_current: boolean;
};

type StatusMeta = { label: string; className: string };

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function formatRange(start?: string | null, end?: string | null) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function resolveStatus(year: AcademicYear): StatusMeta {
  if (year.is_current) {
    return { label: "Đang dùng", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }

  const today = new Date();
  const start = new Date(`${year.start_date}T00:00:00Z`);
  const end = new Date(`${year.end_date}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { label: "Chưa xác định", className: "bg-slate-50 text-slate-600 border-slate-200" };
  }

  if (today < start) {
    return { label: "Sắp tới", className: "bg-sky-50 text-sky-700 border-sky-200" };
  }

  if (today > end) {
    return { label: "Đã kết thúc", className: "bg-slate-100 text-slate-700 border-slate-200" };
  }

  return { label: "Hoạt động", className: "bg-amber-50 text-amber-700 border-amber-200" };
}

function toFormState(year?: AcademicYear | null): FormState {
  if (!year) {
    return {
      name: "",
      start_date: "",
      end_date: "",
      semester1_start: "",
      semester1_end: "",
      semester2_start: "",
      semester2_end: "",
      total_weeks: "",
      semester1_weeks: "",
      semester2_weeks: "",
      is_current: false,
    };
  }

  return {
    name: year.name ?? "",
    start_date: year.start_date ?? "",
    end_date: year.end_date ?? "",
    semester1_start: year.semester1_start ?? "",
    semester1_end: year.semester1_end ?? "",
    semester2_start: year.semester2_start ?? "",
    semester2_end: year.semester2_end ?? "",
    total_weeks: year.total_weeks != null ? String(year.total_weeks) : "",
    semester1_weeks: year.semester1_weeks != null ? String(year.semester1_weeks) : "",
    semester2_weeks: year.semester2_weeks != null ? String(year.semester2_weeks) : "",
    is_current: Boolean(year.is_current),
  };
}

function parseWeeks(value: string) {
  if (!value || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

export function AcademicYearSettings({ canEdit }: AcademicYearSettingsProps) {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formState, setFormState] = useState<FormState>(toFormState(null));
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const {
    data: academicYears = [],
    isLoading,
    error,
  } = useQuery<AcademicYear[]>({
    queryKey: ["academicYears"],
    queryFn: () => fetchAcademicYears(supabase),
    staleTime: 1000 * 60 * 30, // 30 phút - academic years hiếm khi thay đổi
  });

  const saveYear = useMutation<AcademicYear, Error, { mode: "create" | "update"; payload: AcademicYearInput; id?: string }>({
    mutationFn: async ({ mode, payload, id }) => {
      if (mode === "create") {
        return createAcademicYear(supabase, payload);
      }
      if (!id) {
        throw new Error("Thiếu mã năm học để cập nhật.");
      }
      return updateAcademicYear(supabase, id, payload);
    },
    onSuccess: (savedYear, variables) => {
      // Cập nhật cache ngay lập tức
      queryClient.setQueryData<AcademicYear[]>(["academicYears"], (existing = []) => {
        if (!existing.length) {
          return [savedYear];
        }

        if (variables?.mode === "create") {
          return [savedYear, ...existing];
        }

        return existing.map((year) => (year.id === savedYear.id ? savedYear : year));
      });

      // Background refresh
      void queryClient.invalidateQueries({ queryKey: ["academicYears"] });
      setFeedback({ type: "success", message: "Đã lưu năm học thành công." });
    },
  });

  const setCurrent = useMutation<AcademicYear, Error, string>({
    mutationFn: (id: string) => setCurrentAcademicYear(supabase, id),
    onSuccess: (currentYearResponse) => {
      queryClient.setQueryData<AcademicYear[]>(["academicYears"], (existing = []) =>
        existing.map((year) => ({
          ...year,
          is_current: year.id === currentYearResponse.id,
        })),
      );
      void queryClient.invalidateQueries({ queryKey: ["academicYears"] });
      setFeedback({ type: "success", message: "Đã chuyển năm học hiện tại." });
    },
    onError: (mutationError) => {
      setFeedback({ type: "error", message: mutationError.message ?? "Không thể cập nhật năm học hiện tại." });
    },
  });

  const currentYear = useMemo(() => academicYears.find((year) => year.is_current) ?? null, [academicYears]);

  const openCreateModal = () => {
    setEditingYear(null);
    setFormState(toFormState(null));
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setFormState(toFormState(year));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const payload: AcademicYearInput = {
      name: formState.name,
      start_date: formState.start_date,
      end_date: formState.end_date,
      semester1_start: formState.semester1_start,
      semester1_end: formState.semester1_end,
      semester2_start: formState.semester2_start,
      semester2_end: formState.semester2_end,
      total_weeks: parseWeeks(formState.total_weeks),
      semester1_weeks: parseWeeks(formState.semester1_weeks),
      semester2_weeks: parseWeeks(formState.semester2_weeks),
      is_current: formState.is_current,
    };

    // Giữ modal mở trong khi mutation đang chạy, đóng khi thành công
    saveYear.mutate(
      {
        mode: editingYear ? "update" : "create",
        payload,
        id: editingYear?.id,
      },
      {
        onSuccess: () => {
          // Đóng modal chỉ khi thành công
          setIsModalOpen(false);
          setEditingYear(null);
          setFormState(toFormState(null));
          setFormError(null);
        },
        onError: (mutationError) => {
          // Giữ modal mở và hiển thị lỗi
          setFormError(mutationError.message ?? "Không thể lưu năm học.");
        },
      },
    );
  };

  const loadError = error instanceof Error ? error.message : null;
  const showMigrationHint = loadError?.toLowerCase().includes("academic_years");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Năm học</h3>
          <p className="text-sm text-slate-500">
            Thiết lập thời gian năm học và 2 học kỳ để tính toán điểm danh theo đúng công thức.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["academicYears"] })}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Tải lại
          </Button>
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2"
            disabled={!canEdit}
          >
            <Plus className="h-4 w-4" />
            Thêm năm học
          </Button>
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Chỉ Ban điều hành có thể chỉnh sửa năm học. Bạn có thể xem danh sách bên dưới.
        </div>
      )}

      {feedback && (
        <div
          className={clsx(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Đang tải danh sách năm học...
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Không thể tải năm học: {loadError}
          {showMigrationHint && (
            <p className="mt-1 text-xs text-rose-600">
              Kiểm tra migration supabase/migrations/20250307_create_academic_years.sql đã được áp dụng chưa.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="h-10 w-10 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-700">Công thức điểm danh</p>
                <p className="text-sm text-emerald-700/90">
                  Hệ thống dùng số tuần mỗi học kỳ để tính điểm danh chuẩn hóa về thang 10. Bạn có thể chỉnh sửa
                  số tuần nếu có nghỉ hè hoặc lịch phụng vụ đặc biệt.
                </p>
              </div>
            </div>
          </div>

          {currentYear && (
            <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-emerald-600">Năm học hiện tại</p>
                  <p className="text-lg font-semibold text-slate-900">{currentYear.name}</p>
                  <p className="text-sm text-slate-600">{formatRange(currentYear.start_date, currentYear.end_date)}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p>Tuần HK1: {currentYear.semester1_weeks ?? "-"}</p>
                  <p>Tuần HK2: {currentYear.semester2_weeks ?? "-"}</p>
                  <p className="font-semibold text-slate-800">Tổng tuần: {currentYear.total_weeks}</p>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full table-fixed divide-y">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Năm học</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Học kỳ 1</th>
                  <th className="px-4 py-3">Học kỳ 2</th>
                  <th className="px-4 py-3">Số tuần</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {academicYears.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                      Chưa có năm học nào. Thêm mới để bắt đầu cấu hình.
                    </td>
                  </tr>
                ) : (
                  academicYears.map((year) => {
                    const status = resolveStatus(year);
                    return (
                      <tr key={year.id} className="text-sm text-slate-700">
                        <td className="px-4 py-3 font-semibold text-slate-900">{year.name}</td>
                        <td className="px-4 py-3">{formatRange(year.start_date, year.end_date)}</td>
                        <td className="px-4 py-3">
                          {formatRange(year.semester1_start ?? "", year.semester1_end ?? "")}
                        </td>
                        <td className="px-4 py-3">
                          {formatRange(year.semester2_start ?? "", year.semester2_end ?? "")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p>HK1: {year.semester1_weeks ?? "-"}</p>
                            <p>HK2: {year.semester2_weeks ?? "-"}</p>
                            <p className="font-semibold text-slate-900">Tổng: {year.total_weeks}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("rounded-full border px-2 py-1 text-xs font-semibold", status.className)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(year)}
                              disabled={!canEdit}
                            >
                              Chỉnh sửa
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setCurrent.mutate(year.id)}
                              disabled={!canEdit || year.is_current || setCurrent.isPending}
                              className="min-w-[120px]"
                            >
                              {year.is_current ? "Đang dùng" : setCurrent.isPending ? "Đang cập nhật..." : "Đặt hiện tại"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (saveYear.isPending) return;
          setIsModalOpen(false);
        }}
        title={editingYear ? "Chỉnh sửa năm học" : "Thêm năm học"}
        description="Thiết lập khung thời gian năm học và học kỳ."
        size="xl"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Tên năm học"
              placeholder="Ví dụ: 2024 - 2025"
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              required
              disabled={saveYear.isPending}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={formState.is_current}
                onChange={(e) => setFormState({ ...formState, is_current: e.target.checked })}
                disabled={saveYear.isPending}
              />
              Đặt làm năm học hiện tại
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Bắt đầu năm học"
              type="date"
              value={formState.start_date}
              onChange={(e) => setFormState({ ...formState, start_date: e.target.value })}
              required
              disabled={saveYear.isPending}
            />
            <Input
              label="Kết thúc năm học"
              type="date"
              value={formState.end_date}
              onChange={(e) => setFormState({ ...formState, end_date: e.target.value })}
              required
              disabled={saveYear.isPending}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Bắt đầu HK1"
              type="date"
              value={formState.semester1_start}
              onChange={(e) => setFormState({ ...formState, semester1_start: e.target.value })}
              required
              disabled={saveYear.isPending}
            />
            <Input
              label="Kết thúc HK1"
              type="date"
              value={formState.semester1_end}
              onChange={(e) => setFormState({ ...formState, semester1_end: e.target.value })}
              required
              disabled={saveYear.isPending}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Bắt đầu HK2"
              type="date"
              value={formState.semester2_start}
              onChange={(e) => setFormState({ ...formState, semester2_start: e.target.value })}
              required
              disabled={saveYear.isPending}
            />
            <Input
              label="Kết thúc HK2"
              type="date"
              value={formState.semester2_end}
              onChange={(e) => setFormState({ ...formState, semester2_end: e.target.value })}
              required
              disabled={saveYear.isPending}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="Số tuần HK1"
              type="number"
              min={1}
              value={formState.semester1_weeks}
              onChange={(e) => setFormState({ ...formState, semester1_weeks: e.target.value })}
              helperText="Nếu bỏ trống hệ thống sẽ tự tính theo ngày."
              disabled={saveYear.isPending}
            />
            <Input
              label="Số tuần HK2"
              type="number"
              min={1}
              value={formState.semester2_weeks}
              onChange={(e) => setFormState({ ...formState, semester2_weeks: e.target.value })}
              helperText="Có thể điều chỉnh theo lịch nghỉ hè, lễ."
              disabled={saveYear.isPending}
            />
            <Input
              label="Tổng số tuần"
              type="number"
              min={1}
              value={formState.total_weeks}
              onChange={(e) => setFormState({ ...formState, total_weeks: e.target.value })}
              helperText="Mặc định tính từ ngày bắt đầu đến kết thúc."
              disabled={saveYear.isPending}
            />
          </div>

          {formError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (saveYear.isPending) return;
                setIsModalOpen(false);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saveYear.isPending || !canEdit}>
              {saveYear.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </span>
              ) : (
                "Lưu"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
