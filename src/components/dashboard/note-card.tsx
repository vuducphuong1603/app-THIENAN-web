"use client";

import type { NoteStatus } from "@/lib/actions/notes";

interface NoteCardProps {
  id: string;
  title: string;
  description?: string;
  time?: string;
  date?: string;
  status?: NoteStatus;
  onCancel?: (id: string) => void;
  onComplete?: (id: string) => void;
}

const statusColors: Record<NoteStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-[#fa865e]/20", text: "text-[#fa865e]", label: "Chờ thực hiện" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-600", label: "Đang thực hiện" },
  completed: { bg: "bg-green-100", text: "text-green-600", label: "Hoàn thành" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-500", label: "Đã hủy" },
};

export function NoteCard({
  id,
  title,
  description,
  time,
  date = "Hôm nay",
  status = "pending",
  onCancel,
  onComplete,
}: NoteCardProps) {
  const statusStyle = statusColors[status];
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  return (
    <div className={`relative h-[332px] w-full rounded-[26px] border border-white/60 bg-white p-4 ${isCompleted || isCancelled ? "opacity-75" : ""}`}>
      {/* Top row: Tag and Status badge */}
      <div className="flex items-start justify-between">
        <div className="rounded-full border border-[#fa865e] bg-[#fa865e]/20 px-3 py-1.5 backdrop-blur-sm">
          <span className="font-inter-tight text-sm text-[#fa865e]">Ghi chú</span>
        </div>
        <div className={`rounded-full px-3 py-1.5 ${statusStyle.bg}`}>
          <span className={`font-inter-tight text-xs ${statusStyle.text}`}>{statusStyle.label}</span>
        </div>
      </div>

      {/* Date badge */}
      <div className="mt-[100px] flex justify-end">
        <div className="rounded-full bg-[#fa865e] px-3 py-1.5">
          <span className="font-inter-tight text-sm text-white">{date}</span>
        </div>
      </div>

      {/* Title and info */}
      <div className="mt-6">
        <h3 className={`font-inter-tight text-lg font-medium text-black ${isCompleted ? "line-through" : ""}`}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="mt-2 line-clamp-2 font-inter-tight text-sm text-black/60">
            {description}
          </p>
        )}

        {/* Info row */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {time && (
            <div className="flex items-center gap-1.5">
              <svg className="size-4 text-[#fa865e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-inter-tight text-sm text-black/60">{time}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isCompleted && !isCancelled && (
          <div className="mt-2.5 flex gap-1.5">
            <button
              onClick={() => onCancel?.(id)}
              className="flex h-8 w-28 items-center justify-center rounded-full bg-[#e5e1dc] font-inter-tight text-sm text-black shadow-sm transition hover:bg-[#d5d1cc]"
            >
              Hủy
            </button>
            <button
              onClick={() => onComplete?.(id)}
              className="flex h-8 w-[108px] items-center justify-center rounded-full bg-[#fa865e] font-inter-tight text-sm text-white shadow-sm transition hover:bg-[#e5764e]"
            >
              Hoàn thành
            </button>
          </div>
        )}

        {/* Completed/Cancelled state */}
        {(isCompleted || isCancelled) && (
          <div className="mt-2.5 flex gap-1.5">
            <button
              onClick={() => onCancel?.(id)}
              className="flex h-8 w-full items-center justify-center rounded-full bg-red-50 font-inter-tight text-sm text-red-500 shadow-sm transition hover:bg-red-100"
            >
              Xóa ghi chú
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AddNoteCard({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[332px] w-full flex-col items-center justify-center rounded-[26px] border border-dashed border-[#666d80] bg-[#f6f6f6] py-[72px] transition hover:bg-[#edebe7]"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Icon container */}
        <div className="flex size-[84px] items-center justify-center">
          <div className="rounded-full border border-[#fff0f3] bg-gradient-to-b from-[#fa865e]/20 to-transparent p-4">
            <div className="flex items-center justify-center rounded-full border border-[#fa865e]/40 p-3.5 shadow-sm">
              <svg className="size-6 text-[#fa865e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="font-inter-tight text-2xl font-semibold text-black">Thêm ghi chú</p>
          <p className="font-inter-tight text-sm text-black/40">Ghi chú hoạt động của bạn</p>
        </div>
      </div>
    </button>
  );
}
