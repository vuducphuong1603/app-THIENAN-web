import Link from "next/link";

interface StatCardProps {
  label: string;
  value: number | string;
  href?: string;
  variant?: "primary" | "default";
  icon?: React.ReactNode;
}

export function StatCard({ label, value, href, variant = "default", icon }: StatCardProps) {
  const isPrimary = variant === "primary";

  const content = (
    <div
      className={`relative h-[147px] overflow-hidden rounded-[15px] p-4 ${
        isPrimary
          ? "bg-[#fa865e] text-white"
          : "border border-white/60 bg-white text-black"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <p
          className={`font-manrope text-lg font-medium tracking-tight ${
            isPrimary ? "text-white/80" : "text-black/80"
          }`}
        >
          {label}
        </p>
        {icon && (
          <div
            className={`flex size-11 items-center justify-center rounded-full backdrop-blur-sm ${
              isPrimary
                ? "border border-white/20 bg-white/10"
                : "border border-black/0 bg-black/5"
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <p
        className={`mt-auto pt-8 font-manrope text-[38px] font-bold leading-tight tracking-tight ${
          isPrimary ? "text-white" : "text-black"
        }`}
      >
        {value}
      </p>

      {/* Decorative Graph (simplified) */}
      <div className="absolute bottom-4 right-4 flex items-end gap-1">
        {[3, 5, 4, 7, 6, 5, 4].map((height, i) => (
          <div
            key={i}
            className={`w-[18px] rounded ${
              isPrimary ? "bg-white/30" : i >= 3 ? "bg-[#fa865e]" : "bg-gray-200"
            }`}
            style={{ height: `${height * 5}px` }}
          />
        ))}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-lg">
        {content}
      </Link>
    );
  }

  return content;
}
