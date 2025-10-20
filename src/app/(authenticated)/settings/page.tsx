"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { fetchUserById, updateUser } from "@/lib/actions/users";
import { getRoleLabel, normalizeAppRole } from "@/lib/auth/roles";
import { useAuth } from "@/providers/auth-provider";
import type { AppRole } from "@/types/auth";

const tabs = [
  { id: "profile", label: "Thông tin cá nhân" },
  { id: "password", label: "Đổi mật khẩu" },
  { id: "academic", label: "Năm học" },
  { id: "notifications", label: "Thông báo" },
  { id: "system", label: "Cài đặt hệ thống" },
];

type ProfileFormState = {
  saint_name: string;
  full_name: string;
  phone: string;
  address: string;
};

const profileFields: Array<keyof ProfileFormState> = ["saint_name", "full_name", "phone", "address"];

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SettingsPage() {
  const { session, refreshProfile, supabase } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [role, setRole] = useState<AppRole | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    saint_name: "",
    full_name: "",
    phone: "",
    address: "",
  });
  const [initialProfile, setInitialProfile] = useState<ProfileFormState | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    if (session.isLoading) return;

    const userId = session.session?.userId;
    if (!userId) {
      setIsLoadingProfile(false);
      setLoadError("Không tìm thấy thông tin người dùng.");
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setLoadError(null);

      try {
        const result = await fetchUserById(userId);

        if (!isMounted) return;

        if (result.error || !result.data) {
          setLoadError(result.error ?? "Không thể tải thông tin người dùng.");
          return;
        }

        const user = result.data;
        const nextState: ProfileFormState = {
          saint_name: user.saint_name ?? "",
          full_name: user.full_name ?? "",
          phone: user.phone ?? "",
          address: user.address ?? "",
        };

        setProfileForm(nextState);
        setInitialProfile(nextState);
        setRole(normalizeAppRole(user.role));
        setFeedback(null);
      } catch (error) {
        console.error("Failed to load profile", error);
        if (isMounted) {
          setLoadError("Không thể tải thông tin người dùng.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session.isLoading, session.session?.userId]);

  const hasChanges =
    initialProfile !== null &&
    profileFields.some((field) => initialProfile[field] !== profileForm[field]);

  const handleInputChange =
    (field: keyof ProfileFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfileForm((prev) => ({ ...prev, [field]: event.target.value }));
      setFeedback(null);
    };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.session?.userId) {
      setFeedback({ type: "error", message: "Không tìm thấy phiên đăng nhập." });
      return;
    }

    const trimmedFullName = profileForm.full_name.trim();
    const trimmedPhone = profileForm.phone.trim();
    const trimmedSaintName = profileForm.saint_name.trim();
    const trimmedAddress = profileForm.address.trim();

    if (!trimmedFullName) {
      setFeedback({ type: "error", message: "Vui lòng nhập họ và tên." });
      return;
    }

    if (!trimmedPhone) {
      setFeedback({ type: "error", message: "Vui lòng nhập số điện thoại." });
      return;
    }

    setIsSavingProfile(true);
    setFeedback(null);

    try {
      const result = await updateUser(session.session.userId, {
        full_name: trimmedFullName,
        phone: trimmedPhone,
        saint_name: trimmedSaintName,
        address: trimmedAddress,
      });

      if (result.error || !result.data) {
        setFeedback({
          type: "error",
          message: result.error ?? "Không thể lưu thông tin. Vui lòng thử lại.",
        });
        return;
      }

      const updated: ProfileFormState = {
        saint_name: result.data.saint_name ?? "",
        full_name: result.data.full_name ?? trimmedFullName,
        phone: result.data.phone ?? trimmedPhone,
        address: result.data.address ?? "",
      };

      setProfileForm(updated);
      setInitialProfile(updated);
      setRole(normalizeAppRole(result.data.role));
      setFeedback({ type: "success", message: "Thông tin cá nhân đã được lưu." });
      await refreshProfile();
    } catch (error) {
      console.error("Failed to save profile", error);
      setFeedback({ type: "error", message: "Có lỗi xảy ra khi lưu thông tin." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordInputChange =
    (field: keyof PasswordFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
      setPasswordFeedback(null);
    };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const current = passwordForm.currentPassword.trim();
    const next = passwordForm.newPassword.trim();
    const confirm = passwordForm.confirmPassword.trim();

    if (!session.session?.userId) {
      setPasswordFeedback({ type: "error", message: "Không tìm thấy phiên đăng nhập." });
      return;
    }

    if (!current) {
      setPasswordFeedback({ type: "error", message: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }

    if (!next || next.length < 6) {
      setPasswordFeedback({ type: "error", message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
      return;
    }

    if (next !== confirm) {
      setPasswordFeedback({ type: "error", message: "Mật khẩu mới và xác nhận không trùng khớp." });
      return;
    }

    if (current === next) {
      setPasswordFeedback({ type: "error", message: "Mật khẩu mới phải khác mật khẩu hiện tại." });
      return;
    }

    setIsChangingPassword(true);
    setPasswordFeedback(null);

    try {
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError || !user) {
        setPasswordFeedback({ type: "error", message: "Không xác định được tài khoản để đổi mật khẩu." });
        return;
      }

      const metadataPhone =
        typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone.trim() : null;
      const loginEmail = user.email ?? (metadataPhone ? `${metadataPhone}@phone.local`.toLowerCase() : null);

      if (!loginEmail) {
        setPasswordFeedback({ type: "error", message: "Không tìm thấy thông tin đăng nhập hợp lệ." });
        return;
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: current,
      });

      if (reauthError) {
        setPasswordFeedback({ type: "error", message: "Mật khẩu hiện tại không chính xác." });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        setPasswordFeedback({
          type: "error",
          message: updateError.message ?? "Không thể cập nhật mật khẩu. Vui lòng thử lại.",
        });
        return;
      }

      setPasswordFeedback({ type: "success", message: "Đổi mật khẩu thành công." });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Failed to change password", error);
      setPasswordFeedback({ type: "error", message: "Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại." });
    } finally {
      setIsChangingPassword(false);
    }
  };

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
          <div className="space-y-3">
            {isLoadingProfile ? (
              <div className="text-sm text-slate-500">Đang tải thông tin cá nhân...</div>
            ) : loadError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {loadError}
              </div>
            ) : (
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSaveProfile}>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="Tên thánh"
                  value={profileForm.saint_name}
                  onChange={handleInputChange("saint_name")}
                  disabled={isSavingProfile}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="Họ và tên"
                  value={profileForm.full_name}
                  onChange={handleInputChange("full_name")}
                  disabled={isSavingProfile}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="Số điện thoại"
                  value={profileForm.phone}
                  onChange={handleInputChange("phone")}
                  disabled={isSavingProfile}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="Vai trò"
                  value={role ? getRoleLabel(role) : ""}
                  disabled
                  readOnly
                />
                <textarea
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 md:col-span-2"
                  rows={3}
                  placeholder="Địa chỉ"
                  value={profileForm.address}
                  onChange={handleInputChange("address")}
                  disabled={isSavingProfile}
                />

                {feedback && (
                  <div
                    className={`md:col-span-2 rounded-lg border px-3 py-2 text-sm ${
                      feedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={!hasChanges || isSavingProfile}
                  >
                    {isSavingProfile ? "Đang lưu..." : "Lưu thông tin"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === "password" && (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleChangePassword}>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="Mật khẩu hiện tại"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordInputChange("currentPassword")}
              disabled={isChangingPassword}
              autoComplete="current-password"
            />
            <div />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="Mật khẩu mới"
              type="password"
              value={passwordForm.newPassword}
              onChange={handlePasswordInputChange("newPassword")}
              disabled={isChangingPassword}
              autoComplete="new-password"
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="Nhập lại mật khẩu"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordInputChange("confirmPassword")}
              disabled={isChangingPassword}
              autoComplete="new-password"
            />

            {passwordFeedback && (
              <div
                className={`md:col-span-2 rounded-lg border px-3 py-2 text-sm ${
                  passwordFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {passwordFeedback.message}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
              </button>
            </div>
          </form>
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
