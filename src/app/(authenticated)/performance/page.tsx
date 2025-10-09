"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const sundayData = [
  { week: "12/01", chien: 70, au: 68, thieu: 74, nghia: 65 },
  { week: "19/01", chien: 72, au: 71, thieu: 76, nghia: 66 },
  { week: "26/01", chien: 74, au: 73, thieu: 78, nghia: 68 },
];

const thursdayData = [
  { week: "15/01", chien: 52, au: 49, thieu: 54, nghia: 48 },
  { week: "22/01", chien: 54, au: 51, thieu: 57, nghia: 50 },
  { week: "29/01", chien: 56, au: 52, thieu: 59, nghia: 51 },
];

const colors = {
  chien: "#ec4899",
  au: "#22c55e",
  thieu: "#3b82f6",
  nghia: "#facc15",
};

export default function PerformancePage() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Thống kê điểm danh</h2>
        <p className="text-sm text-slate-500">Xu hướng 3 tuần gần nhất</p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Chủ nhật</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={sundayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#475569" />
              <YAxis stroke="#475569" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="chien" name="Ngành Chiên" fill={colors.chien} radius={[4, 4, 0, 0]} />
              <Bar dataKey="au" name="Ngành Ấu" fill={colors.au} radius={[4, 4, 0, 0]} />
              <Bar dataKey="thieu" name="Ngành Thiếu" fill={colors.thieu} radius={[4, 4, 0, 0]} />
              <Bar dataKey="nghia" name="Ngành Nghĩa" fill={colors.nghia} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {sundayData.map((item) => (
            <div key={item.week} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-700">Tuần: {item.week}</p>
              <p className="text-slate-600">
                Tổng thiếu nhi: {item.chien + item.au + item.thieu + item.nghia}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Thứ 5</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={thursdayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#475569" />
              <YAxis stroke="#475569" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="chien" name="Ngành Chiên" fill={colors.chien} radius={[4, 4, 0, 0]} />
              <Bar dataKey="au" name="Ngành Ấu" fill={colors.au} radius={[4, 4, 0, 0]} />
              <Bar dataKey="thieu" name="Ngành Thiếu" fill={colors.thieu} radius={[4, 4, 0, 0]} />
              <Bar dataKey="nghia" name="Ngành Nghĩa" fill={colors.nghia} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-800">Thống kê theo lớp trong ngành</h3>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <select className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm">
              <option>Ngành Chiên</option>
              <option>Ngành Ấu</option>
              <option>Ngành Thiếu</option>
              <option>Ngành Nghĩa</option>
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm">
              <option>Chủ nhật</option>
              <option>Thứ 5</option>
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm">
              <option>19/01/2026</option>
              <option>26/01/2026</option>
              <option>02/02/2026</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-slate-500">Tuần: 13/01 - 19/01/2026</p>
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={[
              { class: "Chiên 1", total: 28 },
              { class: "Chiên 2", total: 26 },
              { class: "Chiên 3", total: 25 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="class" stroke="#475569" />
              <YAxis stroke="#475569" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" name="Thiếu nhi điểm danh" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
