import { ANALYST_UP, requireRole } from "@/lib/guards";
import { json, parseParams, withHandler } from "@/lib/http";
import { shareReport } from "@/lib/services/reports";
import { idParamSchema } from "@/lib/validators/common";

export const dynamic = "force-dynamic";

export const POST = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireRole(...ANALYST_UP);
  const { id } = parseParams(params, idParamSchema);
  return json(await shareReport(ctx.workspaceId, id));
});
