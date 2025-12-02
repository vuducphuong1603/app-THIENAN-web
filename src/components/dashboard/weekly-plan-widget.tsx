"use client";

interface WeekDay {
  label: string;
  date: number;
  isActive?: boolean;
  hasActivity?: boolean;
}

interface WeeklyPlanWidgetProps {
  weekNumber: number;
  activitiesCount: number;
  progress: {
    completed: number;
    inProgress: number;
    pending: number;
  };
  weekDays?: WeekDay[];
}

export function WeeklyPlanWidget({
  weekNumber,
  activitiesCount,
  progress,
  weekDays
}: WeeklyPlanWidgetProps) {
  // Default week days if not provided
  const defaultWeekDays: WeekDay[] = [
    { label: "CN", date: 21, hasActivity: true },
    { label: "T2", date: 22 },
    { label: "T3", date: 23, isActive: true, hasActivity: true },
    { label: "T4", date: 24 },
    { label: "T5", date: 25, hasActivity: true },
    { label: "T6", date: 26 },
    { label: "T7", date: 27, hasActivity: true },
  ];

  const days = weekDays || defaultWeekDays;

  return (
    <div className="h-[481px] rounded-[15px] border border-white/60 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-inter-tight text-xl font-medium text-black">Kế hoạch tuần này</span>
        <button className="flex size-12 items-center justify-center rounded-full bg-[#f6f6f6]">
          <svg className="size-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Week Days */}
      <div className="mt-8 flex items-center justify-between gap-2">
        {days.map((day) => (
          <div key={day.label} className="flex flex-col items-center gap-3">
            <span className="font-outfit text-base text-black">{day.label}</span>
            {day.hasActivity ? (
              <div className="relative">
                {/* Outer ring */}
                <div className={`size-[62px] rounded-full ${day.isActive ? "bg-[#6e62e5]" : "border-2 border-dashed border-[#fa865e]/30"}`}>
                  {!day.isActive && (
                    <div className="flex size-full items-center justify-center">
                      <div className="flex size-[50px] items-center justify-center rounded-full bg-white">
                        <span className="font-inter-tight text-xl text-black">{day.date}</span>
                      </div>
                    </div>
                  )}
                  {day.isActive && (
                    <div className="flex size-full items-center justify-center">
                      <span className="font-inter-tight text-xl text-white">{day.date}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <span className="font-inter-tight text-xl text-black">{day.date}</span>
            )}
          </div>
        ))}
      </div>

      {/* Progress Circle and Stats */}
      <div className="mt-8 flex items-center gap-8">
        {/* Progress Circle */}
        <div className="relative flex size-[251px] items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e1dc"
              strokeWidth="8"
            />
            {/* Purple (pending) */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e178ff"
              strokeWidth="8"
              strokeDasharray={`${progress.pending * 2.83} 283`}
              strokeDashoffset="0"
            />
            {/* Blue (in progress) */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#86d4ff"
              strokeWidth="8"
              strokeDasharray={`${progress.inProgress * 2.83} 283`}
              strokeDashoffset={`-${progress.pending * 2.83}`}
            />
            {/* Orange (completed) */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#fa865e"
              strokeWidth="8"
              strokeDasharray={`${progress.completed * 2.83} 283`}
              strokeDashoffset={`-${(progress.pending + progress.inProgress) * 2.83}`}
            />
          </svg>
          {/* Center content */}
          <div className="absolute flex flex-col items-center gap-2">
            <div className="rounded-full bg-[#6e62e5] px-5 py-2">
              <span className="font-inter-tight text-base font-medium text-white">T3 23</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="size-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="font-inter-tight text-[26px] text-black">Tuần {weekNumber}</span>
            </div>
            <span className="font-inter-tight text-xl text-black/50">{activitiesCount} hoạt động</span>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="flex flex-col gap-6">
          {/* Completed */}
          <div className="flex items-center gap-4">
            <div className="flex w-4 flex-col gap-0.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-0.5 w-full bg-[#fa865e]" />
              ))}
            </div>
            <div>
              <p className="font-outfit text-[22px] font-medium text-black">{progress.completed}%</p>
              <p className="font-inter-tight text-sm text-[#fa865e]">Hoàn thành</p>
            </div>
          </div>

          {/* In Progress */}
          <div className="flex items-center gap-4">
            <div className="flex w-4 flex-col gap-0.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className={`h-0.5 w-full ${i < 7 ? "bg-[#86d4ff]" : "bg-[#e5e1dc]"}`} />
              ))}
            </div>
            <div>
              <p className="font-outfit text-[22px] font-medium text-black">{progress.inProgress}%</p>
              <p className="font-inter-tight text-sm text-[#86d4ff]">Đang thực hiện</p>
            </div>
          </div>

          {/* Pending */}
          <div className="flex items-center gap-4">
            <div className="flex w-4 flex-col gap-0.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className={`h-0.5 w-full ${i < 7 ? "bg-[#e178ff]" : "bg-[#e5e1dc]"}`} />
              ))}
            </div>
            <div>
              <p className="font-outfit text-[22px] font-medium text-black">{progress.pending}%</p>
              <p className="font-inter-tight text-sm text-[#e178ff]">Chờ thực hiện</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
