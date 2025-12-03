interface SectorStat {
  sector: string;
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  attendanceAvg?: number | null;
  studyAvg?: number | null;
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

// Simple line chart component for attendance and study averages
function LineChart({ sectors }: { sectors: SectorStat[] }) {
  const chartHeight = 80;
  const chartWidth = 280;
  const padding = 20;

  // Calculate normalized values for drawing
  const attendanceValues = sectors.map(s => s.attendanceAvg ?? 0);
  const studyValues = sectors.map(s => s.studyAvg ?? 0);
  const maxValue = Math.max(...attendanceValues, ...studyValues, 10);

  const getY = (value: number) => {
    const normalized = value / maxValue;
    return chartHeight - padding - (normalized * (chartHeight - 2 * padding));
  };

  const getX = (index: number) => {
    const step = (chartWidth - 2 * padding) / Math.max(sectors.length - 1, 1);
    return padding + index * step;
  };

  const createPath = (values: number[]) => {
    if (values.length === 0) return "";
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(v)}`)
      .join(" ");
  };

  return (
    <div className="mt-4 px-4">
      {/* Chart */}
      <svg width={chartWidth} height={chartHeight} className="mx-auto">
        {/* Grid line */}
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="#e5e5e5"
          strokeWidth="1"
        />

        {/* Attendance line (orange) */}
        <path
          d={createPath(attendanceValues)}
          fill="none"
          stroke="#fa865e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Study line (gray) */}
        <path
          d={createPath(studyValues)}
          fill="none"
          stroke="#d9d9d9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {attendanceValues.map((v, i) => (
          <circle
            key={`att-${i}`}
            cx={getX(i)}
            cy={getY(v)}
            r="3"
            fill="#fa865e"
          />
        ))}
        {studyValues.map((v, i) => (
          <circle
            key={`study-${i}`}
            cx={getX(i)}
            cy={getY(v)}
            r="3"
            fill="#d9d9d9"
          />
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between px-4">
        {sectors.map((s) => (
          <span key={s.sector} className="font-inter-tight text-[9px] text-black/80">
            {s.sector.split(" ")[0]}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-[#fa865e]" />
          <span className="font-outfit text-[11px] text-[#8a8c90]">Điểm danh trung bình</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-[#d9d9d9]" />
          <span className="font-outfit text-[11px] text-[#8a8c90]">Học tập trung bình</span>
        </div>
      </div>
    </div>
  );
}

export function SectorStatsWidget({ sectors }: SectorStatsWidgetProps) {
  // Calculate max values for progress bars
  const maxClasses = Math.max(...sectors.map(s => s.totalClasses), 1);
  const maxStudents = Math.max(...sectors.map(s => s.totalStudents), 1);
  const maxTeachers = Math.max(...sectors.map(s => s.totalTeachers), 1);

  return (
    <div className="h-[796px] overflow-hidden rounded-[15px] border border-white/60 bg-white">
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

      {/* Line Chart Section */}
      <LineChart sectors={sectors} />
    </div>
  );
}
