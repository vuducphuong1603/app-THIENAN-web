import clsx from "clsx";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-slate-200",
        variant === "circular" && "rounded-full",
        variant === "text" && "rounded",
        variant === "rectangular" && "rounded-lg",
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-3">
                <Skeleton className="h-4 w-20 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="p-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StudentTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50">
            <th className="p-3 text-left font-semibold text-slate-700">Thieu nhi</th>
            <th className="p-3 text-left font-semibold text-slate-700">Lop / Tuoi</th>
            <th className="p-3 text-left font-semibold text-slate-700">Lien he</th>
            <th className="p-3 text-center font-semibold text-slate-700">45p HK1</th>
            <th className="p-3 text-center font-semibold text-slate-700">Thi HK1</th>
            <th className="p-3 text-center font-semibold text-slate-700">45p HK2</th>
            <th className="p-3 text-center font-semibold text-slate-700">Thi HK2</th>
            <th className="p-3 text-center font-semibold text-slate-700">TB GL</th>
            <th className="p-3 text-center font-semibold text-slate-700">DD T5</th>
            <th className="p-3 text-center font-semibold text-slate-700">DD CN</th>
            <th className="p-3 text-center font-semibold text-slate-700">TB DD</th>
            <th className="p-3 text-center font-semibold text-slate-700">Tong TB</th>
            <th className="p-3 text-center font-semibold text-slate-700">Thao tac</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-slate-100">
              {/* Student info */}
              <td className="p-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </td>
              {/* Class/Age */}
              <td className="p-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </td>
              {/* Contact */}
              <td className="p-3">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </td>
              {/* 4 Grade columns */}
              {[1, 2, 3, 4].map((i) => (
                <td key={`grade-${i}`} className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-10" />
                </td>
              ))}
              {/* 4 Average columns */}
              {[1, 2, 3, 4].map((i) => (
                <td key={`avg-${i}`} className="p-3 text-center">
                  <Skeleton className="mx-auto h-4 w-12" />
                </td>
              ))}
              {/* Actions */}
              <td className="p-3">
                <div className="flex gap-1 justify-center">
                  <Skeleton className="h-8 w-8 rounded" variant="rectangular" />
                  <Skeleton className="h-8 w-8 rounded" variant="rectangular" />
                  <Skeleton className="h-8 w-8 rounded" variant="rectangular" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200">
          <Skeleton className="h-10 w-10" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
