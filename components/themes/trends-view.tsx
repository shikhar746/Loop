"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, Plus, Sparkle, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { useMe } from "@/components/app/me-provider";
import { PageHeader } from "@/components/app/page-header";
import { SpikeBadge } from "@/components/app/status-badge";
import { getThemeTrends, paths } from "@/lib/api-client";
import type { TrendsParams } from "@/lib/api-params";
import { AXIS_PROPS, CHART_CLASSNAME, GRID_PROPS, themeSeriesConfig } from "@/lib/chart-config";
import { useApi } from "@/lib/hooks/use-api";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { reveal } from "@/lib/reveal";
import { cn } from "@/lib/utils";
import { formatBucket, formatChange, formatNumber } from "@/lib/format";
import type { ThemeTrend, TrendsResponse } from "@/lib/types";
import { ThemeFormDialog } from "./theme-form-dialog";

const TOP_N = 6;
// Spiking themes share the spike colour, so each gets its own dash pattern too.
const SPIKE_DASHES = [undefined, "8 4", "2 4"];

export function TrendsView() {
  const { searchParams, set } = useUrlParams();
  const router = useRouter();
  const { canEdit } = useMe();
  const [createOpen, setCreateOpen] = useState(false);

  const p = searchParams.get("period");
  const b = searchParams.get("bucket");
  const query: TrendsParams = {
    period: p === "7d" || p === "90d" ? p : "30d",
    bucket: b === "week" ? "week" : "day",
  };

  const { data, error, loading, refetch } = useApi<TrendsResponse>(paths.themeTrends(query), (signal) =>
    getThemeTrends(query, signal),
  );

  const top = useMemo(() => (data ? data.themes.filter((t) => t.current > 0).slice(0, TOP_N) : []), [data]);
  const config = useMemo(() => themeSeriesConfig(top), [top]);
  const spiking = data?.themes.filter((t) => t.isSpiking) ?? [];
  const r = [1, 2, 3].map(reveal);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI2 · Themes & trends"
        title="Trends"
        description="Which themes are growing, compared with the previous period of the same length."
        actions={
          canEdit ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              New theme
            </Button>
          ) : null
        }
      />

      <div className={cn("flex flex-wrap items-center gap-3", r[0].className)} style={r[0].style}>
        <Tabs value={query.period} onValueChange={(v) => set({ period: v === "30d" ? null : v })}>
          <TabsList aria-label="Period">
            {(["7d", "30d", "90d"] as const).map((v) => (
              <TabsTrigger key={v} value={v} className="font-mono text-xs">
                Last {v}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ToggleGroup
          type="single"
          value={query.bucket}
          onValueChange={(v) => v && set({ bucket: v === "day" ? null : v })}
          aria-label="Bucket size"
          className="rounded-lg border border-border bg-card p-1"
        >
          <ToggleGroupItem value="day" size="sm" className="px-3 text-xs">
            By day
          </ToggleGroupItem>
          <ToggleGroupItem value="week" size="sm" className="px-3 text-xs">
            By week
          </ToggleGroupItem>
        </ToggleGroup>
        {spiking.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-spike" role="status">
            <Sparkle className="size-4" aria-hidden="true" />
            {spiking.length} theme{spiking.length === 1 ? " is" : "s are"} spiking: {spiking.map((s) => s.name).join(", ")}
          </p>
        )}
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <Card className={r[1].className} style={r[1].style}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Top {TOP_N} themes by volume</CardTitle>
              <CardDescription>Spiking themes are drawn thicker in amber (each with its own dash) and marked in the legend.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-80 w-full" />
              ) : top.length === 0 ? (
                <EmptyState icon={Tags} title="No themed feedback in this period" description="Try a longer period, or classify pending feedback in the Inbox." />
              ) : (
                <ChartContainer config={config} className={`aspect-auto h-80 w-full ${CHART_CLASSNAME}`}>
                  <LineChart data={data.chartData} margin={{ left: -16, right: 12, top: 8 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={(v: string) => formatBucket(v)} minTickGap={24} />
                    <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatBucket(String(v))} />} />
                    <ChartLegend content={<ChartLegendContent className="flex-wrap" />} />
                    {top.map((t) => (
                      <Line
                        strokeDasharray={t.isSpiking ? SPIKE_DASHES[top.filter((x) => x.isSpiking).indexOf(t) % SPIKE_DASHES.length] : undefined}
                        key={t.themeId}
                        dataKey={t.themeId}
                        name={t.themeId}
                        type="monotone"
                        stroke={`var(--color-${t.themeId})`}
                        strokeWidth={t.isSpiking ? 3.5 : 1.75}
                        dot={t.isSpiking ? { r: 3, strokeWidth: 0, fill: `var(--color-${t.themeId})` } : false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <section aria-labelledby="all-themes" className={cn("surface overflow-hidden", r[2].className)} style={r[2].style}>
            <h2 id="all-themes" className="border-b border-border px-5 py-4 font-display text-xl font-semibold">
              All themes
            </h2>
            {loading || !data ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data.themes.length === 0 ? (
              <EmptyState
                icon={Tags}
                title="No themes yet"
                description={canEdit ? "Create one, or let LOOP propose themes as it classifies feedback." : "Themes appear once feedback is classified."}
                action={
                  canEdit ? (
                    <Button variant="outline" onClick={() => setCreateOpen(true)}>
                      <Plus aria-hidden="true" />
                      New theme
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Theme</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>
                      <span className="sr-only">Spiking</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.themes.map((t) => (
                    <TableRow key={t.themeId} className="cursor-pointer" onClick={() => router.push(`/themes/${t.themeId}`)}>
                      <TableCell>
                        <Link
                          href={`/themes/${t.themeId}`}
                          className="inline-flex items-center gap-2 rounded-sm font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                          {t.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(t.current)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{formatNumber(t.previous)}</TableCell>
                      <TableCell className="text-right">
                        <Change trend={t} />
                      </TableCell>
                      <TableCell>{t.isSpiking && <SpikeBadge />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      )}

      <ThemeFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => refetch({ silent: true })} />
    </div>
  );
}

function Change({ trend }: { trend: ThemeTrend }) {
  const { changePct, current } = trend;
  const up = changePct === null ? current > 0 : changePct > 0;
  const down = changePct !== null && changePct < 0;
  const Icon = changePct === null && current === 0 ? Minus : up ? ArrowUpRight : down ? ArrowDownRight : ArrowRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-sm tabular",
        trend.isSpiking ? "text-spike" : up ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {changePct === null && current === 0 ? "—" : formatChange(changePct)}
    </span>
  );
}
