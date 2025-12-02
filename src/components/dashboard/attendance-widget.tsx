interface AttendanceSession {
  session: string;
  present: number;
  pending: number;
}

interface AttendanceWidgetProps {
  sessions: AttendanceSession[];
}

export function AttendanceWidget({ sessions }: AttendanceWidgetProps) {
  // Take only 2 sessions for the compact view
  const displaySessions = sessions.slice(0, 2);

  return (
    <div className="relative h-[305px] rounded-[15px] border border-white/60 bg-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="font-inter-tight text-[34px] font-medium leading-tight tracking-tight text-black">
          <p className="mb-0">Điểm danh</p>
          <p>7 ngày qua</p>
        </div>
        <button className="flex size-12 rotate-[316deg] items-center justify-center rounded-full">
          <svg className="size-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Sessions */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {displaySessions.map((item, index) => (
          <div key={item.session} className="space-y-2">
            <p className="font-inter-tight text-lg font-medium text-black">{item.session}</p>
            <div className="flex gap-3">
              {/* Present bar */}
              <div className={`rounded-lg bg-[#fa865e] p-3 ${index === 0 ? "h-[112px] w-[91px]" : "h-[130px] w-[91px]"}`}>
                <p className="font-inter-tight text-base font-normal text-white">{item.present}</p>
                <p className="font-inter-tight text-sm text-white">Có mặt</p>
              </div>
              {/* Pending bar */}
              <div className={`rounded-lg bg-[#f3f3f3] p-3 ${index === 0 ? "h-[64px] w-[91px]" : "h-[47px] w-[91px]"}`}>
                <p className="font-inter-tight text-base font-normal text-black">{item.pending}</p>
                <p className="font-inter-tight text-sm text-black">Vắng mặt</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
