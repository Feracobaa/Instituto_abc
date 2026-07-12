import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  /** Number of columns */
  columns?: number;
  /** Number of rows */
  rows?: number;
}

export function TableSkeleton({ columns = 4, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-md border">
      {/* Header */}
      <div className="flex gap-4 border-b bg-muted/30 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`r-${rowIdx}`}
          className="flex items-center gap-4 border-b px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`c-${rowIdx}-${colIdx}`}
              className="h-4 flex-1 rounded"
              style={{ opacity: 1 - rowIdx * 0.12 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
