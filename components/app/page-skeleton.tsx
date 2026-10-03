import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading skeleton: header, optional stat row, and content blocks. */
export function PageSkeleton({ stats = 0, blocks = 2, label = "Loading" }: { stats?: number; blocks?: number; label?: string }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {stats > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: stats }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}
      {Array.from({ length: blocks }, (_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  );
}
