import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Outfit, Inter_Tight } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/providers/auth-provider";
import { NavigationGuard } from "@/providers/navigation-guard";
import { QueryProvider } from "@/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "vietnamese"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thiếu Nhi Thiên Ân",
  description: "Hệ thống quản lý giáo lý viên và thiếu nhi Giáo xứ Thiên Ân",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${outfit.variable} ${interTight.variable} antialiased text-slate-900`}>
        <QueryProvider>
          <AuthProvider>
            <NavigationGuard />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
