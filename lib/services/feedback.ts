import "server-only";
import Papa from "papaparse";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { env } from "../env";
import { classifyFeedback, type Classification } from "../ai";
import { embedTexts, storeEmbedding } from "../search";
import { aiUnavailable, badRequest, notFound } from "../http";
import { paginated } from "../validators/common";
import {
  IMPORT_MAX_ROWS,
  importRowSchema,
  type CreateFeedbackInput,
  type FeedbackFilters,
  type FeedbackListQuery,
  type ImportResult,
  type SimulateFeedbackInput,
  type UpdateFeedbackInput,
} from "../validators/feedback";
import { generateFeedback } from "../simulator/templates";
import { resolveThemes, themeLinkWrites } from "./themes";
import { feedbackInclude, toFeedbackDto, type FeedbackDto } from "./feedback-dto";

export const PROCESS_BATCH_SIZE = 8;
/** A FAILED item is retried by process-pending only after this cool-down, so a client loop always terminates. */
export const FAILED_RETRY_COOLDOWN_MS = 2 * 60_000;

// ---- Filters (shared with analytics) ----

/** WHERE clause for "Feedback" f. Always scoped to the workspace first. */
export function feedbackWhereSql(workspaceId: string, filters: FeedbackFilters): Prisma.Sql {
  const conds: Prisma.Sql[] = [Prisma.sql`f."workspaceId" = ${workspaceId}`];
  if (filters.q) {
    conds.push(Prisma.sql`to_tsvector('english', f."content") @@ websearch_to_tsquery('english', ${filters.q})`);
  }
  if (filters.channel) conds.push(Prisma.sql`f."channel" = ${filters.channel}::"Channel"`);
  if (filters.sentiment) conds.push(Prisma.sql`f."sentiment" = ${filters.sentiment}::"Sentiment"`);
  if (filters.status) conds.push(Prisma.sql`f."status" = ${filters.status}::"FeedbackStatus"`);
  if (filters.themeId) {
    conds.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "FeedbackTheme" ft WHERE ft."feedbackId" = f."id" AND ft."themeId" = ${filters.themeId})`,
    );
  }
  if (filters.from) conds.push(Prisma.sql`f."createdAt" >= ${filters.from}`);
  if (filters.to) conds.push(Prisma.sql`f."createdAt" <= ${filters.to}`);
  return Prisma.join(conds, " AND ");
}

// ---- Reads ----

export async function listFeedback(workspaceId: string, query: FeedbackListQuery) {
  const where = feedbackWhereSql(workspaceId, query);
  const order =
    query.sort === "oldest"
      ? Prisma.sql`f."createdAt" ASC, f."id" ASC`
      : query.sort === "most_negative"
        ? Prisma.sql`f."sentimentScore" ASC NULLS LAST, f."createdAt" DESC, f."id" DESC`
        : Prisma.sql`f."createdAt" DESC, f."id" DESC`;
  const offset = (query.page - 1) * query.pageSize;

  const [countRows, idRows] = await Promise.all([
    db.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS "total" FROM "Feedback" f WHERE ${where}`,
    db.$queryRaw<{ id: string }[]>`
      SELECT f."id" FROM "Feedback" f WHERE ${where} ORDER BY ${order} LIMIT ${query.pageSize} OFFSET ${offset}`,
  ]);

  const ids = idRows.map((r) => r.id);
  const rows = ids.length
    ? await db.feedback.findMany({ where: { id: { in: ids }, workspaceId }, include: feedbackInclude })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toFeedbackDto(row)] : [];
  });

  return paginated(items, query.page, query.pageSize, countRows[0]?.total ?? 0);
}

async function findFeedback(workspaceId: string, id: string) {
  const row = await db.feedback.findFirst({ where: { id, workspaceId }, include: feedbackInclude });
  if (!row) throw notFound("Feedback");
  return row;
}

export async function getFeedback(workspaceId: string, id: string): Promise<FeedbackDto> {
  return toFeedbackDto(await findFeedback(workspaceId, id));
}

// ---- Writes ----

