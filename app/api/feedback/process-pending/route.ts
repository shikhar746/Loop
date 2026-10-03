import { ANALYST_UP, requireRole } from "@/lib/guards";
import { json, withHandler } from "@/lib/http";
import { processPending } from "@/lib/services/feedback";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Processes up to 8 items per call; the client keeps calling until remaining === 0.
export const POST = withHandler(async () => {
  const ctx = await requireRole(...ANALYST_UP);
  return json(await processPending(ctx.workspaceId));
});
