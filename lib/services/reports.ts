import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { writeReportNarrative } from "../ai";
import { badRequest, notFound } from "../http";
import { paginated } from "../validators/common";
import type {
  CountDelta,
  CreateReportInput,
  ReportContent,
  ReportNarrative,
  ReportQuote,
  ReportStats,
  ReportThemeStat,
} from "../validators/reports";
import { changePct, isSpiking } from "./themes";

const TOP_THEME_COUNT = 5;
const QUOTES_PER_THEME = 3;

function countDelta(current: number, previous: number): CountDelta {
  return { current, previous, delta: current - previous, changePct: changePct(current, previous) };
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Every number in a report is computed here, in code. Claude only writes prose around it. */
async function computeReportStats(workspaceId: string, start: Date, end: Date): Promise<ReportStats> {
  const length = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - length);

  const [totalsRows, themeRows, channelRows] = await Promise.all([
    db.$queryRaw<
      {
        curTotal: number; prevTotal: number;
        curPos: number; prevPos: number; curNeu: number; prevNeu: number; curNeg: number; prevNeg: number;
        curUnclassified: number;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE f."createdAt" >= ${start})::int AS "curTotal",
        COUNT(*) FILTER (WHERE f."createdAt" < ${start})::int AS "prevTotal",
        COUNT(*) FILTER (WHERE f."createdAt" >= ${start} AND f."sentiment" = 'POS')::int AS "curPos",
        COUNT(*) FILTER (WHERE f."createdAt" < ${start} AND f."sentiment" = 'POS')::int AS "prevPos",
        COUNT(*) FILTER (WHERE f."createdAt" >= ${start} AND f."sentiment" = 'NEU')::int AS "curNeu",
        COUNT(*) FILTER (WHERE f."createdAt" < ${start} AND f."sentiment" = 'NEU')::int AS "prevNeu",
        COUNT(*) FILTER (WHERE f."createdAt" >= ${start} AND f."sentiment" = 'NEG')::int AS "curNeg",
        COUNT(*) FILTER (WHERE f."createdAt" < ${start} AND f."sentiment" = 'NEG')::int AS "prevNeg",
        COUNT(*) FILTER (WHERE f."createdAt" >= ${start} AND f."sentiment" IS NULL)::int AS "curUnclassified"
      FROM "Feedback" f
      WHERE f."workspaceId" = ${workspaceId} AND f."createdAt" >= ${prevStart} AND f."createdAt" <= ${end}`,
    db.$queryRaw<{ themeId: string; name: string; color: string; current: number; previous: number }[]>`
      SELECT t."id" AS "themeId", t."name", t."color",
             COUNT(*) FILTER (WHERE f."createdAt" >= ${start})::int AS "current",
             COUNT(*) FILTER (WHERE f."createdAt" < ${start})::int AS "previous"
      FROM "FeedbackTheme" ft
      JOIN "Feedback" f ON f."id" = ft."feedbackId"
      JOIN "Theme" t ON t."id" = ft."themeId"
      WHERE f."workspaceId" = ${workspaceId} AND t."workspaceId" = ${workspaceId}
        AND f."createdAt" >= ${prevStart} AND f."createdAt" <= ${end}
      GROUP BY t."id", t."name", t."color"`,
    db.$queryRaw<{ channel: string; count: number }[]>`
      SELECT f."channel"::text AS "channel", COUNT(*)::int AS "count"
      FROM "Feedback" f
      WHERE f."workspaceId" = ${workspaceId} AND f."createdAt" >= ${start} AND f."createdAt" <= ${end}
      GROUP BY 1
      ORDER BY 2 DESC`,
  ]);

  const t = totalsRows[0];
  const top = themeRows
    .filter((r) => r.current > 0)
    .sort((a, b) => b.current - a.current || a.name.localeCompare(b.name))
    .slice(0, TOP_THEME_COUNT);

  // Candidate quotes for every top theme in ONE query (top N per theme by confidence, then recency).
  // One round-trip instead of one per theme matters with connection_limit=1 on the pooler.
  const quoteRows = top.length
    ? await db.$queryRaw<
        {
          themeId: string;
          id: string;
          content: string;
          channel: string;
          customerLabel: string | null;
          sentiment: string | null;
          createdAt: Date;
        }[]
      >`
        SELECT q."themeId", q."id", q."content", q."channel", q."customerLabel", q."sentiment", q."createdAt"
        FROM (
          SELECT ft."themeId", f."id", f."content", f."channel"::text AS "channel", f."customerLabel",
                 f."sentiment"::text AS "sentiment", f."createdAt",
                 ROW_NUMBER() OVER (PARTITION BY ft."themeId" ORDER BY ft."confidence" DESC, f."createdAt" DESC) AS "rn"
          FROM "FeedbackTheme" ft
          JOIN "Feedback" f ON f."id" = ft."feedbackId"
          WHERE f."workspaceId" = ${workspaceId}
            AND ft."themeId" IN (${Prisma.join(top.map((r) => r.themeId))})
            AND f."createdAt" >= ${start} AND f."createdAt" <= ${end}
        ) q
        WHERE q."rn" <= ${QUOTES_PER_THEME}
        ORDER BY q."themeId", q."rn"`
    : [];

  const topThemes: ReportThemeStat[] = top.map((r) => {
    const candidateQuotes: ReportQuote[] = quoteRows
      .filter((q) => q.themeId === r.themeId)
      .map((q) => ({
        id: q.id,
        content: q.content,
        channel: q.channel,
        customerLabel: q.customerLabel,
        sentiment: q.sentiment,
        createdAt: q.createdAt.toISOString(),
      }));
    return {
      themeId: r.themeId,
      name: r.name,
      color: r.color,
      current: r.current,
      previous: r.previous,
      changePct: changePct(r.current, r.previous),
      isSpiking: isSpiking(r.current, r.previous),
      candidateQuotes,
    };
  });

  const spikingThemes = themeRows
    .filter((r) => isSpiking(r.current, r.previous))
    .map((r) => ({ themeId: r.themeId, name: r.name, current: r.current, previous: r.previous, changePct: changePct(r.current, r.previous) }));

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    previousPeriod: { start: prevStart.toISOString(), end: start.toISOString() },
    totals: countDelta(t.curTotal, t.prevTotal),
    sentiment: {
      POS: countDelta(t.curPos, t.prevPos),
      NEU: countDelta(t.curNeu, t.prevNeu),
      NEG: countDelta(t.curNeg, t.prevNeg),
      unclassified: t.curUnclassified,
    },
    topThemes,
    spikingThemes,
    channelMix: channelRows.map((c) => ({
      channel: c.channel,
      count: c.count,
      pct: t.curTotal ? Math.round((c.count / t.curTotal) * 1000) / 10 : 0,
    })),
  };
}

/** Drop anything in Claude's narrative that doesn't point at data we supplied. */
function sanitizeNarrative(narrative: ReportNarrative, stats: ReportStats): ReportNarrative {
  const themeIds = new Set(stats.topThemes.map((t) => t.themeId));
  const quoteIds = new Set(stats.topThemes.flatMap((t) => t.candidateQuotes.map((q) => q.id)));
  const pickedQuotes = [...new Set(narrative.quoteIds.filter((id) => quoteIds.has(id)))];
  return {
    ...narrative,
    themeHighlights: narrative.themeHighlights.filter((h) => themeIds.has(h.themeId)),
    quoteIds: pickedQuotes.length
      ? pickedQuotes
      : stats.topThemes.slice(0, 3).flatMap((t) => (t.candidateQuotes[0] ? [t.candidateQuotes[0].id] : [])),
    recommendedActions: narrative.recommendedActions.map((a) => ({
      ...a,
      themeId: a.themeId && themeIds.has(a.themeId) ? a.themeId : null,
    })),
  };
}

const reportListSelect = {
  id: true,
  title: true,
  periodStart: true,
  periodEnd: true,
  createdAt: true,
  shareToken: true,
  generatedBy: { select: { id: true, name: true } },
} satisfies Prisma.ReportSelect;

export async function createReport(workspaceId: string, userId: string, input: CreateReportInput) {
  const stats = await computeReportStats(workspaceId, input.periodStart, input.periodEnd);
  if (stats.totals.current === 0) {
    throw badRequest("There is no feedback in this period, so there's nothing to report on. Pick a different date range.");
  }

  // Trim quote text for the prompt; the saved stats keep the full text.
  const promptStats = {
    ...stats,
    topThemes: stats.topThemes.map((th) => ({
      ...th,
      candidateQuotes: th.candidateQuotes.map((q) => ({ id: q.id, channel: q.channel, text: q.content.slice(0, 400) })),
    })),
  };
  const narrative = sanitizeNarrative(await writeReportNarrative(promptStats), stats);

  const content: ReportContent = { stats, narrative };
  const report = await db.report.create({
    data: {
      workspaceId,
      generatedById: userId,
      title: input.title ?? `Voice of Customer: ${fmtDate(input.periodStart)} – ${fmtDate(input.periodEnd)}`,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      contentJson: content as unknown as Prisma.InputJsonValue,
    },
    select: { ...reportListSelect, contentJson: true },
  });
  return report;
}

export async function listReports(workspaceId: string, page: number, pageSize: number) {
  const [total, items] = await Promise.all([
    db.report.count({ where: { workspaceId } }),
    db.report.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: reportListSelect,
    }),
  ]);
  return paginated(items, page, pageSize, total);
}

export async function getReport(workspaceId: string, id: string) {
  const report = await db.report.findFirst({
    where: { id, workspaceId },
    select: { ...reportListSelect, contentJson: true },
  });
  if (!report) throw notFound("Report");
  return report;
}

export async function deleteReport(workspaceId: string, id: string): Promise<void> {
  const report = await db.report.findFirst({ where: { id, workspaceId }, select: { id: true } });
  if (!report) throw notFound("Report");
  await db.report.delete({ where: { id: report.id } });
}

/** Creates (or returns the existing) unguessable share token for a read-only public link. */
export async function shareReport(workspaceId: string, id: string) {
  const report = await db.report.findFirst({ where: { id, workspaceId }, select: { id: true, shareToken: true } });
  if (!report) throw notFound("Report");
  const shareToken =
    report.shareToken ??
    (
      await db.report.update({
        where: { id: report.id },
        data: { shareToken: randomBytes(24).toString("base64url") },
        select: { shareToken: true },
      })
    ).shareToken!;
  return { shareToken, sharePath: `/share/${shareToken}` };
}

/** For the public /share/[token] page: the token is the only credential. */
export async function getSharedReport(shareToken: string) {
  const report = await db.report.findUnique({
    where: { shareToken },
    select: { id: true, title: true, periodStart: true, periodEnd: true, createdAt: true, contentJson: true },
  });
  if (!report) throw notFound("Report");
  return report;
}
