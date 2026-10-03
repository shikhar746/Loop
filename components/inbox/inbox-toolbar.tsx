"use client";

import { useEffect, useRef, useState } from "react";
import { FilterX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { ThemeSelect } from "@/components/app/theme-select";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { CHANNEL_LABELS, SENTIMENT_LABELS, STATUS_LABELS } from "@/lib/format";
import type { FeedbackListParams, FeedbackSort } from "@/lib/api-params";
import type { ThemeListItem } from "@/lib/types";
import { CHANNELS, FEEDBACK_STATUSES, SENTIMENTS } from "@/lib/validators/common";
import { FEEDBACK_SORTS } from "@/lib/validators/feedback";
import { SORT_LABELS } from "./inbox-params";

const ALL = "__all";

type Update = Record<string, string | number | null | undefined>;

export function InboxToolbar({
  params,
  themes,
  themesLoading,
  onChange,
  onClear,
  hasFilters,
}: {
  params: FeedbackListParams & { sort: FeedbackSort };
  themes: ThemeListItem[];
  themesLoading: boolean;
  onChange: (update: Update) => void;
  onClear: () => void;
  hasFilters: boolean;
}) {
  // Search: local state, pushed to the URL 300ms after typing stops.
  const [search, setSearch] = useState(params.q ?? "");
  const debounced = useDebounce(search, 300);
  const lastPushed = useRef(params.q ?? "");

  useEffect(() => {
    const next = debounced.trim();
    if (next === lastPushed.current) return;
    lastPushed.current = next;
    onChange({ q: next || null, page: null });
  }, [debounced, onChange]);

  // External changes (Clear filters, back/forward) flow back into the box.
  useEffect(() => {
    const urlQ = params.q ?? "";
    if (urlQ !== lastPushed.current) {
      lastPushed.current = urlQ;
      setSearch(urlQ);
    }
  }, [params.q]);

  const select = (key: string) => (value: string) => onChange({ [key]: value === ALL ? null : value, page: null });

  return (
    <div className="surface space-y-3 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Label htmlFor="inbox-search" className="sr-only">
            Search feedback
          </Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="inbox-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback, customers, source refs…"
            className="h-10 pl-9"
            maxLength={200}
          />
        </div>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1 lg:w-44 lg:flex-none">
            <Label htmlFor="inbox-sort" className="sr-only">
              Sort
            </Label>
            <Select value={params.sort} onValueChange={(v) => onChange({ sort: v === "newest" ? null : v, page: null })}>
              <SelectTrigger id="inbox-sort" className="h-10" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" className="h-10" onClick={onClear} disabled={!hasFilters}>
            <FilterX aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Clear filters</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <FilterSelect
          id="f-channel"
          label="Channel"
          value={params.channel}
          allLabel="All channels"
          options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))}
          onChange={select("channel")}
        />
        <FilterSelect
          id="f-sentiment"
          label="Sentiment"
          value={params.sentiment}
          allLabel="All sentiment"
          options={SENTIMENTS.map((s) => ({ value: s, label: SENTIMENTS_LABEL(s) }))}
          onChange={select("sentiment")}
        />
        <FilterSelect
          id="f-status"
          label="Status"
          value={params.status}
          allLabel="All statuses"
          options={FEEDBACK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          onChange={select("status")}
        />
        <div className="space-y-1">
          <Label htmlFor="f-theme" className="eyebrow">
            Theme
          </Label>
          <ThemeSelect
            id="f-theme"
            themes={themes}
            loading={themesLoading}
            value={params.themeId}
            onChange={(id) => onChange({ themeId: id ?? null, page: null })}
            className="w-full"
          />
        </div>
        <div className="col-span-2 space-y-1 md:col-span-1">
          <Label htmlFor="f-dates" className="eyebrow">
            Date
          </Label>
          <DateRangePicker
            id="f-dates"
            value={{ from: params.from, to: params.to }}
            onChange={(r) => onChange({ from: r.from ?? null, to: r.to ?? null, page: null })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

const SENTIMENTS_LABEL = (s: (typeof SENTIMENTS)[number]) => SENTIMENT_LABELS[s];

function FilterSelect({
  id,
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="eyebrow">
        {label}
      </Label>
      <Select value={value ?? ALL} onValueChange={onChange}>
        <SelectTrigger id={id} className={value ? "border-primary/50" : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