export async function createFeedback(workspaceId: string, input: CreateFeedbackInput): Promise<FeedbackDto> {
  const created = await db.feedback.create({
    data: {
      workspaceId,
      content: input.content,
      channel: input.channel,
      customerLabel: input.customerLabel,
      sourceRef: input.sourceRef,
    },
    select: { id: true, content: true },
  });
  // Classify + embed inline. If AI fails the row is kept as FAILED and picked up by process-pending.
  await processItems(workspaceId, [created]);
  return getFeedback(workspaceId, created.id);
}

export async function updateFeedback(workspaceId: string, id: string, input: UpdateFeedbackInput): Promise<FeedbackDto> {
  const existing = await findFeedback(workspaceId, id);
  const updated = await db.feedback.update({
    where: { id: existing.id },
    data: { status: input.status, customerLabel: input.customerLabel },
    include: feedbackInclude,
  });
  return toFeedbackDto(updated);
}

export async function deleteFeedback(workspaceId: string, id: string): Promise<void> {
  const existing = await findFeedback(workspaceId, id);
  await db.feedback.delete({ where: { id: existing.id } }); // theme links + embedding cascade
}

// ---- CSV import ----

export async function importFeedbackCsv(workspaceId: string, csvText: string): Promise<ImportResult> {
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"),
  });

  if (!parsed.meta.fields?.includes("content")) {
    throw badRequest('CSV must have a header row with a "content" column (optional: channel, customer_label, created_at).');
  }
  if (parsed.data.length === 0) throw badRequest("CSV has no data rows.");
  if (parsed.data.length > IMPORT_MAX_ROWS) {
    throw badRequest(`CSV has ${parsed.data.length} rows; the limit is ${IMPORT_MAX_ROWS} per import.`);
  }

  const rowErrors = new Map<number, string>();
  for (const e of parsed.errors) {
    if (typeof e.row === "number") rowErrors.set(e.row, `could not parse row: ${e.message}`);
  }

  const errors: ImportResult["errors"] = [];
  const valid: Prisma.FeedbackCreateManyInput[] = [];

  parsed.data.forEach((raw, index) => {
    const row = index + 2; // +1 for the header line, +1 for 1-based numbering
    const parseError = rowErrors.get(index);
    if (parseError) {
      errors.push({ row, message: parseError });
      return;
    }
    const result = importRowSchema.safeParse(raw);
    if (!result.success) {
      errors.push({ row, message: result.error.issues.map((i) => i.message).join("; ") });
      return;
    }
    valid.push({
      workspaceId,
      content: result.data.content,
      channel: result.data.channel,
      customerLabel: result.data.customer_label,
      ...(result.data.created_at ? { createdAt: result.data.created_at } : {}),
      classificationStatus: "PENDING",
    });
  });

  const { count } = valid.length ? await db.feedback.createMany({ data: valid }) : { count: 0 };
  return { imported: count, failed: errors.length, errors };
}

// ---- Simulator ----

export async function simulateFeedback(workspaceId: string, input: SimulateFeedbackInput) {
  const now = Date.now();
  const data: Prisma.FeedbackCreateManyInput[] = Array.from({ length: input.count }, () => {
    const g = generateFeedback(Math.random, { channel: input.channel });
    return {
      workspaceId,
      content: g.content,
      channel: g.channel,
      customerLabel: g.customerLabel,
      sourceRef: g.sourceRef,
      // spread across the last ~6 hours so the feed looks live
      createdAt: new Date(now - Math.floor(Math.random() * 6 * 3_600_000)),
      classificationStatus: "PENDING",
    };
  });
  const created = await db.feedback.createManyAndReturn({ data, select: { id: true } });
  return { created: created.length, ids: created.map((c) => c.id) };
}

// ---- Classification + embedding pipeline ----

async function saveClassification(workspaceId: string, feedbackId: string, result: Classification): Promise<void> {
  // Sequential per item: resolveThemes may create themes, and parallel creates could race.
  const links = await resolveThemes(workspaceId, result.themes);
  const linkWrites = await themeLinkWrites(workspaceId, feedbackId, links);
  await db.$transaction([
    ...linkWrites,
    db.feedback.update({
      where: { id: feedbackId },
      data: {
        sentiment: result.sentiment,
        sentimentScore: result.sentimentScore,
        featureArea: result.featureArea,
        aiRationale: result.rationale,
      },
    }),
  ]);
}

