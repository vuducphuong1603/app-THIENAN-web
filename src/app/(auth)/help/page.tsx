import Link from "next/link";

export default function HelpPage() {
  return (
    <section className="flex w-full max-w-[500px] flex-col gap-8 rounded-[20px] bg-white p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-full bg-gradient-to-b from-[rgba(250,134,94,0.48)] to-transparent p-4">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#fa865e] bg-white shadow-[0px_2px_4px_rgba(179,212,253,0.04)]">
            <svg
              className="h-6 w-6 text-[#fa865e]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-center font-manrope text-2xl font-semibold leading-[31.2px] text-[#0D0D12]">
            Trợ giúp
          </h1>
          <p className="text-center font-manrope text-base font-normal leading-6 tracking-[0.32px] text-[#666D80]">
            Trang này đang được cập nhật
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
          Nếu bạn cần hỗ trợ, vui lòng liên hệ quản trị viên của Giáo Xứ Thiên Ân.
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
