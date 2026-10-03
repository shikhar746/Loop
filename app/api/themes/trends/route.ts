import { requireSession } from "@/lib/guards";
import { json, parseQuery, withHandler } from "@/lib/http";
import { getThemeTrends } from "@/lib/services/themes";
import { trendsQuerySchema } from "@/lib/validators/themes";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req) => {
  const ctx = await requireSession();
  const query = parseQuery(req, trendsQuerySchema);
  return json(await getThemeTrends(ctx.workspaceId, query));
});
