"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
}

interface DashboardNavbarProps {
  userName?: string;
  roleLabel?: string;
  avatarUrl?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/dashboard" },
  { label: "Quản lý", href: "/users" },
  { label: "Hoạt động", href: "/reports" },
  { label: "Hệ thống", href: "/settings" },
];

export function DashboardNavbar({ userName = "Người dùng", roleLabel = "Thành viên", avatarUrl }: DashboardNavbarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-4">
      {/* Left: Logo + Navigation */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex-shrink-0">
          <Image
            src="/church-logo.jpg"
            alt="Logo Giáo Xứ Thiên Ân"
            width={54}
            height={54}
            className="rounded-full object-cover"
          />
        </Link>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-5 py-3.5 font-outfit text-base font-medium transition-all ${
                  isActive
                    ? "bg-[#fa865e] text-white shadow-sm"
                    : "border border-white/20 bg-white text-black hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right: Search + Profile */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex items-center gap-4 rounded-full border border-white/20 bg-white px-1 py-1">
          <div className="flex size-[46px] items-center justify-center rounded-full bg-[#f3f3f3]">
            <svg className="size-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <span className="pr-4 font-outfit text-lg text-black">Tìm kiếm</span>
        </div>

        {/* Add Button */}
        <button className="flex size-[54px] items-center justify-center rounded-full border border-white/20 bg-white transition hover:bg-gray-50">
          <svg className="size-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-4">
          <div className="relative size-[54px] overflow-hidden rounded-full border-2 border-[#fa865e]/30">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={userName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#fa865e] to-[#e5764e] text-white font-outfit font-medium text-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-outfit text-lg font-medium text-black">{userName}</span>
            <span className="font-outfit text-base text-black/40">{roleLabel}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
