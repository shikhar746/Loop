import type { ChartConfig } from "@/components/ui/chart";

/**
 * The one chart config for LOOP. Series use the purple family, the lime accent is reserved for the
 * most important series, sentiment uses the semantic colours, and spiking themes use the spike colour.
 */
export const CHART_COLORS = {
  accent: "hsl(var(--chart-1))",
  series: [
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
    "hsl(var(--lavender))",
  ],
  positive: "hsl(var(--positive))",
  neutral: "hsl(var(--neutral))",
  negative: "hsl(var(--negative))",
  spike: "hsl(var(--spike))",
  grid: "hsl(var(--chart-grid))",
  axis: "hsl(var(--muted-foreground))",
} as const;

/** Shared axis / grid props so every chart reads the same. */
export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  fontSize: 11,
  stroke: CHART_COLORS.axis,
} as const;

export const GRID_PROPS = {
  vertical: false,
  stroke: CHART_COLORS.grid,
  strokeDasharray: "3 4",
} as const;

/** Font + text treatment applied to every ChartContainer. */
export const CHART_CLASSNAME = "font-mono tabular [&_.recharts-text]:font-mono";

export const volumeChartConfig = {
  count: { label: "Feedback", color: CHART_COLORS.accent },
} satisfies ChartConfig;

export const sentimentChartConfig = {
  POS: { label: "Positive", color: CHART_COLORS.positive },
  NEU: { label: "Neutral", color: CHART_COLORS.neutral },
  NEG: { label: "Negative", color: CHART_COLORS.negative },
} satisfies ChartConfig;

export const topThemesChartConfig = {
  count: { label: "Items", color: CHART_COLORS.series[0] },
} satisfies ChartConfig;

/**
 * Per-theme config for multi-series charts (trends). Spiking themes get the spike colour; the
 * highest-volume non-spiking theme gets the accent; the rest cycle through the purple family.
 */
export function themeSeriesConfig(
  themes: { themeId: string; name: string; isSpiking: boolean }[],
): ChartConfig {
  const config: ChartConfig = {};
  let purple = 0;
  let accentUsed = false;
  for (const t of themes) {
    let color: string;
    if (t.isSpiking) color = CHART_COLORS.spike;
    else if (!accentUsed) {
      color = CHART_COLORS.accent;
      accentUsed = true;
    } else color = CHART_COLORS.series[purple++ % CHART_COLORS.series.length];
    config[t.themeId] = { label: t.isSpiking ? `${t.name} (spiking)` : t.name, color };
  }
  return config;
}
