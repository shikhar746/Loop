import "server-only";
import { db } from "../db";
import type { AnalyticsResponse } from "../validators/analytics";
import type { FeedbackFilters } from "../validators/feedback";
import { feedbackWhereSql } from "./feedback";

const DAY_MS = 86_400_000;
const MAX_VOLUME_DAYS = 366;
const TOP_THEMES = 8;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Dashboard aggregates, computed in SQL and shaped for Recharts. */
export async function getAnalytics(workspaceId: string, filters: FeedbackFilters): Promise<AnalyticsResponse> {
  const where = feedbackWhereSql(workspaceId, filters);
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);

  const [statsRows, volumeRows, themeRows] = await Promise.all([
    db.$queryRaw<
      {
        total: number;
        pos: number;
        neu: number;
        neg: number;
        unclassified: number;
        newThisWeek: number;
        first: Date | null;
        last: Date | null;
      }[]
    >`
      SELECT COUNT(*)::int AS "total",
             COUNT(*) FILTER (WHERE f."sentiment" = 'POS')::int AS "pos",
             COUNT(*) FILTER (WHERE f."sentiment" = 'NEU')::int AS "neu",
             COUNT(*) FILTER (WHERE f."sentiment" = 'NEG')::int AS "neg",
             COUNT(*) FILTER (WHERE f."sentiment" IS NULL)::int AS "unclassified",
             COUNT(*) FILTER (WHERE f."createdAt" >= ${weekAgo})::int AS "newThisWeek",
             MIN(f."createdAt") AS "first",
             MAX(f."createdAt") AS "last"
      FROM "Feedback" f
      WHERE ${where}`,
    db.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', f."createdAt") AS "day", COUNT(*)::int AS "count"
      FROM "Feedback" f
      WHERE ${where}
      GROUP BY 1
      ORDER BY 1`,
    db.$queryRaw<{ themeId: string; name: string; color: string; count: number }[]>`
      SELECT t."id" AS "themeId", t."name", t."color", COUNT(*)::int AS "count"
      FROM "FeedbackTheme" ft
      JOIN "Feedback" f ON f."id" = ft."feedbackId"
      JOIN "Theme" t ON t."id" = ft."themeId"
      WHERE ${where} AND t."workspaceId" = ${workspaceId}
      GROUP BY t."id", t."name", t."color"
      ORDER BY "count" DESC, t."name" ASC
      LIMIT ${TOP_THEMES}`,
  ]);

  const s = statsRows[0];
  const classified = s.pos + s.neu + s.neg;

  // Continuous daily series (zero-filled) so charts don't skip quiet days.
  const volume: AnalyticsResponse["volume"] = [];
  if (s.total > 0 && s.first && s.last) {
    const end = utcMidnight(filters.to && filters.to < new Date() ? filters.to : s.last > new Date() ? s.last : new Date());
    let start = utcMidnight(filters.from ?? s.first);
    if ((end.getTime() - start.getTime()) / DAY_MS > MAX_VOLUME_DAYS) {
      start = new Date(end.getTime() - (MAX_VOLUME_DAYS - 1) * DAY_MS);
    }
    const counts = new Map(volumeRows.map((r) => [dayKey(r.day), r.count]));
    for (let d = start; d <= end; d = new Date(d.getTime() + DAY_MS)) {
      volume.push({ date: dayKey(d), count: counts.get(dayKey(d)) ?? 0 });
    }
  }

  return {
    stats: {
      total: s.total,
      pctNegative: classified ? Math.round((s.neg / classified) * 1000) / 10 : 0,
      newThisWeek: s.newThisWeek,
      unclassified: s.unclassified,
    },
    volume,
    sentiment: [
      { sentiment: "POS", count: s.pos },
      { sentiment: "NEU", count: s.neu },
      { sentiment: "NEG", count: s.neg },
    ],
    topThemes: themeRows,
  };
}
