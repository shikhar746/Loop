import { ANALYST_UP, requireRole, requireSession } from "@/lib/guards";
import { json, parseJson, parseQuery, withHandler } from "@/lib/http";
import { createReport, listReports } from "@/lib/services/reports";
import { paginationSchema } from "@/lib/validators/common";
import { createReportSchema } from "@/lib/validators/reports";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // POST asks Claude for the narrative

export const GET = withHandler(async (req) => {
  const ctx = await requireSession();
  const { page, pageSize } = parseQuery(req, paginationSchema);
  return json(await listReports(ctx.workspaceId, page, pageSize));
});

export const POST = withHandler(async (req) => {
  const ctx = await requireRole(...ANALYST_UP);
  const input = await parseJson(req, createReportSchema);
  return json(await createReport(ctx.workspaceId, ctx.userId, input), 201);
});
