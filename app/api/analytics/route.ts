import { requireSession } from "@/lib/guards";
import { json, parseQuery, withHandler } from "@/lib/http";
import { getAnalytics } from "@/lib/services/analytics";
import { analyticsQuerySchema } from "@/lib/validators/analytics";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req) => {
  const ctx = await requireSession();
  const filters = parseQuery(req, analyticsQuerySchema);
  return json(await getAnalytics(ctx.workspaceId, filters));
});
