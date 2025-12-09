"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/providers/auth-provider";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { supabase } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    };

    checkSession();
  }, [supabase]);

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("[ResetPassword] Error:", error);
      if (error.message.includes("same as")) {
        setFormError("Mật khẩu mới không được trùng với mật khẩu cũ");
      } else {
        setFormError("Không thể đặt lại mật khẩu. Vui lòng thử lại.");
      }
      return;
    }

    setResetSuccess(true);
  });

  if (isValidSession === null) {
    return (
      <section className="flex w-full max-w-[500px] flex-col gap-8 rounded-[20px] bg-white p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-[52px] w-[52px] animate-pulse rounded-full bg-gray-200" />
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>
      </section>
    );
  }

  if (!isValidSession) {
    return (
      <section className="flex w-full max-w-[500px] flex-col gap-8 rounded-[20px] bg-white p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative rounded-full bg-gradient-to-b from-[rgba(223,28,65,0.48)] to-transparent p-4">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#df1c41] bg-white shadow-[0px_2px_4px_rgba(179,212,253,0.04)]">
              <svg
                className="h-6 w-6 text-[#df1c41]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-center font-manrope text-2xl font-semibold leading-[31.2px] text-[#0D0D12]">
              Liên kết không hợp lệ
            </h1>
            <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#666D80]">
              Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng
              yêu cầu một liên kết mới.
            </p>
          </div>
        </div>

        <Link
          href="/forgot-password"
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#fa865e] px-4 py-2 font-manrope text-base font-semibold text-white transition hover:bg-[#e5764e]"
        >
          Yêu cầu liên kết mới
        </Link>
      </section>
    );
  }

  if (resetSuccess) {
    return (
      <section className="flex w-full max-w-[500px] flex-col gap-8 rounded-[20px] bg-white p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative rounded-full bg-gradient-to-b from-[rgba(34,197,94,0.48)] to-transparent p-4">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#22c55e] bg-white shadow-[0px_2px_4px_rgba(179,212,253,0.04)]">
              <svg
                className="h-6 w-6 text-[#22c55e]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-center font-manrope text-2xl font-semibold leading-[31.2px] text-[#0D0D12]">
              Đặt lại mật khẩu thành công!
            </h1>
            <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#666D80]">
              Mật khẩu của bạn đã được cập nhật. Bây giờ bạn có thể đăng nhập
              bằng mật khẩu mới.
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#fa865e] px-4 py-2 font-manrope text-base font-semibold text-white transition hover:bg-[#e5764e]"
        >
          Đăng nhập ngay
        </Link>
      </section>
    );
  }

  return (
    <section className="flex w-full max-w-[500px] flex-col gap-8 rounded-[20px] bg-white p-8">
      {/* Lock Icon with gradient border */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-full bg-gradient-to-b from-[rgba(250,134,94,0.48)] to-transparent p-4">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#fa865e] bg-white shadow-[0px_2px_4px_rgba(179,212,253,0.04)]">
            <svg
              className="h-6 w-6 text-[#fa865e]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-center font-manrope text-2xl font-semibold leading-[31.2px] text-[#0D0D12]">
            Đặt lại mật khẩu
          </h1>
          <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#666D80]">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {/* Password Field */}
        <div className="flex flex-col gap-2">
          <label
            className="font-manrope text-sm font-medium leading-[21px] tracking-[0.28px]"
            htmlFor="password"
          >
            <span className="text-[#666D80]">Mật khẩu mới </span>
            <span className="text-[#df1c41]">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu mới"
              autoComplete="new-password"
              className={`h-[52px] w-full rounded-xl border px-3 py-2 pr-12 font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#0D0D12] placeholder:text-[#818898] focus:outline-none focus:ring-1 ${
                errors.password
                  ? "border-[#df1c41] bg-[rgba(250,134,94,0.2)] focus:border-[#df1c41] focus:ring-[#df1c41]"
                  : "border-[#DFE1E7] bg-white focus:border-[#fa865e] focus:ring-[#fa865e]"
              }`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#818898] transition hover:text-[#666D80]"
            >
              {showPassword ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.password ? (
            <div className="flex items-center gap-1">
              <svg
                className="h-4 w-4 shrink-0 text-[#df1c41]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01"
                />
              </svg>
              <span className="text-xs font-normal text-[#df1c41]">
                {errors.password.message}
              </span>
            </div>
          ) : null}
        </div>

        {/* Confirm Password Field */}
        <div className="flex flex-col gap-2">
          <label
            className="font-manrope text-sm font-medium leading-[21px] tracking-[0.28px]"
            htmlFor="confirmPassword"
          >
            <span className="text-[#666D80]">Xác nhận mật khẩu </span>
            <span className="text-[#df1c41]">*</span>
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              className={`h-[52px] w-full rounded-xl border px-3 py-2 pr-12 font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#0D0D12] placeholder:text-[#818898] focus:outline-none focus:ring-1 ${
                errors.confirmPassword
                  ? "border-[#df1c41] bg-[rgba(250,134,94,0.2)] focus:border-[#df1c41] focus:ring-[#df1c41]"
                  : "border-[#DFE1E7] bg-white focus:border-[#fa865e] focus:ring-[#fa865e]"
              }`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#818898] transition hover:text-[#666D80]"
            >
              {showConfirmPassword ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword ? (
            <div className="flex items-center gap-1">
              <svg
                className="h-4 w-4 shrink-0 text-[#df1c41]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01"
                />
              </svg>
              <span className="text-xs font-normal text-[#df1c41]">
                {errors.confirmPassword.message}
              </span>
            </div>
          ) : null}
        </div>

        {/* Error Message */}
        {formError ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#fff0f3] p-3">
            <svg
              className="h-4 w-4 shrink-0 text-[#df1c41]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-normal leading-[21px] tracking-[0.28px] text-[#df1c41]">
              {formError}
            </span>
          </div>
        ) : null}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#fa865e] px-4 py-2 font-manrope text-base font-semibold text-white transition hover:bg-[#e5764e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>
      </form>

      {/* Back to Login Link */}
      <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px]">
        <span className="text-[#666D80]">Nhớ mật khẩu rồi? </span>
        <Link
          href="/login"
          className="font-medium text-[#fa865e] transition hover:text-[#e5764e]"
        >
          Đăng nhập
        </Link>
      </p>
    </section>
  );
}
