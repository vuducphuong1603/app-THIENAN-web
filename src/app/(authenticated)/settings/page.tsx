"use client";

import { useState } from "react";

const tabs = [
  { id: "profile", label: "Thông tin cá nhân" },
  { id: "password", label: "Đổi mật khẩu" },
  { id: "academic", label: "Năm học" },
  { id: "notifications", label: "Thông báo" },
  { id: "system", label: "Cài đặt hệ thống" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("profile");

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Cài đặt</h2>
        <p className="text-sm text-slate-500">Quản lý thông tin cá nhân và cấu hình hệ thống.</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${activeTab === tab.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"} rounded-lg px-4 py-2 text-sm font-medium`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Tên thánh" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Họ và tên" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Số điện thoại" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Vai trò" disabled />
            <textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 md:col-span-2" rows={3} placeholder="Địa chỉ" />
            <div className="md:col-span-2 flex justify-end">
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Lưu thông tin</button>
            </div>
          </div>
        )}

        {activeTab === "password" && (
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Mật khẩu hiện tại" type="password" />
            <div />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Mật khẩu mới" type="password" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Nhập lại mật khẩu" type="password" />
            <div className="md:col-span-2 flex justify-end">
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Đổi mật khẩu</button>
            </div>
          </div>
        )}

        {activeTab === "academic" && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Năm học hiện tại" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Tổng số tuần" />
            </div>
            <table className="w-full table-auto overflow-hidden rounded-lg border text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Năm học</th>
                  <th className="px-3 py-2">Số tuần</th>
                  <th className="px-3 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="text-slate-600">
                  <td className="px-3 py-2">2025 - 2026</td>
                  <td className="px-3 py-2">40</td>
                  <td className="px-3 py-2">Đang dùng</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="px-3 py-2">2024 - 2025</td>
                  <td className="px-3 py-2">38</td>
                  <td className="px-3 py-2">Đã kết thúc</td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end">
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Cập nhật</button>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-3 text-sm text-slate-600">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" defaultChecked />
              Nhận thông báo qua email
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" />
              Nhận thông báo qua SMS
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" defaultChecked />
              Nhắc điểm danh trước buổi học
            </label>
          </div>
        )}

        {activeTab === "system" && (
          <div className="space-y-3 text-sm text-slate-600">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" defaultChecked />
              Cho phép giáo lý viên chỉnh sửa điểm
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" />
              Khóa điểm sau khi phê duyệt
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" defaultChecked />
              Hiển thị thông báo hệ thống trên dashboard
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
