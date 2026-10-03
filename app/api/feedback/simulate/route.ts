import { ANALYST_UP, requireRole } from "@/lib/guards";
import { json, parseJson, withHandler } from "@/lib/http";
import { simulateFeedback } from "@/lib/services/feedback";
import { simulateFeedbackSchema } from "@/lib/validators/feedback";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req) => {
  const ctx = await requireRole(...ANALYST_UP);
  const input = await parseJson(req, simulateFeedbackSchema);
  return json(await simulateFeedback(ctx.workspaceId, input), 201);
});
