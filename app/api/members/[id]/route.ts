import { requireRole } from "@/lib/guards";
import { json, parseJson, parseParams, withHandler } from "@/lib/http";
import { deleteMember, updateMemberRole } from "@/lib/services/members";
import { idParamSchema } from "@/lib/validators/common";
import { updateMemberSchema } from "@/lib/validators/members";

export const dynamic = "force-dynamic";

export const PATCH = withHandler<{ id: string }>(async (req, { params }) => {
  const ctx = await requireRole("ADMIN");
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJson(req, updateMemberSchema);
  return json(await updateMemberRole(ctx.workspaceId, id, input));
});

export const DELETE = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireRole("ADMIN");
  const { id } = parseParams(params, idParamSchema);
  await deleteMember(ctx.workspaceId, ctx.userId, id);
  return new Response(null, { status: 204 });
});
