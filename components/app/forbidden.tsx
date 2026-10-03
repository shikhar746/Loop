import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown when the API answers 403 for something the current role can't see. */
export function Forbidden({
  message = "Your role doesn't have access to this. Ask a workspace admin if you need it.",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div role="status" className={cn("surface flex items-start gap-4 p-5", className)}>
      <div className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-raised">
        <Lock className="size-4 text-lavender" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold">No access</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
