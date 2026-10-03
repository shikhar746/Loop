"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { CircleDashed, Frown, Inbox, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { useMe } from "@/components/app/me-provider";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { getAnalytics, paths } from "@/lib/api-client";
import type { AnalyticsQuery } from "@/lib/api-params";
import {
  AXIS_PROPS,
  CHART_CLASSNAME,
  CHART_COLORS,
  GRID_PROPS,
  sentimentChartConfig,
  topThemesChartConfig,
  volumeChartConfig,
} from "@/lib/chart-config";
import { useApi } from "@/lib/hooks/use-api";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { reveal } from "@/lib/reveal";
import { CHANNEL_LABELS, formatBucket, formatNumber, formatPct, presetRange, SENTIMENT_LABELS } from "@/lib/format";
import type { AnalyticsResponse, Channel } from "@/lib/types";
import { CHANNELS } from "@/lib/validators/common";

const PRESETS = { "7d": 7, "30d": 30, "90d": 90 } as const;
type Preset = keyof typeof PRESETS | "custom";
const ALL = "__all";

export function DashboardView() {
  const { searchParams, set } = useUrlParams();
  const router = useRouter();
  const { canEdit } = useMe();

  const rangeParam = searchParams.get("range");
  const preset: Preset = rangeParam === "7d" || rangeParam === "90d" || rangeParam === "custom" ? rangeParam : "30d";
  const channelParam = searchParams.get("channel");
  const channel = (CHANNELS as readonly string[]).includes(channelParam ?? "") ? (channelParam as Channel) : undefined;

  const query = useMemo<AnalyticsQuery>(() => {
    if (preset === "custom") {
      return { from: searchParams.get("from") ?? undefined, to: searchParams.get("to") ?? undefined, channel };
    }
    return { ...presetRange(PRESETS[preset]), channel };
  }, [preset, searchParams, channel]);

  const { data, error, loading, refetch } = useApi<AnalyticsResponse>(paths.analytics(query), (signal) =>
    getAnalytics(query, signal),
  );

  const empty = data && data.stats.total === 0;
  const r = [1, 2, 3, 4, 5].map(reveal);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="C5 · Dashboard"
        title="Dashboard"
        description="Volume, sentiment and the themes customers talk about most, for the range you pick."
      />

      {/* Filter bar */}
      <div className={`surface flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-end ${r[0].className}`} style={r[0].style}>
        <div className="space-y-1">
          <p className="eyebrow" id="range-label">
            Range
          </p>
          <ToggleGroup
            type="single"
            value={preset}
            aria-labelledby="range-label"
            onValueChange={(v) => {
              if (!v) return;
              set({ range: v === "30d" ? null : v, from: v === "custom" ? query.from ?? null : null, to: v === "custom" ? query.to ?? null : null });
            }}
            className="justify-start"
          >
            {(["7d", "30d", "90d", "custom"] as const).map((p) => (
              <ToggleGroupItem key={p} value={p} className="px-3 font-mono text-xs" aria-label={p === "custom" ? "Custom range" : `Last ${PRESETS[p]} days`}>
                {p === "custom" ? "Custom" : p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {preset === "custom" && (
          <div className="space-y-1">
            <Label htmlFor="dash-dates" className="eyebrow">
              Dates
            </Label>
            <DateRangePicker
              id="dash-dates"
              value={{ from: query.from, to: query.to }}
              onChange={(v) => set({ range: "custom", from: v.from ?? null, to: v.to ?? null })}
              className="w-full lg:w-72"
            />
          </div>
        )}
        <div className="space-y-1 lg:ml-auto lg:w-56">
          <Label htmlFor="dash-channel" className="eyebrow">
            Channel
          </Label>
          <Select value={channel ?? ALL} onValueChange={(v) => set({ channel: v === ALL ? null : v })}>
            <SelectTrigger id="dash-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All channels</SelectItem>
              {CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <div className={`grid gap-4 sm:grid-cols-3 ${r[1].className}`} style={r[1].style}>
            <StatCard
              label="Total feedback"
              icon={Layers}
              accent
              loading={loading}
              value={data ? formatNumber(data.stats.total) : "—"}
              hint={
                data && data.stats.unclassified > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <CircleDashed className="size-3" aria-hidden="true" />
                    {formatNumber(data.stats.unclassified)} not yet classified
                  </span>
                ) : (
                  "In the selected range"
                )
              }
            />
            <StatCard
              label="% negative"
              icon={Frown}
              loading={loading}
              value={data ? formatPct(data.stats.pctNegative) : "—"}
              hint="Of classified feedback"
            />
            <StatCard
              label="New this week"
              icon={Sparkles}
              loading={loading}
              value={data ? formatNumber(data.stats.newThisWeek) : "—"}
              hint="Last 7 days, within the filters"
            />
          </div>

          {empty && !loading ? (
            <Card className={r[2].className} style={r[2].style}>
              <EmptyState
                icon={Inbox}
                title="No feedback in this range"
                description="Widen the date range or pick another channel."
                action={
                  canEdit ? (
                    <Button asChild variant="outline">
                      <Link href="/inbox">Go to Inbox to add feedback</Link>
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <>
              <div className={`grid gap-4 xl:grid-cols-3 ${r[2].className}`} style={r[2].style}>
                <ChartCard title="Volume over time" description="Feedback items per day" className="xl:col-span-2" loading={loading || !data}>
                  {data && <VolumeChart data={data.volume} />}
                </ChartCard>
                <ChartCard title="Sentiment" description="Classified items by sentiment" loading={loading || !data}>
                  {data && <SentimentChart data={data.sentiment} />}
                </ChartCard>
              </div>
              <div className={r[3].className} style={r[3].style}>
                <ChartCard title="Top themes" description="Click a theme to open it" loading={loading || !data}>
                  {data &&
                    (data.topThemes.length ? (
                      <TopThemesChart data={data.topThemes} onSelect={(id) => router.push(`/themes/${id}`)} />
                    ) : (
                      <p className="py-10 text-center text-sm text-muted-foreground">No themes in this range yet.</p>
                    ))}
                </ChartCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ChartCard({
  title,
  description,
  loading,
  className,
  children,
}: {
  title: string;
  description: string;
  loading: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{loading ? <Skeleton className="h-64 w-full" /> : children}</CardContent>
    </Card>
  );
}

function VolumeChart({ data }: { data: AnalyticsResponse["volume"] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <figure>
      <ChartContainer config={volumeChartConfig} className={`aspect-auto h-64 w-full ${CHART_CLASSNAME}`}>
        <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="vol-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={formatBucket} minTickGap={24} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatBucket(String(v))} />} />
          <Area dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} fill="url(#vol-fill)" />
        </AreaChart>
      </ChartContainer>
      <figcaption className="sr-only">
        {formatNumber(total)} feedback items across {data.length} days.
      </figcaption>
    </figure>
  );
}

function SentimentChart({ data }: { data: AnalyticsResponse["sentiment"] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const rows = data.map((d) => ({ ...d, label: SENTIMENT_LABELS[d.sentiment], fill: `var(--color-${d.sentiment})` }));
  return (
    <div className="space-y-4">
      <ChartContainer config={sentimentChartConfig} className={`aspect-auto h-44 w-full ${CHART_CLASSNAME}`}>
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={72} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="sentiment" />} />
          <Bar dataKey="count" radius={4}>
            {rows.map((r) => (
              <Cell key={r.sentiment} fill={r.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {/* Values as text too, so nothing depends on colour */}
      <ul className="grid grid-cols-3 gap-2 text-center">
        {data.map((d) => (
          <li key={d.sentiment} className="rounded-md border border-border bg-raised px-2 py-1.5">
            <p className="text-[0.7rem] text-muted-foreground">{SENTIMENT_LABELS[d.sentiment]}</p>
            <p className="font-mono text-sm tabular">{total ? formatPct((d.count / total) * 100, 0) : "0%"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopThemesChart({
  data,
  onSelect,
}: {
  data: AnalyticsResponse["topThemes"];
  onSelect: (themeId: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
      <ChartContainer config={topThemesChartConfig} className={`aspect-auto h-72 w-full ${CHART_CLASSNAME}`}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
          <CartesianGrid {...GRID_PROPS} vertical horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
          <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={130} />
          <ChartTooltip cursor={{ fill: "hsl(var(--accent))" }} content={<ChartTooltipContent hideLabel={false} />} />
          <Bar
            dataKey="count"
            radius={4}
            className="cursor-pointer"
            onClick={(entry: { themeId?: string }) => entry.themeId && onSelect(entry.themeId)}
          >
            {data.map((t, i) => (
              <Cell key={t.themeId} fill={i === 0 ? CHART_COLORS.accent : CHART_COLORS.series[(i - 1) % CHART_COLORS.series.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {/* Keyboard-accessible equivalent of clicking a bar */}
      <ol className="space-y-1" aria-label="Top themes">
        {data.map((t, i) => (
          <li key={t.themeId}>
            <Link
              href={`/themes/${t.themeId}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-4 font-mono text-xs text-muted-foreground tabular">{i + 1}</span>
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
              <span className="flex-1 truncate">{t.name}</span>
              <span className="font-mono text-xs tabular">{formatNumber(t.count)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
