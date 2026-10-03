import { Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

/** "Classifying 24 of 60…" with a progress bar, announced politely to screen readers. */
export function ClassifyProgress({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={cn("surface flex flex-col gap-2 px-4 py-3", className)} role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Sparkles className="size-4 animate-pulse text-primary motion-reduce:animate-none" aria-hidden="true" />
          {total > 0 ? (
            <span className="tabular">
              Classifying {formatNumber(done)} of {formatNumber(total)}…
            </span>
          ) : (
            "Looking for unclassified feedback…"
          )}
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular">{pct}%</span>
      </div>
      <Progress value={pct} aria-label="Classification progress" className="h-1.5 bg-muted" />
    </div>
  );
}
