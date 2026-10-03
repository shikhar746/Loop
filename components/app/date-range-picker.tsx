"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { formatDate, parseDateParam, toDateParam } from "@/lib/format";

export type DateRangeValue = { from?: string; to?: string };

/** Range picker over yyyy-MM-dd strings (the format every API date filter takes). */
export function DateRangePicker({
  value,
  onChange,
  label = "Date range",
  placeholder = "Any date",
  className,
  id,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const twoMonths = useMediaQuery("(min-width: 768px)");
  const selected: DateRange | undefined = value.from
    ? { from: parseDateParam(value.from), to: parseDateParam(value.to) }
    : undefined;

  const text = value.from
    ? value.to && value.to !== value.from
      ? `${formatDate(parseDateParam(value.from)!)} – ${formatDate(parseDateParam(value.to)!)}`
      : formatDate(parseDateParam(value.from)!)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-label={`${label}: ${text}`}
          className={cn("justify-start font-normal tabular", !value.from && "text-muted-foreground", className)}
        >
          <CalendarRange aria-hidden="true" />
          <span className="truncate">{text}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={twoMonths ? 2 : 1}
          selected={selected}
          defaultMonth={selected?.from}
          disabled={{ after: new Date() }}
          onSelect={(range) => {
            onChange({
              from: range?.from ? toDateParam(range.from) : undefined,
              to: range?.to ? toDateParam(range.to) : range?.from ? toDateParam(range.from) : undefined,
            });
          }}
        />
        <div className="flex justify-between gap-2 border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange({});
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
