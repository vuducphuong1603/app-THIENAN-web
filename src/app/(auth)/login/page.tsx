"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";

const loginSchema = z.object({
  username: z.string().min(6, "Nhập số điện thoại"),
  password: z.string().min(6, "Nhập mật khẩu hợp lệ"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { supabase, session } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      remember: true,
    },
  });

  useEffect(() => {
    const stored = window.localStorage.getItem("tn-remember-username");
    if (stored) {
      setValue("username", stored);
    }
  }, [setValue]);

  useEffect(() => {
    if (!session.isLoading && session.session?.userId) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  const onSubmit = handleSubmit(async (values) => {
    const { username, password, remember } = values;

    // Convert phone to email format for Supabase authentication
    const phoneEmail = `${username.trim()}@phone.local`.toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: phoneEmail,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    if (remember) {
      window.localStorage.setItem("tn-remember-username", username);
    } else {
      window.localStorage.removeItem("tn-remember-username");
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
          <label className="text-sm font-medium text-slate-700" htmlFor="username">
            Số điện thoại
          </label>
          <input
            id="username"
            type="tel"
            autoComplete="username"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black shadow-sm focus:border-emerald-500 focus:outline-none"
            {...register("username")}
          />
          {errors.username ? (
            <p className="text-xs text-red-500">{errors.username.message}</p>
          ) : null}
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
          {errors.password ? (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4" {...register("remember")} />
          Ghi nhớ đăng nhập
        </label>

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
