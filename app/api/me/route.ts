import { requireSession } from "@/lib/guards";
import { json, withHandler } from "@/lib/http";
import { getMe } from "@/lib/services/members";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const ctx = await requireSession();
  return json(await getMe(ctx.workspaceId, ctx.userId));
});
