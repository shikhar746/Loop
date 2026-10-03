import { requireRole, requireSession } from "@/lib/guards";
import { json, parseParams, withHandler } from "@/lib/http";
import { deleteReport, getReport } from "@/lib/services/reports";
import { idParamSchema } from "@/lib/validators/common";

export const dynamic = "force-dynamic";

export const GET = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireSession();
  const { id } = parseParams(params, idParamSchema);
  return json(await getReport(ctx.workspaceId, id));
});

export const DELETE = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireRole("ADMIN");
  const { id } = parseParams(params, idParamSchema);
  await deleteReport(ctx.workspaceId, id);
  return new Response(null, { status: 204 });
});
