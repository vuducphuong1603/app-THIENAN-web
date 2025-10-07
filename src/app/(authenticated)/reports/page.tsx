"use client";

import { useState } from "react";

const reportData = [
  {
    id: "report-1",
    type: "Điểm danh",
    time: "Tuần 3 - 2026",
    scope: "Ngành Chiên",
    createdAt: "25/01/2026",
  },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState("attendance");

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Báo cáo</h2>
        <p className="text-sm text-slate-500">Tạo và xem trước báo cáo điểm danh, điểm số.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Tạo báo cáo mới</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Chọn tuần</option>
          </select>
          <div className="grid gap-2 md:grid-cols-2">
            <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Từ ngày" />
            <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Đến ngày" />
          </div>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
          >
            <option value="attendance">Báo cáo điểm danh</option>
            <option value="score">Báo cáo điểm số</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Tất cả ngành</option>
            <option>Chiên</option>
            <option>Ấu</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Tất cả lớp</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Năm học 2025-2026</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Tất cả buổi</option>
            <option>Thứ 5</option>
            <option>Chủ nhật</option>
          </select>
        </div>

        {selectedType === "score" && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Chọn cột điểm số để xuất</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              {[
                "Đi lễ Thứ 5",
                "Thi HK1",
                "Học giáo lý",
                "45' HK2",
                "Điểm trung bình",
                "Thi HK2",
                "45' HK1",
                "Điểm tổng",
              ].map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" defaultChecked />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Hủy</button>
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Tạo báo cáo</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Xem trước báo cáo</h3>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">{selectedType === "attendance" ? "Báo cáo điểm danh" : "Báo cáo điểm số"}</p>
            <p className="text-xs text-slate-500">Chọn thông số và nhấn xuất để tải xuống.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Xuất ảnh PNG</button>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Xuất Excel</button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {reportData.map((report) => (
            <div key={report.id} className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-700">{report.type}</p>
              <p>Khoảng thời gian: {report.time}</p>
              <p>Ngành/Lớp: {report.scope}</p>
              <p>Ngày tạo: {report.createdAt}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
