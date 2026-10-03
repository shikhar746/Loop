"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { ThemeListItem } from "@/lib/types";

/** Searchable theme combobox (Command in a Popover). `value` is a theme id or undefined for "All themes". */
export function ThemeSelect({
  themes,
  value,
  onChange,
  loading = false,
  className,
  id,
}: {
  themes: ThemeListItem[];
  value?: string;
  onChange: (themeId: string | undefined) => void;
  loading?: boolean;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = themes.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Theme: ${current?.name ?? "All themes"}`}
          className={cn("justify-between font-normal", !current && "text-muted-foreground", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {current ? (
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: current.color }} aria-hidden="true" />
            ) : (
              <Tags aria-hidden="true" />
            )}
            <span className="truncate">{current?.name ?? (loading ? "Loading themes…" : "All themes")}</span>
          </span>
          <ChevronsUpDown className="opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search themes…" />
          <CommandList>
            <CommandEmpty>No themes found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check className={cn(value ? "opacity-0" : "opacity-100")} aria-hidden="true" />
                All themes
              </CommandItem>
              {themes.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.name} ${t.id}`}
                  onSelect={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn(value === t.id ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                  <span className="truncate">{t.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground tabular">{formatNumber(t.count)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
