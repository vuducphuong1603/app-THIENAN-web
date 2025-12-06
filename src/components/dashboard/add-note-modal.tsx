"use client";

import { useState } from "react";

type ReminderOption = "30_min" | "2_hours" | "1_day" | "custom";

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: NoteFormData) => void;
}

export interface NoteFormData {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reminder: ReminderOption;
  description: string;
  link: string;
}

export function AddNoteModal({ isOpen, onClose, onSubmit }: AddNoteModalProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [reminder, setReminder] = useState<ReminderOption>("2_hours");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit({
      title,
      startDate,
      endDate,
      startTime,
      endTime,
      reminder,
      description,
      link,
    });

    // Reset form
    setTitle("");
    setStartDate("");
    setEndDate("");
    setStartTime("08:00");
    setEndTime("16:00");
    setReminder("2_hours");
    setDescription("");
    setLink("");
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  const reminderOptions: { value: ReminderOption; label: string }[] = [
    { value: "30_min", label: "30 phút" },
    { value: "2_hours", label: "2 tiếng" },
    { value: "1_day", label: "1 ngày" },
    { value: "custom", label: "Tự đặt giờ" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex w-[594px] flex-col gap-[21px] rounded-2xl bg-white p-8">
        {/* Header with Icon */}
        <div className="flex flex-col items-center gap-4">
          {/* Plus Icon */}
          <div className="flex size-[85px] items-center justify-center">
            <div className="flex items-center justify-center rounded-full border border-[#fff0f3] bg-gradient-to-b from-[#fa865e]/20 to-transparent p-4">
              <div className="flex items-center justify-center rounded-full border border-[#fa865e]/40 p-3.5 shadow-sm">
                <svg
                  className="size-6 text-[#fa865e]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Title and Subtitle */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-inter-tight text-2xl font-semibold text-black">
              Thêm ghi chú
            </h2>
            <p className="font-inter-tight text-sm text-black/40">
              Thêm ghi chú về công việc, kế hoạch, sự kiện
            </p>
          </div>
        </div>

        {/* Note Name Card */}
        <div className="overflow-hidden rounded-2xl border border-[#e5e1dc] bg-white">
          {/* Header - Note Title Input */}
          <div className="border-b border-[#e5e1dc] p-4">
            <input
              type="text"
              placeholder="Tên ghi chú"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent font-inter-tight text-sm text-black placeholder:text-[#8a8c90] focus:outline-none"
            />
          </div>

          {/* Date and Time Row */}
          <div className="flex gap-4 p-4">
            <div className="flex flex-1 items-center gap-2">
              <div className="flex size-4 items-center justify-center rounded-full bg-[#fa865e]">
                <svg className="size-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-inter-tight text-sm font-medium text-black">
                Ngày:{" "}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[110px] bg-transparent text-black focus:outline-none"
                />
                {" - "}
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[110px] bg-transparent text-black focus:outline-none"
                />
              </span>
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div className="flex size-4 items-center justify-center rounded-full bg-[#fa865e]">
                <svg className="size-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-inter-tight text-sm font-medium text-black">
                Giờ:{" "}
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-transparent text-black focus:outline-none"
                />
                {" - "}
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-transparent text-black focus:outline-none"
                />
              </span>
            </div>
          </div>
        </div>

        {/* Reminder Options */}
        <div className="flex flex-col gap-1.5">
          <label className="font-inter-tight text-sm font-medium">
            <span className="text-[#666d80]">Nhắc hẹn trước </span>
            <span className="text-[#df1c41]">*</span>
          </label>
          <div className="flex gap-1.5">
            {reminderOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setReminder(option.value)}
                className={`flex h-8 w-[108px] items-center justify-center rounded-full font-inter-tight text-sm shadow-sm transition ${
                  reminder === option.value
                    ? "bg-[#fa865e] text-white"
                    : "bg-[#e5e1dc] text-black hover:bg-[#d5d1cc]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description Input */}
        <div className="flex flex-col gap-1.5">
          <label className="font-inter-tight text-sm font-medium text-[#666d80]">
            Mô tả
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-[43px] w-full rounded-xl bg-[#f6f6f6] px-4 font-inter-tight text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#fa865e]/30"
          />
        </div>

        {/* Link Input */}
        <div className="flex flex-col gap-1.5">
          <label className="font-inter-tight text-sm font-medium text-[#666d80]">
            Link đính kèm
          </label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="h-[43px] w-full rounded-xl bg-[#f6f6f6] px-4 font-inter-tight text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#fa865e]/30"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleClose}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#f6f6f6] font-inter-tight text-base font-semibold text-black transition hover:bg-[#edebe7]"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#fa865e] font-inter-tight text-base font-semibold text-white shadow-sm transition hover:bg-[#e5764e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tạo kế hoạch
          </button>
        </div>
      </div>
    </div>
  );
}
