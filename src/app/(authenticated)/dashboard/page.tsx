import { createSupabaseServerClient } from "@/lib/supabase/server";

type SummaryMetrics = {
  academic_year: string;
  total_weeks: number;
  sectors: number;
  classes: number;
  students: number;
  teachers: number;
};

type SectorMetrics = {
  sector: string;
  total_classes: number;
  total_students: number;
  total_teachers: number;
  attendance_avg: number;
  study_avg: number;
};

const defaultSummary: SummaryMetrics = {
  academic_year: "2025 - 2026",
  total_weeks: 40,
  sectors: 4,
  classes: 12,
  students: 320,
  teachers: 48,
};

const defaultSectors: SectorMetrics[] = [
  {
    sector: "Chiên",
    total_classes: 3,
    total_students: 80,
    total_teachers: 12,
    attendance_avg: 9.2,
    study_avg: 8.5,
  },
  {
    sector: "Ấu",
    total_classes: 3,
    total_students: 82,
    total_teachers: 12,
    attendance_avg: 9.0,
    study_avg: 8.4,
  },
  {
    sector: "Thiếu",
    total_classes: 3,
    total_students: 90,
    total_teachers: 12,
    attendance_avg: 9.3,
    study_avg: 8.9,
  },
  {
    sector: "Nghĩa",
    total_classes: 3,
    total_students: 68,
    total_teachers: 12,
    attendance_avg: 9.1,
    study_avg: 8.7,
  },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: summaryData }, { data: sectorData }] = await Promise.all([
    supabase.rpc("dashboard_summary").maybeSingle(),
    supabase
      .from("sector_overview")
      .select(
        "sector, total_classes, total_students, total_teachers, attendance_avg, study_avg",
      ),
  ]);

  const resolvedSummary: SummaryMetrics = {
    ...defaultSummary,
    ...(summaryData as Partial<SummaryMetrics> | null | undefined),
  };

  const sectors: SectorMetrics[] = (sectorData as SectorMetrics[] | null | undefined) ?? defaultSectors;

  const attendance = [
    { session: "Thứ 5", present: 210, pending: 18 },
    { session: "Chủ nhật", present: 298, pending: 4 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Chào mừng,</p>
          <h2 className="text-2xl font-semibold text-slate-900">Thiếu Nhi Thiên Ân!</h2>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p>Năm học hiện tại: {resolvedSummary.academic_year}</p>
          <p>Tổng số tuần: {resolvedSummary.total_weeks}</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng số ngành",
            value: resolvedSummary.sectors,
          },
          {
            label: "Tổng số lớp",
            value: resolvedSummary.classes,
          },
          {
            label: "Tổng thiếu nhi",
            value: resolvedSummary.students,
          },
          {
            label: "Giáo lý viên",
            value: resolvedSummary.teachers,
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Thống kê theo ngành</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sectors.map((sector) => (
            <div key={sector.sector} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-800">{sector.sector}</p>
                <p className="text-xs text-slate-500">{sector.total_classes} lớp</p>
              </div>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>Số thiếu nhi: {sector.total_students}</p>
                <p>Giáo lý viên: {sector.total_teachers}</p>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>
                  Điểm danh TB:
                  <span className="font-semibold text-emerald-700"> {sector.attendance_avg}</span>
                </p>
                <p>
                  Học tập TB:
                  <span className="font-semibold text-emerald-700"> {sector.study_avg}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Điểm danh 7 ngày qua</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {attendance.map((item) => (
            <div key={item.session} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-base font-semibold text-slate-800">{item.session}</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-emerald-700">Có mặt: {item.present}</p>
                <p className="text-slate-500">Chưa điểm danh: {item.pending}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
