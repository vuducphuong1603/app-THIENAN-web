"use client";

import { useState } from "react";

const mockUsers = [
  {
    id: "1",
    name: "Th. Gioan Nguyễn Văn A",
    phone: "0912345678",
    role: "Admin",
    sector: "Chiên",
    className: "Chiên 1",
    status: "Hoạt động",
  },
  {
    id: "2",
    name: "Th. Maria Trần Thị B",
    phone: "0987654321",
    role: "Giáo lý viên",
    sector: "Thiếu",
    className: "Thiếu 3",
    status: "Tạm nghỉ",
  },
];

export default function UsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Quản lý người dùng</h2>
        <p className="text-sm text-slate-500">Tìm kiếm, thêm mới và cập nhật thông tin thành viên.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tìm theo tên hoặc username" />
          <button className="rounded-lg border border-dashed border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50">
            Import Excel
          </button>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Tất cả vai trò</option>
            <option>Admin</option>
            <option>Giáo lý viên</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Tất cả ngành</option>
            <option>Chiên</option>
            <option>Ấu</option>
            <option>Thiếu</option>
            <option>Nghĩa</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Chọn lớp</option>
          </select>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => setShowCreate(true)}
            >
              Thêm người dùng
            </button>
            <button className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Xóa bộ lọc</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockUsers.map((user) => (
          <article key={user.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">{user.name}</h3>
                <p className="text-sm text-slate-500">{user.phone}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {user.role}
              </span>
            </header>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>Ngành: {user.sector}</p>
              <p>Lớp: {user.className}</p>
              <p>Liên hệ: {user.phone}</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-medium text-emerald-600">{user.status}</span>
              <div className="flex gap-2">
                <button
                  className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  onClick={() => setShowEdit(user.id)}
                >
                  Chỉnh sửa
                </button>
                <button className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600">Khóa</button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {(showCreate || showEdit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <header className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {showCreate ? "Thêm người dùng" : "Cập nhật người dùng"}
              </h3>
              <p className="text-xs text-slate-500">Điền đầy đủ thông tin để quản lý chính xác.</p>
            </header>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tên đăng nhập" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Mật khẩu (để trống nếu không đổi)" />
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option>Vai trò</option>
                <option value="admin">Admin</option>
                <option value="catechist">Giáo lý viên</option>
              </select>
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tên thánh" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Họ và tên" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ngày sinh" type="date" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Số điện thoại" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Địa chỉ" />
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option>Ngành</option>
                <option>Chiên</option>
                <option>Ấu</option>
                <option>Thiếu</option>
                <option>Nghĩa</option>
              </select>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option>Lớp</option>
                <option>Chiên 1</option>
                <option>Chiên 2</option>
                <option>Chiên 3</option>
              </select>
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
