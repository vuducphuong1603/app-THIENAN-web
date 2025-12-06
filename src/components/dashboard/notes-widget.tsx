"use client";

import Image from "next/image";
import Link from "next/link";

interface CurrentTask {
  title: string;
  time?: string;
  location?: string;
  room?: string;
  status: "in_progress" | "completed" | "pending";
  imageUrl?: string;
}

interface NotesWidgetProps {
  classesTeaching: number;
  studentsInClasses: number;
  activitiesJoined: string;
  activityLocation?: string;
  activityTime?: string;
  completionPercentage: number;
  currentTask?: CurrentTask;
}

export function NotesWidget({
  classesTeaching,
  studentsInClasses,
  activitiesJoined,
  activityLocation = "Tại nhà thờ",
  activityTime = "14:00",
  completionPercentage,
  currentTask
}: NotesWidgetProps) {
  return (
    <div className="h-[481px] rounded-[15px] border border-white/60 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/notes" className="font-outfit text-xl font-medium text-black transition hover:text-[#fa865e]">
          Ghi chú của tôi
        </Link>
        <Link href="/dashboard/notes" className="flex size-[45px] items-center justify-center rounded-full bg-[#f6f6f6] transition hover:bg-[#e5e1dc]">
          <svg className="size-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mt-4 flex gap-3">
        {/* Add Note Button */}
        <Link href="/dashboard/notes" className="flex h-[132px] w-[125px] flex-col items-center justify-center rounded-3xl border border-dashed border-black/20 bg-[#f6f6f6] transition hover:bg-[#e5e1dc]">
          <svg className="size-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>

        {/* Classes Card */}
        <div className="h-[132px] w-[173px] rounded-[30px] bg-[#f6f6f6] p-4">
          <svg className="size-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div className="mt-2">
            <p className="font-inter-tight text-sm text-black/60">Lớp đang dạy</p>
            <p className="font-inter-tight text-2xl font-medium text-black">
              {classesTeaching} <span className="text-base text-black/40">lớp</span>
            </p>
          </div>
          <p className="mt-2 font-inter-tight text-sm text-black">{studentsInClasses} thiếu nhi</p>
        </div>

        {/* Activities Card */}
        <div className="h-[132px] w-[174px] rounded-3xl bg-[#f6f6f6] p-4">
          <svg className="size-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="mt-2">
            <p className="font-inter-tight text-sm text-black/60">Tham gia hoạt động</p>
            <p className="font-inter-tight text-2xl font-medium text-black">{activitiesJoined}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <p className="font-inter-tight text-sm text-[#d50000]">{activityLocation}</p>
            <p className="font-outfit text-sm text-black">{activityTime}</p>
          </div>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="mt-4 rounded-3xl bg-[#f6f6f6] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-3xl border border-transparent bg-gradient-to-b from-white to-transparent p-3">
              <span className="text-2xl">🔥</span>
            </div>
            <span className="font-inter-tight text-base font-medium text-black">Hoàn thành</span>
          </div>
          <div className="font-outfit text-2xl font-medium text-black">
            {completionPercentage}<span className="text-base text-black/20">%</span>
          </div>
        </div>
        {/* Progress bars */}
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 26 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-3.5 rounded ${
                i < Math.floor(completionPercentage / 4) ? "bg-[#fa865e]" : "bg-[#edebe7]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Today's Plan */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="font-inter-tight text-xl font-medium text-black">Kế hoạch hoạt động hôm nay</span>
          <div className="flex items-center gap-4">
            <button className="p-1">
              <svg className="size-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button className="p-1">
              <svg className="size-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Current Task */}
        {currentTask && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative size-20 overflow-hidden rounded-full">
                {currentTask.imageUrl ? (
                  <Image
                    src={currentTask.imageUrl}
                    alt={currentTask.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#fa865e] to-[#e5764e]">
                    <span className="text-2xl text-white">📚</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-inter-tight text-lg font-medium text-black">{currentTask.title}</p>
                <div className="flex items-center gap-4 text-sm text-black/40">
                  {currentTask.time && (
                    <span className="flex items-center gap-1">
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {currentTask.time}
                    </span>
                  )}
                  {currentTask.location && <span>{currentTask.location}</span>}
                  {currentTask.room && <span>{currentTask.room}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="size-5 text-[#fa865e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-inter-tight text-sm text-[#fa865e]">
                    {currentTask.status === "in_progress" ? "Đang thực hiện" : currentTask.status === "completed" ? "Hoàn thành" : "Chờ thực hiện"}
                  </span>
                </div>
              </div>
            </div>
            <button className="h-[50px] w-[70px] rounded-full bg-[#fa865e] font-outfit text-base font-medium text-white">
              HỦY
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
