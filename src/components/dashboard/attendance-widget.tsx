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

  // Calculate max present value for dynamic height
  const maxPresent = Math.max(...displaySessions.map(s => s.present), 1);

  return (
    <div className="relative h-[305px] overflow-hidden rounded-[15px] border border-white/60 bg-white p-6">
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
      <div className="mt-4 grid grid-cols-2 gap-6">
        {displaySessions.map((item) => {
          // Calculate dynamic heights based on values
          const presentHeight = Math.max(80, Math.min(130, (item.present / maxPresent) * 130));
          const pendingHeight = Math.max(47, Math.min(80, 80 - ((item.present / maxPresent) * 30)));

          return (
            <div key={item.session} className="space-y-2">
              <p className="font-inter-tight text-lg font-medium text-black">{item.session}</p>
              <div className="flex items-end gap-3">
                {/* Present bar */}
                <div
                  className="flex w-[91px] flex-col justify-start rounded-lg bg-[#fa865e] p-3"
                  style={{ height: `${presentHeight}px` }}
                >
                  <p className="font-inter-tight text-base font-normal text-white">{item.present}</p>
                  <p className="font-inter-tight text-sm text-white">Có mặt</p>
                </div>
                {/* Pending bar */}
                <div
                  className="flex w-[91px] flex-col justify-start rounded-lg bg-[#f3f3f3] p-3"
                  style={{ height: `${pendingHeight}px` }}
                >
                  <p className="font-inter-tight text-base font-normal text-black">{item.pending}</p>
                  <p className="font-inter-tight text-sm text-black">Vắng mặt</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
