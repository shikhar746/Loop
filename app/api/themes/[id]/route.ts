import { ANALYST_UP, requireRole, requireSession } from "@/lib/guards";
import { json, parseJson, parseParams, withHandler } from "@/lib/http";
import { deleteTheme, getThemeDetail, updateTheme } from "@/lib/services/themes";
import { idParamSchema } from "@/lib/validators/common";
import { updateThemeSchema } from "@/lib/validators/themes";

export const dynamic = "force-dynamic";

export const GET = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireSession();
  const { id } = parseParams(params, idParamSchema);
  return json(await getThemeDetail(ctx.workspaceId, id));
});

export const PATCH = withHandler<{ id: string }>(async (req, { params }) => {
  const ctx = await requireRole(...ANALYST_UP);
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJson(req, updateThemeSchema);
  return json(await updateTheme(ctx.workspaceId, id, input));
});

export const DELETE = withHandler<{ id: string }>(async (_req, { params }) => {
  const ctx = await requireRole("ADMIN");
  const { id } = parseParams(params, idParamSchema);
  await deleteTheme(ctx.workspaceId, id);
  return new Response(null, { status: 204 });
});