export type ProcessOutcome = { succeeded: string[]; failed: string[] };

/** Promise.allSettled with at most `limit` calls in flight (free-tier LLMs have low per-minute quotas). */
async function settledWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Classifies (in parallel) then embeds (one batched Voyage call) up to 8 items. An item is DONE only
 * when both steps succeed; otherwise FAILED, keeping any earlier classification it had.
 */
export async function processItems(workspaceId: string, items: { id: string; content: string }[]): Promise<ProcessOutcome> {
  if (items.length === 0) return { succeeded: [], failed: [] };

  const themeNames = (
    await db.theme.findMany({ where: { workspaceId }, select: { name: true }, orderBy: { name: "asc" } })
  ).map((t) => t.name);

  const results = await settledWithLimit(items, env.AI_CONCURRENCY, (item) => classifyFeedback(item.content, themeNames));

  const failed: string[] = [];
  const classified: { id: string; content: string }[] = [];
  for (let i = 0; i < items.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      failed.push(items[i].id);
      continue;
    }
    try {
      await saveClassification(workspaceId, items[i].id, result.value);
      classified.push(items[i]);
    } catch (err) {
      console.error("[classify] failed to save classification", err instanceof Error ? err.message : err);
      failed.push(items[i].id);
    }
  }

  const succeeded: string[] = [];
  if (classified.length) {
    try {
      const vectors = await embedTexts(classified.map((c) => c.content), "document");
      for (let i = 0; i < classified.length; i++) {
        const ok = await storeEmbedding(workspaceId, classified[i].id, vectors[i]);
        (ok ? succeeded : failed).push(classified[i].id);
      }
    } catch {
      failed.push(...classified.map((c) => c.id));
    }
  }

  const now = new Date();
  if (succeeded.length) {
    await db.feedback.updateMany({
      where: { id: { in: succeeded }, workspaceId },
      data: { classificationStatus: "DONE", classifiedAt: now },
    });
  }
  if (failed.length) {
    await db.feedback.updateMany({ where: { id: { in: failed }, workspaceId }, data: { classificationStatus: "FAILED" } });
  }
  return { succeeded, failed };
}

/** POST /api/feedback/[id]/classify: re-run classification + embedding now; replaces theme links. */
export async function reclassifyFeedback(workspaceId: string, id: string): Promise<FeedbackDto> {
  const item = await findFeedback(workspaceId, id);
  const outcome = await processItems(workspaceId, [{ id: item.id, content: item.content }]);
  if (outcome.failed.length) {
    throw aiUnavailable("Classification failed because the AI service is unavailable. The item is marked FAILED and will be retried.");
  }
  return getFeedback(workspaceId, id);
}

function pendingWhere(workspaceId: string, failedBefore: Date): Prisma.FeedbackWhereInput {
  return {
    workspaceId,
    OR: [{ classificationStatus: "PENDING" }, { classificationStatus: "FAILED", updatedAt: { lt: failedBefore } }],
  };
}

/**
 * Processes the next batch of PENDING (and cooled-down FAILED) items.
 * `failedBefore` lets the backfill script retry each FAILED item once per run.
 */
export async function processPending(
  workspaceId: string,
  failedBefore: Date = new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS),
) {
  const items = await db.feedback.findMany({
    where: pendingWhere(workspaceId, failedBefore),
    orderBy: [{ classificationStatus: "asc" }, { createdAt: "asc" }], // enum order PENDING < DONE < FAILED
    take: PROCESS_BATCH_SIZE,
    select: { id: true, content: true },
  });
  const outcome = await processItems(workspaceId, items);
  const remaining = await db.feedback.count({ where: pendingWhere(workspaceId, failedBefore) });
  return { processed: outcome.succeeded.length, failed: outcome.failed.length, remaining };
}
