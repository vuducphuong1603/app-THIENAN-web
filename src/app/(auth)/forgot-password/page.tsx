"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/providers/auth-provider";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ email")
    .regex(EMAIL_REGEX, "Địa chỉ email không hợp lệ"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);

    const { error } = await resetPassword(email);

    if (error) {
      setFormError(error);
      return;
    }

    setSentEmail(email);
    setEmailSent(true);
  });

  if (emailSent) {
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
              Kiểm tra email của bạn
            </h1>
            <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#666D80]">
              Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến{" "}
              <span className="font-medium text-[#0D0D12]">{sentEmail}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-xl bg-[#F8F9FB] p-6">
          <svg
            className="h-12 w-12 text-[#818898]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p className="text-center font-manrope text-sm font-normal leading-[21px] tracking-[0.28px] text-[#666D80]">
            Nếu không thấy email, hãy kiểm tra thư mục spam hoặc thử lại với địa
            chỉ email khác.
          </p>
        </div>

        <Link
          href="/login"
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#fa865e] px-4 py-2 font-manrope text-base font-semibold text-white transition hover:bg-[#e5764e]"
        >
          Quay lại đăng nhập
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
            Quên mật khẩu
          </h1>
          <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#666D80]">
            Nhập địa chỉ Email và chúng tôi sẽ gửi cho bạn hướng dẫn đặt lại mật
            khẩu
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <label
            className="font-manrope text-sm font-medium leading-[21px] tracking-[0.28px]"
            htmlFor="email"
          >
            <span className="text-[#666D80]">Địa chỉ Email</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="demo@gmail.com"
            autoComplete="email"
            className={`h-[52px] w-full rounded-xl border px-3 py-2 font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#0D0D12] placeholder:text-[#818898] focus:outline-none focus:ring-1 ${
              errors.email
                ? "border-[#df1c41] bg-[rgba(250,134,94,0.2)] focus:border-[#df1c41] focus:ring-[#df1c41]"
                : "border-[#DFE1E7] bg-white focus:border-[#fa865e] focus:ring-[#fa865e]"
            }`}
            {...register("email")}
          />
          {errors.email ? (
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
                {errors.email.message}
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
          {isSubmitting ? "Đang xử lý..." : "Quên mật khẩu"}
        </button>
      </form>

      {/* Alternative Link */}
      <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px]">
        <span className="text-[#666D80]">Không còn quyền truy cập nữa? </span>
        <Link
          href="/login"
          className="font-medium text-[#fa865e] transition hover:text-[#e5764e]"
        >
          Hãy thử phương pháp khác
        </Link>
      </p>
    </section>
  );
}
