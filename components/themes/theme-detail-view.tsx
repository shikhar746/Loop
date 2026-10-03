"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ArrowLeft, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChannelLabel } from "@/components/app/channel-label";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { useMe } from "@/components/app/me-provider";
import { PageHeader } from "@/components/app/page-header";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { SentimentBadge } from "@/components/app/sentiment-badge";
import { StatusBadge } from "@/components/app/status-badge";
import { deleteTheme, getTheme, paths } from "@/lib/api-client";
import { CHART_CLASSNAME, CHART_COLORS, sentimentChartConfig } from "@/lib/chart-config";
import { useApi } from "@/lib/hooks/use-api";
import { toastError } from "@/lib/notify";
import { reveal } from "@/lib/reveal";
import { formatNumber, formatPct, formatRelative, SENTIMENT_LABELS } from "@/lib/format";
import type { ThemeDetail } from "@/lib/types";
import { ThemeFormDialog } from "./theme-form-dialog";

const mixConfig = {
  ...sentimentChartConfig,
  unclassified: { label: "Unclassified", color: "hsl(var(--muted-foreground) / 0.45)" },
};

export function ThemeDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { canEdit, isAdmin } = useMe();
  const { data, error, loading, refetch, setData } = useApi<ThemeDetail>(paths.theme(id), (signal) => getTheme(id, signal));
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (error?.status === 404) notFound();
  if (error && !data) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (loading || !data) return <PageSkeleton blocks={2} label="Loading theme" />;

  const mixRow = {
    name: "Mix",
    ...Object.fromEntries(data.sentiment.map((s) => [s.sentiment, s.count])),
    unclassified: data.unclassified,
  };
  const r = [1, 2, 3].map(reveal);

  async function remove() {
    try {
      await deleteTheme(id);
      toast.success(`Theme "${data!.name}" deleted. Its feedback is unchanged.`);
      router.push("/trends");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/trends">
          <ArrowLeft aria-hidden="true" />
          Trends
        </Link>
      </Button>
      <PageHeader
        eyebrow="Theme"
        title={
          <span className="inline-flex items-center gap-3">
            <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: data.color }} aria-hidden="true" />
            {data.name}
          </span>
        }
        description={
          <>
            {data.description ?? "No description yet."}{" "}
            <span className="font-mono text-foreground tabular">· {formatNumber(data.count)} items</span>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/inbox?themeId=${encodeURIComponent(id)}`}>
                View all in Inbox
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            {canEdit && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden="true" />
                Edit
              </Button>
            )}
            {isAdmin && (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 aria-hidden="true" />
                Delete theme
              </Button>
            )}
          </>
        }
      />

      <Card className={r[0].className} style={r[0].style}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Sentiment mix</CardTitle>
          <CardDescription>All {formatNumber(data.count)} items tagged with this theme.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChartContainer config={mixConfig} className={`aspect-auto h-28 w-full ${CHART_CLASSNAME}`}>
            <BarChart data={[mixRow]} layout="vertical" stackOffset="expand" margin={{ left: 0, right: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="POS" stackId="m" fill={CHART_COLORS.positive} radius={[4, 0, 0, 4]} />
              <Bar dataKey="NEU" stackId="m" fill={CHART_COLORS.neutral} />
              <Bar dataKey="NEG" stackId="m" fill={CHART_COLORS.negative} />
              <Bar dataKey="unclassified" stackId="m" fill="var(--color-unclassified)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {data.sentiment.map((s) => (
              <li key={s.sentiment} className="font-mono tabular">
                <span className="font-sans text-muted-foreground">{SENTIMENT_LABELS[s.sentiment]}</span>{" "}
                {formatNumber(s.count)} ({data.count ? formatPct((s.count / data.count) * 100, 0) : "0%"})
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section aria-labelledby="latest-heading" className={`surface ${r[1].className}`} style={r[1].style}>
        <h2 id="latest-heading" className="border-b border-border px-5 py-4 font-display text-xl font-semibold">
          Latest feedback
        </h2>
        {data.latest.length === 0 ? (
          <EmptyState title="Nothing tagged yet" description="Items appear here as LOOP classifies matching feedback." />
        ) : (
          <ul className="divide-y divide-border">
            {data.latest.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/inbox?id=${encodeURIComponent(f.id)}`}
                  className="block px-5 py-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <p className="line-clamp-2 text-[0.92rem] leading-snug">{f.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ChannelLabel channel={f.channel} className="text-xs" />
                    <SentimentBadge sentiment={f.sentiment} />
                    <StatusBadge status={f.status} />
                    <time dateTime={f.createdAt} className="ml-auto font-mono text-xs text-muted-foreground">
                      {formatRelative(f.createdAt)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ThemeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        theme={data}
        onSaved={(t) => setData((prev) => (prev ? { ...prev, name: t.name, description: t.description, color: t.color } : prev))}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${data.name}"?`}
        description={
          <>
            <p>The {formatNumber(data.count)} feedback items keep existing; they only lose this tag.</p>
            <p>Charts and trends will stop showing this theme. This can&apos;t be undone.</p>
          </>
        }
        confirmLabel="Delete theme"
        onConfirm={remove}
      />
    </div>
  );
}
