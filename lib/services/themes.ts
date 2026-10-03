import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { AppError, notFound } from "../http";
import { SENTIMENTS } from "../validators/common";
import type { CreateThemeInput, ThemeListQuery, TrendsQuery, UpdateThemeInput } from "../validators/themes";
import { feedbackInclude, toFeedbackDto } from "./feedback-dto";

export const THEME_PALETTE = [
  "#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6", "#84cc16", "#f97316",
];

/** Spiking = at least 5 items now AND up ≥50% vs the previous equal-length period (or up from zero). */
export const SPIKE_MIN_COUNT = 5;
export const SPIKE_MIN_CHANGE_PCT = 50;

export function changePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function isSpiking(current: number, previous: number): boolean {
  if (current < SPIKE_MIN_COUNT) return false;
  const pct = changePct(current, previous);
  return pct === null || pct >= SPIKE_MIN_CHANGE_PCT;
}

function dateRange(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}

// ---- CRUD ----

export async function listThemes(workspaceId: string, query: ThemeListQuery) {
  const createdAt = dateRange(query.from, query.to);
  const themes = await db.theme.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      createdAt: true,
      _count: { select: { feedback: createdAt ? { where: { feedback: { workspaceId, createdAt } } } : true } },
    },
  });
  const items = themes
    .map(({ _count, ...t }) => ({ ...t, count: _count.feedback }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { items };
}

export async function createTheme(workspaceId: string, input: CreateThemeInput) {
  const existing = await db.theme.count({ where: { workspaceId } });
  try {
    return await db.theme.create({
      data: {
        workspaceId,
        name: input.name,
        description: input.description,
        color: input.color ?? THEME_PALETTE[existing % THEME_PALETTE.length],
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "CONFLICT", `A theme named "${input.name}" already exists.`);
    }
    throw err;
  }
}

async function findTheme(workspaceId: string, id: string) {
  const theme = await db.theme.findFirst({ where: { id, workspaceId } });
  if (!theme) throw notFound("Theme");
  return theme;
}

export async function getThemeDetail(workspaceId: string, id: string) {
  const theme = await findTheme(workspaceId, id);
  const inTheme: Prisma.FeedbackWhereInput = { workspaceId, themes: { some: { themeId: theme.id } } };

  const [count, grouped, latest] = await Promise.all([
    db.feedback.count({ where: inTheme }),
    db.feedback.groupBy({ by: ["sentiment"], where: inTheme, _count: { _all: true } }),
    db.feedback.findMany({ where: inTheme, orderBy: { createdAt: "desc" }, take: 20, include: feedbackInclude }),
  ]);

  const sentiment = SENTIMENTS.map((s) => ({
    sentiment: s,
    count: grouped.find((g) => g.sentiment === s)?._count._all ?? 0,
  }));
  const unclassified = grouped.find((g) => g.sentiment === null)?._count._all ?? 0;

  return { ...theme, count, sentiment, unclassified, latest: latest.map(toFeedbackDto) };
}

export async function updateTheme(workspaceId: string, id: string, input: UpdateThemeInput) {
  const theme = await findTheme(workspaceId, id);
  try {
    return await db.theme.update({
      where: { id: theme.id },
      data: { name: input.name, description: input.description, color: input.color },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "CONFLICT", `A theme named "${input.name}" already exists.`);
    }
    throw err;
  }
}

export async function deleteTheme(workspaceId: string, id: string): Promise<void> {
  const theme = await findTheme(workspaceId, id);
  await db.theme.delete({ where: { id: theme.id } }); // FeedbackTheme links cascade
}

// ---- Classification support ----

function toTitleCase(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w === "&" || /^[A-Z0-9]{2,}$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ")
    .slice(0, 40);
}

/**
 * Maps classifier theme names to theme ids in this workspace: exact (case-insensitive) reuse of an
 * existing theme, otherwise upsert a new Title Case theme. Call sequentially (not in parallel) per
 * workspace so two items can't race to create the same theme.
 */
export async function resolveThemes(
  workspaceId: string,
  suggested: { name: string; confidence: number }[],
): Promise<{ themeId: string; confidence: number }[]> {
  const existing = await db.theme.findMany({ where: { workspaceId }, select: { id: true, name: true } });
  const byLower = new Map(existing.map((t) => [t.name.toLowerCase(), t.id]));
  const resolved = new Map<string, number>();
  let created = 0;

  for (const s of suggested) {
    let themeId = byLower.get(s.name.trim().toLowerCase());
    if (!themeId) {
      const name = toTitleCase(s.name);
      themeId = byLower.get(name.toLowerCase());
      if (!themeId) {
        const theme = await db.theme.upsert({
          where: { workspaceId_name: { workspaceId, name } },
          update: {},
          create: {
            workspaceId,
            name,
            color: THEME_PALETTE[(existing.length + created) % THEME_PALETTE.length],
            description: "Created automatically by AI classification",
          },
          select: { id: true },
        });
        created += 1;
        themeId = theme.id;
        byLower.set(name.toLowerCase(), themeId);
      }
    }
    resolved.set(themeId, Math.max(resolved.get(themeId) ?? 0, s.confidence));
  }
  return [...resolved].map(([themeId, confidence]) => ({ themeId, confidence }));
}

/**
 * Builds the writes that replace a feedback item's theme links, after verifying the feedback and every
 * theme belong to the same workspace. The caller runs them in a batch `db.$transaction([...])`, which
 * holds no interactive transaction open across network round-trips (safe on Supabase's pgbouncer).
 */
export async function themeLinkWrites(
  workspaceId: string,
  feedbackId: string,
  links: { themeId: string; confidence: number }[],
): Promise<Prisma.PrismaPromise<unknown>[]> {
  const feedback = await db.feedback.findFirst({ where: { id: feedbackId, workspaceId }, select: { id: true } });
  if (!feedback) throw notFound("Feedback");

  const themeIds = [...new Set(links.map((l) => l.themeId))];
  const owned = await db.theme.count({ where: { id: { in: themeIds }, workspaceId } });
  if (owned !== themeIds.length) {
    throw new AppError(400, "VALIDATION_ERROR", "Themes and feedback must belong to the same workspace.");
  }

  const writes: Prisma.PrismaPromise<unknown>[] = [db.feedbackTheme.deleteMany({ where: { feedbackId: feedback.id } })];
  if (links.length) {
    writes.push(
      db.feedbackTheme.createMany({
        data: links.map((l) => ({ feedbackId: feedback.id, themeId: l.themeId, confidence: l.confidence })),
      }),
    );
  }
  return writes;
}

// ---- Trends (pure SQL over FeedbackTheme × Feedback.createdAt) ----

const PERIOD_DAYS: Record<TrendsQuery["period"], number> = { "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 86_400_000;

/** Mirrors Postgres date_trunc in UTC: 'day' → midnight, 'week' → Monday midnight. */
function truncUtc(date: Date, bucket: TrendsQuery["bucket"]): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (bucket === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function getThemeTrends(workspaceId: string, query: TrendsQuery) {
  const days = PERIOD_DAYS[query.period];
  const end = new Date();
  const currentStart = new Date(end.getTime() - days * DAY_MS);
  const previousStart = new Date(end.getTime() - 2 * days * DAY_MS);

  const [themes, seriesRows, totals] = await Promise.all([
    db.theme.findMany({ where: { workspaceId }, select: { id: true, name: true, color: true } }),
    db.$queryRaw<{ themeId: string; bucket: Date; count: number }[]>`
      SELECT ft."themeId", date_trunc(${query.bucket}, f."createdAt") AS "bucket", COUNT(*)::int AS "count"
      FROM "FeedbackTheme" ft
      JOIN "Feedback" f ON f."id" = ft."feedbackId"
      WHERE f."workspaceId" = ${workspaceId}
        AND f."createdAt" >= ${currentStart} AND f."createdAt" <= ${end}
      GROUP BY 1, 2`,
    db.$queryRaw<{ themeId: string; current: number; previous: number }[]>`
      SELECT ft."themeId",
             COUNT(*) FILTER (WHERE f."createdAt" >= ${currentStart})::int AS "current",
             COUNT(*) FILTER (WHERE f."createdAt" < ${currentStart})::int AS "previous"
      FROM "FeedbackTheme" ft
      JOIN "Feedback" f ON f."id" = ft."feedbackId"
      WHERE f."workspaceId" = ${workspaceId}
        AND f."createdAt" >= ${previousStart} AND f."createdAt" <= ${end}
      GROUP BY 1`,
  ]);

  const buckets: string[] = [];
  const step = query.bucket === "week" ? 7 : 1;
  for (let d = truncUtc(currentStart, query.bucket); d <= end; d = new Date(d.getTime() + step * DAY_MS)) {
    buckets.push(dayKey(d));
  }

  const counts = new Map<string, number>();
  for (const r of seriesRows) counts.set(`${r.themeId}|${dayKey(r.bucket)}`, r.count);
  const totalsById = new Map(totals.map((t) => [t.themeId, t]));

  const series = themes
    .map((t) => {
      const current = totalsById.get(t.id)?.current ?? 0;
      const previous = totalsById.get(t.id)?.previous ?? 0;
      return {
        themeId: t.id,
        name: t.name,
        color: t.color,
        series: buckets.map((date) => ({ date, count: counts.get(`${t.id}|${date}`) ?? 0 })),
        current,
        previous,
        changePct: changePct(current, previous),
        isSpiking: isSpiking(current, previous),
      };
    })
    .sort((a, b) => b.current - a.current || a.name.localeCompare(b.name));

  // Pivoted rows for a Recharts <LineChart data={chartData}> with one <Line dataKey={themeId}> per theme.
  const chartData = buckets.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const t of series) row[t.themeId] = counts.get(`${t.themeId}|${date}`) ?? 0;
    return row;
  });

  return {
    period: query.period,
    bucket: query.bucket,
    range: { previousStart: previousStart.toISOString(), currentStart: currentStart.toISOString(), end: end.toISOString() },
    buckets,
    themes: series,
    chartData,
  };
}
