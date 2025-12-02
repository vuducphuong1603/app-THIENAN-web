"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { authStorage } from "@/lib/auth/storage";
import { useAuth } from "@/providers/auth-provider";

const PHONE_REGEX = /^0\d{9}$/;

const loginSchema = z.object({
  phone: z.string().regex(PHONE_REGEX, "Số điện thoại phải bắt đầu bằng 0 và gồm 10 chữ số"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, session, isAuthenticated } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

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
    const { error } = await login({
      phone,
      password,
      remember: remember ?? false,
    });

    if (error) {
      setFormError(error);
      return;
    }

    router.replace("/dashboard");
  });

  return (
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="mb-8 text-center">
        <Image
          src="/church-logo.jpg"
          alt="Logo Xứ Đoàn Đức Mẹ Fatima - Giáo Xứ Thiên Ân"
          width={144}
          height={144}
          className="mx-auto mb-4 h-24 w-24 rounded-full object-contain"
          priority
        />
        <h1 className="text-2xl font-bold text-emerald-700">Giáo Xứ Thiên Ân</h1>
        <p className="mt-2 text-sm text-slate-500">Đăng nhập hệ thống Thiếu Nhi</p>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="phone">
            Số điện thoại
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="username"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black shadow-sm focus:border-emerald-500 focus:outline-none"
            {...register("phone")}
          />
          {errors.phone ? <p className="text-xs text-red-500">{errors.phone.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black shadow-sm focus:border-emerald-500 focus:outline-none"
            {...register("password")}
          />
          {errors.password ? <p className="text-xs text-red-500">{errors.password.message}</p> : null}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4" {...register("remember")} />
          Ghi nhớ đăng nhập
        </label>

        {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>
    </section>
  );
}
