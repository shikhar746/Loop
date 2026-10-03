import { requireSession } from "@/lib/guards";
import { json, parseJson, withHandler } from "@/lib/http";
import { askLoop } from "@/lib/services/insights";
import { askSchema } from "@/lib/validators/insights";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Read-only for the workspace, so every role (including VIEWER) may ask.
export const POST = withHandler(async (req) => {
  const ctx = await requireSession();
  const input = await parseJson(req, askSchema);
  return json(await askLoop(ctx.workspaceId, input));
});
