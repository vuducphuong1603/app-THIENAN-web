"use client";

import { useState } from "react";

const sectorCards = [
  {
    sector: "Chiên",
    classes: [
      { id: "chien-1", name: "Chiên 1", teacher: "Th. Phêrô Nguyễn Văn C", students: 28 },
      { id: "chien-2", name: "Chiên 2", teacher: "Th. Maria Lê Thị D", students: 27 },
    ],
  },
  {
    sector: "Ấu",
    classes: [
      { id: "au-1", name: "Ấu 1", teacher: "Th. Giuse Nguyễn Văn E", students: 30 },
    ],
  },
];

export default function ClassesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Quản lý lớp học</h2>
        <p className="text-sm text-slate-500">Xem tổng quan, chỉnh sửa và phân công giáo lý viên.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tìm kiếm lớp" />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Tất cả ngành</option>
            <option>Chiên</option>
            <option>Ấu</option>
            <option>Thiếu</option>
            <option>Nghĩa</option>
          </select>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>Số lớp: 12</span>
            <span>Tổng thiếu nhi: 320</span>
          </div>
          <button
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setShowCreate(true)}
          >
            Thêm lớp
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {sectorCards.map((sector) => (
          <article key={sector.sector} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Ngành {sector.sector}</h3>
                <p className="text-xs text-slate-500">Số lớp: {sector.classes.length}</p>
              </div>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              {sector.classes.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-base font-semibold text-slate-800">{item.name}</p>
                  <p className="text-sm text-slate-500">Giáo lý viên: {item.teacher}</p>
                  <p className="text-sm text-slate-500">Thiếu nhi: {item.students}</p>
                  <div className="mt-3 flex gap-2 text-xs">
                    <button className="flex-1 rounded-md border border-slate-200 px-3 py-1 text-slate-600">Xem</button>
                    <button
                      className="flex-1 rounded-md border border-slate-200 px-3 py-1 text-slate-600"
                      onClick={() => setShowEdit(item.id)}
                    >
                      Chỉnh sửa
                    </button>
                    <button className="flex-1 rounded-md border border-red-200 px-3 py-1 text-red-600">Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {(showCreate || showEdit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <header className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {showCreate ? "Thêm lớp mới" : "Chỉnh sửa lớp"}
              </h3>
              <p className="text-xs text-slate-500">Cập nhật thông tin lớp học và phân công giáo lý viên.</p>
            </header>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tên lớp" />
                <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option>Chọn ngành</option>
                  <option>Chiên</option>
                  <option>Ấu</option>
                  <option>Thiếu</option>
                  <option>Nghĩa</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Phân công giáo lý viên</label>
                <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tìm kiếm giáo lý viên" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-700">Giáo lý viên đã phân công</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    <li className="flex items-center justify-between">
                      <span>Th. Phêrô Nguyễn Văn C</span>
                      <button className="text-xs text-red-500">Gỡ bỏ</button>
                    </li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-700">Giáo lý viên khả dụng</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    <li className="flex items-center justify-between">
                      <div>
                        <p>Th. Maria Võ Thị F</p>
                        <p className="text-xs text-slate-500">Đang phụ Chiên 1</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs">Chính</button>
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs">Phụ</button>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                onClick={() => {
                  setShowCreate(false);
                  setShowEdit(null);
                }}
              >
                Hủy
              </button>
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                {showCreate ? "Tạo mới" : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
