import { ANALYST_UP, requireRole } from "@/lib/guards";
import { json, parseParams, withHandler } from "@/lib/http";
import { reclassifyFeedback } from "@/lib/services/feedback";
import { idParamSchema } from "@/lib/validators/common";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireRole(...ANALYST_UP);
  const { id } = parseParams(params, idParamSchema);
  return json(await reclassifyFeedback(ctx.workspaceId, id));
});
