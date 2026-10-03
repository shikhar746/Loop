"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_ICONS } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/format";
import type { FeedbackStatus } from "@/lib/types";
import { FEEDBACK_STATUSES } from "@/lib/validators/common";

const TONE: Record<FeedbackStatus, string> = {
  NEW: "text-status-new",
  REVIEWED: "text-status-reviewed",
  ACTIONED: "text-status-actioned",
};

/** Status picker (ANALYST+). Icon + label per option, so status never relies on colour alone. */
export function StatusSelect({
  value,
  onChange,
  disabled,
  className,
  label = "Status",
  id,
}: {
  value: FeedbackStatus;
  onChange: (status: FeedbackStatus) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as FeedbackStatus)} disabled={disabled}>
      <SelectTrigger id={id} aria-label={label} className={cn("h-8 w-[8.5rem] text-xs", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FEEDBACK_STATUSES.map((s) => {
          const Icon = STATUS_ICONS[s];
          return (
            <SelectItem key={s} value={s}>
              <span className="flex items-center gap-2">
                <Icon className={cn("size-3.5", TONE[s])} aria-hidden="true" />
                {STATUS_LABELS[s]}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
