import { ANALYST_UP, requireRole, requireSession } from "@/lib/guards";
import { json, parseJson, parseQuery, withHandler } from "@/lib/http";
import { createFeedback, listFeedback } from "@/lib/services/feedback";
import { createFeedbackSchema, feedbackListQuerySchema } from "@/lib/validators/feedback";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // POST classifies + embeds inline

export const GET = withHandler(async (req) => {
  const ctx = await requireSession();
  const query = parseQuery(req, feedbackListQuerySchema);
  return json(await listFeedback(ctx.workspaceId, query));
});

export const POST = withHandler(async (req) => {
  const ctx = await requireRole(...ANALYST_UP);
  const input = await parseJson(req, createFeedbackSchema);
  return json(await createFeedback(ctx.workspaceId, input), 201);
});
