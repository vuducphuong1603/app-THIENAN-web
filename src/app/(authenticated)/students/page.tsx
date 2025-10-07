"use client";

import { useState } from "react";

const mockStudents = [
  {
    id: "TN001",
    saintName: "Th. Gioan",
    fullName: "Nguyễn Văn H",
    className: "Chiên 1",
    age: 9,
    parent1: "0912345678",
    parent2: "0987654321",
    scores: {
      hk1_45: 8,
      hk1_exam: 9,
      hk2_45: 8.5,
      hk2_exam: 9,
    },
    attendanceThu5: 9.3,
    attendanceSunday: 9.6,
  },
];

export default function StudentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editStudent, setEditStudent] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Danh sách thiếu nhi</h2>
        <p className="text-sm text-slate-500">Quản lý thông tin, điểm số và điểm danh thiếu nhi.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tìm theo tên hoặc mã TN" />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Tất cả lớp</option>
            <option>Chiên 1</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Trạng thái: Đang học</option>
            <option>Đã xóa</option>
          </select>
          <button className="rounded-lg border border-dashed border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50">
            Import thiếu nhi
          </button>
          <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setShowCreate(true)}>
            Thêm thiếu nhi
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockStudents.map((student) => {
          const averageStudy = ((student.scores.hk1_45 + student.scores.hk2_45 + student.scores.hk1_exam * 2 + student.scores.hk2_exam * 2) / 6).toFixed(2);
          const attendanceAvg = ((student.attendanceThu5 + student.attendanceSunday) / 2).toFixed(2);
          const totalAvg = (Number(averageStudy) * 0.6 + Number(attendanceAvg) * 4).toFixed(2);

          return (
            <article key={student.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <header className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{student.saintName}</p>
                  <h3 className="text-base font-semibold text-slate-800">{student.fullName}</h3>
                  <p className="text-xs text-slate-500">Mã TN: {student.id}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Lớp: {student.className}</p>
                  <p>Tuổi: {student.age}</p>
                </div>
              </header>

              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p>Liên hệ PH 1: {student.parent1}</p>
                <p>Liên hệ PH 2: {student.parent2}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-semibold text-slate-700">HK1 - 45 phút</p>
                    <p>{student.scores.hk1_45}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-semibold text-slate-700">HK1 - Thi (x2)</p>
                    <p>{student.scores.hk1_exam}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-semibold text-slate-700">HK2 - 45 phút</p>
                    <p>{student.scores.hk2_45}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="font-semibold text-slate-700">HK2 - Thi (x2)</p>
                    <p>{student.scores.hk2_exam}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <p className="font-semibold text-emerald-700">Điểm danh Thứ 5</p>
                    <p>{student.attendanceThu5}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <p className="font-semibold text-emerald-700">Điểm danh Chủ nhật</p>
                    <p>{student.attendanceSunday}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-100 p-2">
                    <p className="font-semibold text-slate-700">Trung bình GL</p>
                    <p>{averageStudy}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-2">
                    <p className="font-semibold text-slate-700">Trung bình DD</p>
                    <p>{attendanceAvg}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-100 p-2">
                    <p className="font-semibold text-emerald-700">Tổng trung bình</p>
                    <p>{totalAvg}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2 text-xs">
                <button className="flex-1 rounded-md border border-slate-200 px-3 py-1 text-slate-600" onClick={() => setEditScore(student.id)}>
                  Sửa điểm
                </button>
                <button className="flex-1 rounded-md border border-slate-200 px-3 py-1 text-slate-600" onClick={() => setEditStudent(student.id)}>
                  Sửa thông tin
                </button>
                <button className="flex-1 rounded-md border border-red-200 px-3 py-1 text-red-600">Xóa</button>
              </div>
            </article>
          );
        })}
      </section>

      {(showCreate || editStudent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <header className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {showCreate ? "Thêm thiếu nhi" : "Cập nhật thông tin thiếu nhi"}
              </h3>
              <p className="text-xs text-slate-500">
                Điền thông tin cơ bản và điểm số; điểm trung bình được tính tự động.
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                Công thức: (45 phút HK1 + 45 phút HK2 + Thi HK1 x2 + Thi HK2 x2) / 6
              </p>
              <p className="text-xs text-emerald-600">
                Điểm tổng = Điểm giáo lý x0.6 + Điểm điểm danh x4
              </p>
            </header>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Mã thiếu nhi" />
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option>Chọn lớp</option>
              </select>
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tên thánh" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Họ và tên" />
              <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="SĐT thiếu nhi" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="SĐT phụ huynh 1" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="SĐT phụ huynh 2" />
              <textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Địa chỉ" />
              <textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Ghi chú" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-700">Điểm giáo lý</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="HK1 - 45 phút" />
                  <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="HK1 - Thi (x2)" />
                  <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="HK2 - 45 phút" />
                  <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="HK2 - Thi (x2)" />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Ghi chú tính điểm</p>
                <p className="text-xs">
                  Điểm danh và điểm tổng được tính động dựa trên số buổi tham gia Thứ 5 + Chủ nhật.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                onClick={() => {
                  setShowCreate(false);
                  setEditStudent(null);
                }}
              >
                Hủy
              </button>
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                {showCreate ? "Thêm" : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Cập nhật điểm</h3>
            <p className="mt-1 text-xs text-emerald-600">
              Công thức: (45 phút HK1 + 45 phút HK2 + Thi HK1 x2 + Thi HK2 x2) / 6
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="HK1 - 45 phút" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="HK1 - Thi (x2)" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="HK2 - 45 phút" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="HK2 - Thi (x2)" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => setEditScore(null)}>
                Hủy
              </button>
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Lưu điểm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
