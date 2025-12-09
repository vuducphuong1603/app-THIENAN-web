"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { authStorage } from "@/lib/auth/storage";
import { useAuth } from "@/providers/auth-provider";

const PHONE_REGEX = /^0\d{9}$/;

const loginSchema = z.object({
  phone: z
    .string()
    .regex(PHONE_REGEX, "Số điện thoại phải bắt đầu bằng 0 và gồm 10 chữ số"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, session, isAuthenticated } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<{
    field: "phone" | "password" | "both";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
      remember: true,
    },
  });

  useEffect(() => {
    const stored = authStorage.getAccount();
    if (stored) {
      setValue("phone", stored.phone);
      setValue("password", stored.password);
      setValue("remember", true);
    }
  }, [setValue]);

  useEffect(() => {
    if (!session.isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router, session.isLoading]);

  const onSubmit = handleSubmit(async ({ phone, password, remember }) => {
    setFormError(null);
    setLoginError(null);
    const { error } = await login({
      phone,
      password,
      remember: remember ?? false,
    });

    if (error) {
      // Phân loại lỗi dựa trên message từ Supabase
      const lowerError = error.toLowerCase();
      if (
        lowerError.includes("invalid login credentials") ||
        lowerError.includes("invalid credentials")
      ) {
        // Lỗi thông tin đăng nhập sai - hiển thị lỗi ở cả 2 field
        setLoginError({
          field: "both",
          message: "Tên đăng nhập hoặc mật khẩu không đúng!",
        });
      } else if (lowerError.includes("email") || lowerError.includes("user")) {
        setLoginError({
          field: "phone",
          message: "Tên đăng nhập sai!",
        });
      } else if (lowerError.includes("password")) {
        setLoginError({
          field: "password",
          message: "Mật khẩu sai!",
        });
      } else {
        setFormError(error);
      }
      return;
    }

    router.replace("/dashboard");
  });

  return (
    <section className="flex w-full max-w-[500px] flex-col gap-8 rounded-[20px] bg-white p-8">
      {/* Avatar Icon with gradient border */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-full bg-gradient-to-b from-[rgba(250,134,94,0.48)] to-transparent p-4">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#fa865e] bg-white shadow-[0px_2px_4px_rgba(179,212,253,0.04)]">
            <svg
              className="h-6 w-6 text-[#fa865e]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-center font-manrope text-2xl font-semibold leading-[31.2px] text-[#0D0D12]">
            Chào mừng!
          </h1>
          <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#666D80]">
            Đăng nhập vào tài khoản của bạn
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {/* Phone/Username Field */}
        <div className="flex flex-col gap-2">
          <label
            className="font-manrope text-sm font-medium leading-[21px] tracking-[0.28px]"
            htmlFor="phone"
          >
            <span className="text-[#666D80]">Tên đăng nhập </span>
            <span className="text-[#df1c41]">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="Nhập tên đăng nhập"
            autoComplete="username"
            className={`h-[52px] w-full rounded-xl border px-3 py-2 font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#0D0D12] placeholder:text-[#818898] focus:outline-none focus:ring-1 ${
              errors.phone ||
              loginError?.field === "phone" ||
              loginError?.field === "both"
                ? "border-[#df1c41] bg-[rgba(250,134,94,0.2)] focus:border-[#df1c41] focus:ring-[#df1c41]"
                : "border-[#DFE1E7] bg-white focus:border-[#fa865e] focus:ring-[#fa865e]"
            }`}
            {...register("phone", {
              onChange: () => {
                if (loginError) setLoginError(null);
              },
            })}
          />
          {errors.phone ? (
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
                {errors.phone.message}
              </span>
            </div>
          ) : (loginError?.field === "phone" ||
              loginError?.field === "both") ? (
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
                {loginError.field === "both"
                  ? "Tên đăng nhập hoặc mật khẩu không đúng!"
                  : "Tên đăng nhập sai!"}
              </span>
            </div>
          ) : null}
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-2">
          <label
            className="font-manrope text-sm font-medium leading-[21px] tracking-[0.28px]"
            htmlFor="password"
          >
            <span className="text-[#666D80]">Mật khẩu </span>
            <span className="text-[#df1c41]">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              className={`h-[52px] w-full rounded-xl border px-3 py-2 pr-12 font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#0D0D12] placeholder:text-[#818898] focus:outline-none focus:ring-1 ${
                errors.password ||
                loginError?.field === "password" ||
                loginError?.field === "both"
                  ? "border-[#df1c41] bg-[rgba(250,134,94,0.2)] focus:border-[#df1c41] focus:ring-[#df1c41]"
                  : "border-[#DFE1E7] bg-white focus:border-[#fa865e] focus:ring-[#fa865e]"
              }`}
              {...register("password", {
                onChange: () => {
                  if (loginError) setLoginError(null);
                },
              })}
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
          ) : loginError?.field === "password" ? (
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
                Mật khẩu sai!
              </span>
            </div>
          ) : null}
        </div>

        {/* Remember & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-[4.8px] border border-[#DFE1E7] bg-white text-[#fa865e] focus:ring-[#fa865e]"
              {...register("remember")}
            />
            <span className="font-manrope text-sm font-normal leading-[21px] tracking-[0.28px] text-[#0D0D12]">
              Ghi nhớ đăng nhập
            </span>
          </label>
          <Link
            href="/forgot-password"
            className="font-manrope text-sm font-medium leading-[21px] tracking-[0.28px] text-[#fa865e] transition hover:text-[#e5764e]"
          >
            Quên mật khẩu?
          </Link>
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
      </form>

      {/* Submit Button */}
      <button
        type="submit"
        form="login-form"
        disabled={isSubmitting}
        onClick={onSubmit}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#fa865e] px-4 py-2 font-manrope text-base font-semibold text-white transition hover:bg-[#e5764e] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
      </button>

      {/* Register Link */}
      <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px]">
        <span className="text-[#666D80]">Bạn chưa có tài khoản? </span>
        <Link
          href="/register"
          className="font-medium text-[#fa865e] transition hover:text-[#e5764e]"
        >
          Đăng ký
        </Link>
      </p>
    </section>
  );
}
