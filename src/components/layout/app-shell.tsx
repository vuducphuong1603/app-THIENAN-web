import type { NavSection } from "@/components/navigation/types";
import { Sidebar } from "@/components/navigation/sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: React.ReactNode;
  sections: NavSection[];
  userName?: string;
  roleLabel?: string;
  onSignOut?: () => Promise<void> | void;
}

export function AppShell({ children, sections, userName, roleLabel, onSignOut }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar sections={sections} />
      <div className="flex flex-1 flex-col">
        <Topbar title="Giáo Xứ Thiên Ân" userName={userName} roleLabel={roleLabel} onSignOut={onSignOut} />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
