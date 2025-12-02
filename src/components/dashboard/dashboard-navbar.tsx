"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

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

        {/* User Profile with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-4 rounded-full py-1 pr-2 transition hover:bg-white/50"
          >
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
            <div className="flex flex-col text-left">
              <span className="font-outfit text-lg font-medium text-black">{userName}</span>
              <span className="font-outfit text-base text-black/40">{roleLabel}</span>
            </div>
            <svg className={`size-5 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
              <Link
                href="/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-3 font-outfit text-base text-gray-700 transition hover:bg-gray-50"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Cài đặt
              </Link>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 font-outfit text-base text-red-600 transition hover:bg-red-50"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
