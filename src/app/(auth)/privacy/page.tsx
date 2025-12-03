import Link from "next/link";

export default function PrivacyPage() {
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-center font-manrope text-2xl font-semibold leading-[31.2px] text-[#0D0D12]">
            Chính sách riêng tư
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-center font-manrope text-sm font-normal leading-[21px] tracking-[0.28px] text-[#666D80]">
          Chính sách riêng tư của Giáo Xứ Thiên Ân sẽ được cập nhật sớm.
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
