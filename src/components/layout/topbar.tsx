"use client";

import { LogOut } from "lucide-react";

interface TopbarProps {
  title: string;
  userName?: string;
  roleLabel?: string;
  onSignOut?: () => Promise<void> | void;
}

export function Topbar({ title, userName, roleLabel, onSignOut }: TopbarProps) {
  const handleSignOut = async () => {
    try {
      await onSignOut?.();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <h1 className="text-lg font-semibold text-emerald-700">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">{userName ?? ""}</p>
          <p className="text-xs text-slate-500">{roleLabel ?? ""}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
