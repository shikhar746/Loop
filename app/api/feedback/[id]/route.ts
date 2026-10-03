import { ANALYST_UP, requireRole, requireSession } from "@/lib/guards";
import { json, parseJson, parseParams, withHandler } from "@/lib/http";
import { deleteFeedback, getFeedback, updateFeedback } from "@/lib/services/feedback";
import { idParamSchema } from "@/lib/validators/common";
import { updateFeedbackSchema } from "@/lib/validators/feedback";

export const dynamic = "force-dynamic";

export const GET = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireSession();
  const { id } = parseParams(params, idParamSchema);
  return json(await getFeedback(ctx.workspaceId, id));
});

export const PATCH = withHandler<{ id: string }>(async (req, { params }) => {
  const ctx = await requireRole(...ANALYST_UP);
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJson(req, updateFeedbackSchema);
  return json(await updateFeedback(ctx.workspaceId, id, input));
});

export const DELETE = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireRole(...ANALYST_UP);
  const { id } = parseParams(params, idParamSchema);
  await deleteFeedback(ctx.workspaceId, id);
  return new Response(null, { status: 204 });
});
