"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChannelLabel } from "@/components/app/channel-label";
import { SentimentBadge } from "@/components/app/sentiment-badge";
import { ClassificationBadge, StatusBadge } from "@/components/app/status-badge";
import { ThemeTag } from "@/components/app/theme-tag";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/format";
import type { Feedback, FeedbackStatus } from "@/lib/types";
import { StatusSelect } from "./status-select";

type Props = {
  items: Feedback[];
  canEdit: boolean;
  selectedId?: string;
  onOpen: (id: string) => void;
  onStatusChange: (item: Feedback, status: FeedbackStatus) => void;
};

function Themes({ item }: { item: Feedback }) {
  if (item.themes.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const extra = item.themes.length - 2;
  return (
    <div className="flex flex-wrap gap-1">
      {item.themes.slice(0, 2).map((t) => (
        <ThemeTag key={t.id} name={t.name} color={t.color} />
      ))}
      {extra > 0 && (
        <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground" title={item.themes.slice(2).map((t) => t.name).join(", ")}>
          +{extra}
        </span>
      )}
    </div>
  );
}

function Sentiment({ item }: { item: Feedback }) {
  if (item.classificationStatus !== "DONE" && !item.sentiment) return <ClassificationBadge status={item.classificationStatus} />;
  return (
    <div className="flex flex-col items-start gap-1">
      <SentimentBadge sentiment={item.sentiment} />
      {item.classificationStatus === "FAILED" && <ClassificationBadge status="FAILED" />}
    </div>
  );
}

export function FeedbackTable({ items, canEdit, selectedId, onOpen, onStatusChange }: Props) {
  return (
    <>
      {/* lg+: table (scrolls inside its container if needed) */}
      <div className="surface hidden overflow-hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[42%]">Feedback</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Themes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                data-state={item.id === selectedId ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onOpen(item.id)}
              >
                <TableCell className="min-w-[18rem] max-w-[28rem]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(item.id);
                    }}
                    className="block w-full rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="line-clamp-2 text-[0.9rem] leading-snug text-foreground">{item.content}</span>
                    {item.customerLabel && (
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{item.customerLabel}</span>
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <ChannelLabel channel={item.channel} />
                </TableCell>
                <TableCell>
                  <Sentiment item={item} />
                </TableCell>
                <TableCell>
                  <Themes item={item} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {canEdit ? (
                    <StatusSelect
                      value={item.status}
                      onChange={(s) => onStatusChange(item, s)}
                      label={`Status for feedback from ${item.customerLabel ?? "customer"}`}
                    />
                  ) : (
                    <StatusBadge status={item.status} />
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <time dateTime={item.createdAt} title={formatDate(item.createdAt)} className="font-mono text-xs text-muted-foreground">
                    {formatRelative(item.createdAt)}
                  </time>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* < lg: stacked cards */}
      <ul className="space-y-3 lg:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <Card className={cn("p-4", item.id === selectedId && "border-primary/50")}>
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                className="block w-full rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="line-clamp-3 text-[0.92rem] leading-snug">{item.content}</span>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ChannelLabel channel={item.channel} className="text-xs" />
                <Sentiment item={item} />
              </div>
              <div className="mt-2">
                <Themes item={item} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                {canEdit ? (
                  <StatusSelect value={item.status} onChange={(s) => onStatusChange(item, s)} />
                ) : (
                  <StatusBadge status={item.status} />
                )}
                <time dateTime={item.createdAt} className="font-mono text-xs text-muted-foreground">
                  {formatRelative(item.createdAt)}
                </time>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

export function FeedbackTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="surface p-4" aria-busy="true" aria-label="Loading feedback">
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="h-3 w-2/3 max-w-sm" />
            </div>
            <Skeleton className="hidden h-6 w-24 md:block" />
            <Skeleton className="hidden h-6 w-20 md:block" />
            <Skeleton className="hidden h-6 w-28 lg:block" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
