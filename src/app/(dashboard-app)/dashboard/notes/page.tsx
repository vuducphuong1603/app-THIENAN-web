"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { NoteCard, AddNoteCard } from "@/components/dashboard/note-card";
import { AddNoteModal, NoteFormData } from "@/components/dashboard/add-note-modal";
import {
  fetchNotes,
  createNote,
  updateNoteStatus,
  deleteNote,
  type Note,
  type NoteStatus,
} from "@/lib/actions/notes";

type ViewMode = "day" | "week" | "month";
type StatusFilter = "all" | NoteStatus;

// Get Vietnamese day of week
function getVietnameseWeekday(date: Date): string {
  const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  return days[date.getDay()];
}

// Format date as dd/mm/yyyy
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format date as yyyy-mm-dd for API
function formatDateForApi(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

// Get start of week (Monday)
function getStartOfWeek(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  result.setDate(date.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Get end of week (Sunday)
function getEndOfWeek(date: Date): Date {
  const startOfWeek = getStartOfWeek(date);
  const result = new Date(startOfWeek);
  result.setDate(startOfWeek.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

// Get start of month
function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Get end of month
function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Get date range based on view mode
function getDateRange(date: Date, viewMode: ViewMode): { start: Date; end: Date } {
  switch (viewMode) {
    case "day":
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      return { start: dayStart, end: dayEnd };
    case "week":
      return { start: getStartOfWeek(date), end: getEndOfWeek(date) };
    case "month":
      return { start: getStartOfMonth(date), end: getEndOfMonth(date) };
  }
}

// Get display range text
function getDisplayRange(date: Date, viewMode: ViewMode): string {
  const { start, end } = getDateRange(date, viewMode);
  const startDay = String(start.getDate()).padStart(2, "0");
  const startMonth = String(start.getMonth() + 1).padStart(2, "0");
  const endDay = String(end.getDate()).padStart(2, "0");
  const endMonth = String(end.getMonth() + 1).padStart(2, "0");
  const year = end.getFullYear();

  if (viewMode === "day") {
    return `${startDay}/${startMonth}/${year}`;
  }
  return `${startDay}/${startMonth} - ${endDay}/${endMonth}/${year}`;
}

// Format display date for note card
function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return "Hôm nay";
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Hôm nay";

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return "Ngày mai";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

// Format time for display
function formatDisplayTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours, 10);
  if (hour < 12) {
    return `${hour}:${minutes} sáng`;
  } else if (hour === 12) {
    return `12:${minutes} trưa`;
  } else {
    return `${hour - 12}:${minutes} chiều`;
  }
}

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ thực hiện" },
  { value: "in_progress", label: "Đang thực hiện" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

export default function NotesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const weekdayName = getVietnameseWeekday(currentDate);
  const formattedDate = formatDate(currentDate);
  const displayRange = getDisplayRange(currentDate, viewMode);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigate to previous period
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case "day":
        newDate.setDate(newDate.getDate() - 1);
        break;
      case "week":
        newDate.setDate(newDate.getDate() - 7);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  // Navigate to next period
  const handleNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case "day":
        newDate.setDate(newDate.getDate() + 1);
        break;
      case "week":
        newDate.setDate(newDate.getDate() + 7);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  // Go to today
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Check if current date is today
  const isToday = currentDate.toDateString() === today.toDateString();

  // Fetch notes from database
  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { start, end } = getDateRange(currentDate, viewMode);
    const filters: { status?: NoteStatus; startDate?: string; endDate?: string } = {
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    };

    if (statusFilter !== "all") {
      filters.status = statusFilter;
    }

    const { data, error: fetchError } = await fetchNotes(filters);

    if (fetchError) {
      setError(fetchError);
      setNotes([]);
    } else {
      setNotes(data || []);
    }

    setIsLoading(false);
  }, [currentDate, viewMode, statusFilter]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCancel = async (id: string) => {
    const { success, error: deleteError } = await deleteNote(id);
    if (success) {
      setNotes(notes.filter((note) => note.id !== id));
    } else {
      console.error("Failed to delete note:", deleteError);
      alert("Không thể xóa ghi chú. Vui lòng thử lại.");
    }
  };

  const handleComplete = async (id: string) => {
    const { success, error: updateError } = await updateNoteStatus(id, "completed" as NoteStatus);
    if (success) {
      setNotes(notes.map((note) =>
        note.id === id ? { ...note, status: "completed" as NoteStatus } : note
      ));
    } else {
      console.error("Failed to complete note:", updateError);
      alert("Không thể cập nhật ghi chú. Vui lòng thử lại.");
    }
  };

  const handleAddNote = () => {
    setIsAddModalOpen(true);
  };

  const handleCreateNote = async (noteData: NoteFormData) => {
    const { data: newNote, error: createError } = await createNote({
      title: noteData.title,
      description: noteData.description,
      link: noteData.link,
      start_date: noteData.startDate || undefined,
      end_date: noteData.endDate || undefined,
      start_time: noteData.startTime || undefined,
      end_time: noteData.endTime || undefined,
      reminder: noteData.reminder,
    });

    if (createError) {
      console.error("Failed to create note:", createError);
      alert("Không thể tạo ghi chú. Vui lòng thử lại.");
      return;
    }

    if (newNote) {
      setNotes([newNote, ...notes]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="flex flex-col gap-1.5 py-0.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-[#666d80] transition hover:text-black"
        >
          <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-inter-tight text-sm">Quay trở lại</span>
        </Link>
        <h1 className="font-inter-tight text-[42px] font-bold text-black">Ghi chú của tôi</h1>
      </div>

      {/* Date Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left side: Date and Today button */}
        <div className="flex items-center gap-4">
          <span className="font-inter-tight text-xl text-black">
            {weekdayName}, {formattedDate}
          </span>
          <button
            onClick={handleToday}
            className={`flex h-[52px] items-center justify-center rounded-full border border-white/60 px-4 transition ${
              isToday ? "bg-[#fa865e] text-white" : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            <span className="font-inter-tight text-xl">Hôm nay</span>
          </button>
        </div>

        {/* Right side: View options, Date range, Filter */}
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex h-[52px] items-center gap-2 rounded-full border border-white/60 bg-white px-2">
            <button
              onClick={() => setViewMode("day")}
              className={`rounded-[38px] px-4 py-2 font-inter-tight text-xl transition ${
                viewMode === "day" ? "bg-[#e5e1dc] text-black" : "text-black/60 hover:text-black"
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`rounded-[38px] px-4 py-2 font-inter-tight text-xl transition ${
                viewMode === "week" ? "bg-[#e5e1dc] text-black" : "text-black/60 hover:text-black"
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`rounded-[38px] px-4 py-2 font-inter-tight text-xl transition ${
                viewMode === "month" ? "bg-[#e5e1dc] text-black" : "text-black/60 hover:text-black"
              }`}
            >
              Tháng
            </button>
          </div>

          {/* Date Range with Navigation */}
          <div className="flex h-[52px] items-center gap-2 rounded-full border border-white/60 bg-white px-2">
            <button
              onClick={handlePrevious}
              className="flex size-9 items-center justify-center rounded-full transition hover:bg-gray-100"
              title="Trước"
            >
              <svg className="size-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2 px-2">
              <svg className="size-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-inter-tight text-lg text-black">{displayRange}</span>
            </div>
            <button
              onClick={handleNext}
              className="flex size-9 items-center justify-center rounded-full transition hover:bg-gray-100"
              title="Tiếp"
            >
              <svg className="size-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex h-[52px] items-center gap-3 rounded-full border border-white/60 px-4 transition ${
                statusFilter !== "all" ? "bg-[#fa865e] text-white" : "bg-white text-black hover:bg-gray-50"
              }`}
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="font-inter-tight text-lg">
                {statusFilter === "all" ? "Filter" : statusFilterOptions.find(o => o.value === statusFilter)?.label}
              </span>
              <svg className={`size-4 transition ${isFilterOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Filter Dropdown Menu */}
            {isFilterOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-white/60 bg-white py-2 shadow-lg">
                {statusFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setIsFilterOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2 font-inter-tight text-sm transition hover:bg-gray-50 ${
                      statusFilter === option.value ? "bg-[#fa865e]/10 text-[#fa865e]" : "text-black"
                    }`}
                  >
                    {statusFilter === option.value && (
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span className={statusFilter === option.value ? "" : "ml-6"}>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-600">
          <p className="font-inter-tight text-sm">{error}</p>
          <button
            onClick={loadNotes}
            className="mt-2 font-inter-tight text-sm font-medium underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="size-8 animate-spin rounded-full border-4 border-[#fa865e] border-t-transparent" />
            <p className="font-inter-tight text-sm text-black/60">Đang tải ghi chú...</p>
          </div>
        </div>
      ) : (
        /* Notes Grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Add Note Card */}
          <AddNoteCard onClick={handleAddNote} />

          {/* Note Cards */}
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              id={note.id}
              title={note.title}
              description={note.description || undefined}
              time={formatDisplayTime(note.start_time)}
              date={formatDisplayDate(note.start_date)}
              status={note.status}
              onCancel={handleCancel}
              onComplete={handleComplete}
            />
          ))}

          {/* Empty State */}
          {notes.length === 0 && !error && (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <div className="flex size-20 items-center justify-center rounded-full bg-[#f6f6f6]">
                <svg className="size-10 text-[#666d80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="mt-4 font-inter-tight text-lg font-medium text-black">Chưa có ghi chú nào</p>
              <p className="mt-1 font-inter-tight text-sm text-black/60">Bấm vào nút &quot;Thêm ghi chú&quot; để tạo ghi chú đầu tiên</p>
            </div>
          )}
        </div>
      )}

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateNote}
      />
    </div>
  );
}
