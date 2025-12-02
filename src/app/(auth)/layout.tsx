import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Header/Topbar */}
      <header className="relative z-10 flex items-center gap-3 px-10 py-8">
        <Image
          src="/church-logo.jpg"
          alt="Logo Giáo Xứ Thiên Ân"
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-cover"
        />
        <span className="font-manrope text-base font-semibold text-[#1A1A1A]">
          Giáo xứ Thiên Ân
        </span>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between p-8">
        <p className="text-sm font-normal leading-[21px] tracking-[0.28px] text-black">
          © 2025 Giáo Xứ Thiên Ân. All right reserved.
        </p>

        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="flex items-center gap-1.5 text-sm font-normal leading-[21px] tracking-[0.28px] text-black transition hover:text-[#666D80]"
          >
            <svg
              className="h-4 w-4"
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
            Riêng tư
          </Link>

          <Link
            href="/terms"
            className="flex items-center gap-1.5 text-sm font-normal leading-[21px] tracking-[0.28px] text-black transition hover:text-[#666D80]"
          >
            <svg
              className="h-4 w-4"
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
            Điều khoản
          </Link>

          <Link
            href="/help"
            className="flex items-center gap-1.5 text-sm font-normal leading-[21px] tracking-[0.28px] text-black transition hover:text-[#666D80]"
          >
            <svg
              className="h-4 w-4"
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
            Trợ giúp
          </Link>
        </div>
      </footer>
    </div>
  );
}
