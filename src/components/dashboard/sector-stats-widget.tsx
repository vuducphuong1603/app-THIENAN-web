interface SectorStat {
  sector: string;
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  maxClasses?: number;
  maxStudents?: number;
  maxTeachers?: number;
}

interface SectorStatsWidgetProps {
  sectors: SectorStat[];
}

function ProgressBar({ value, max, color = "#fa865e" }: { value: number; max: number; color?: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex h-[9px] w-full overflow-hidden rounded">
      <div
        className="rounded-l"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
      <div
        className="rounded-r bg-[#d9d9d9]"
        style={{ width: `${100 - percentage}%` }}
      />
    </div>
  );
}

export function SectorStatsWidget({ sectors }: SectorStatsWidgetProps) {
  // Calculate max values for progress bars
  const maxClasses = Math.max(...sectors.map(s => s.totalClasses), 1);
  const maxStudents = Math.max(...sectors.map(s => s.totalStudents), 1);
  const maxTeachers = Math.max(...sectors.map(s => s.totalTeachers), 1);

  return (
    <div className="h-[796px] rounded-[15px] border border-white/60 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <svg className="size-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="font-inter-tight text-xl font-medium text-black">Thống kê lớp</span>
        </div>
        <button className="flex size-12 items-center justify-center rounded-full bg-[#f6f6f6]">
          <svg className="size-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Sector Cards */}
      <div className="space-y-3 px-4">
        {sectors.map((sector) => (
          <div key={sector.sector} className="rounded-[14px] border border-white/40 bg-[#f6f6f6] p-4">
            <p className="mb-3 font-inter-tight text-base font-normal text-black">{sector.sector}</p>

            {/* Lớp */}
            <div className="mb-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-outfit text-[9px] text-black/80">Lớp</span>
                <span className="font-outfit text-[9px] text-black/80">{sector.totalClasses}</span>
              </div>
              <ProgressBar value={sector.totalClasses} max={maxClasses} />
            </div>

            {/* Thiếu nhi */}
            <div className="mb-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-outfit text-[9px] text-black/80">Thiếu nhi</span>
                <span className="font-outfit text-[9px] text-black/80">{sector.totalStudents}</span>
              </div>
              <ProgressBar value={sector.totalStudents} max={maxStudents} />
            </div>

            {/* Giáo lý viên */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-outfit text-[9px] text-black/80">Giáo lý viên</span>
                <span className="font-outfit text-[9px] text-black/80">{sector.totalTeachers}</span>
              </div>
              <ProgressBar value={sector.totalTeachers} max={maxTeachers} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
