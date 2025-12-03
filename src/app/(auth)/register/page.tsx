import Link from "next/link";

export default function RegisterPage() {
  return (
    <section className="flex w-full max-w-[500px] flex-col gap-8 rounded-[20px] bg-white p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-full bg-gradient-to-b from-[rgba(250,134,94,0.48)] to-transparent p-4">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#fa865e] bg-white shadow-[0px_2px_4px_rgba(179,212,253,0.04)]">
            <svg
              className="h-6 w-6 text-[#fa865e]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-center font-manrope text-2xl font-semibold leading-[31.2px] text-[#0D0D12]">
            Đăng ký tài khoản
          </h1>
          <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#666D80]">
            Tính năng này sắp ra mắt
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-center font-manrope text-sm font-normal leading-[21px] tracking-[0.28px] text-[#666D80]">
          Vui lòng liên hệ quản trị viên để được cấp tài khoản sử dụng hệ thống.
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
