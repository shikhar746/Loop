import { z } from "zod";
import { isoDate, isoDateEnd } from "./common";

export const createReportSchema = z
  .object({
    periodStart: isoDate,
    periodEnd: isoDateEnd,
    title: z.string().trim().min(1).max(120).optional(),
  })
  .refine((v) => v.periodEnd > v.periodStart, { message: "periodEnd must be after periodStart", path: ["periodEnd"] })
  .refine((v) => v.periodEnd.getTime() - v.periodStart.getTime() <= 366 * 86_400_000, {
    message: "period can be at most one year",
    path: ["periodEnd"],
  });
export type CreateReportInput = z.infer<typeof createReportSchema>;

/** Narrative Claude writes for a report (validated before saving). */
export const reportNarrativeSchema = z.object({
  headline: z.string().min(1).max(200),
  executiveSummary: z.string().min(1).max(2000),
  themeHighlights: z.array(z.object({ themeId: z.string(), narrative: z.string().min(1).max(800) })).max(5),
  sentimentShift: z.string().min(1).max(800),
  quoteIds: z.array(z.string()).max(10),
  recommendedActions: z
    .array(
      z.object({
        action: z.string().min(1).max(300),
        rationale: z.string().min(1).max(600),
        themeId: z.string().nullable(),
      }),
    )
    .min(1)
    .max(6),
});
export type ReportNarrative = z.infer<typeof reportNarrativeSchema>;

export type CountDelta = { current: number; previous: number; delta: number; changePct: number | null };

export type ReportQuote = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sentiment: string | null;
  createdAt: string;
};

export type ReportThemeStat = {
  themeId: string;
  name: string;
  color: string;
  current: number;
  previous: number;
  changePct: number | null;
  isSpiking: boolean;
  candidateQuotes: ReportQuote[];
};

export type ReportStats = {
  period: { start: string; end: string };
  previousPeriod: { start: string; end: string };
  totals: CountDelta;
  sentiment: { POS: CountDelta; NEU: CountDelta; NEG: CountDelta; unclassified: number };
  topThemes: ReportThemeStat[];
  spikingThemes: { themeId: string; name: string; current: number; previous: number; changePct: number | null }[];
  channelMix: { channel: string; count: number; pct: number }[];
};

export type ReportContent = { stats: ReportStats; narrative: ReportNarrative };
