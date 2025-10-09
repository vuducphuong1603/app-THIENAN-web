import clsx from "clsx";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: "emerald" | "blue" | "amber" | "rose";
}

export function StatsCard({ label, value, icon, color = "emerald" }: StatsCardProps) {
  const colorClasses = {
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={clsx("mt-1 text-2xl font-bold", colorClasses[color])}>{value}</p>
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
    </Card>
  );
}
