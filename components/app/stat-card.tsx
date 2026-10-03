import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
  loading = false,
  className,
  style,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  /** Lime top rule for the headline metric. */
  accent?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-5", className)} style={style}>
      {accent && <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden="true" />}
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {Icon && <Icon className="size-4 text-lavender" aria-hidden="true" />}
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-11 w-28" />
      ) : (
        <p className="mt-3 font-mono text-[2.6rem] font-medium leading-none tracking-tight tabular">{value}</p>
      )}
      {hint && <div className="mt-3 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
