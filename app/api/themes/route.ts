import { ANALYST_UP, requireRole, requireSession } from "@/lib/guards";
import { json, parseJson, parseQuery, withHandler } from "@/lib/http";
import { createTheme, listThemes } from "@/lib/services/themes";
import { createThemeSchema, themeListQuerySchema } from "@/lib/validators/themes";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req) => {
  const ctx = await requireSession();
  const query = parseQuery(req, themeListQuerySchema);
  return json(await listThemes(ctx.workspaceId, query));
});

export const POST = withHandler(async (req) => {
  const ctx = await requireRole(...ANALYST_UP);
  const input = await parseJson(req, createThemeSchema);
  return json(await createTheme(ctx.workspaceId, input), 201);
});
