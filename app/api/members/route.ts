import { requireRole } from "@/lib/guards";
import { json, parseJson, withHandler } from "@/lib/http";
import { createMember, listMembers } from "@/lib/services/members";
import { createMemberSchema } from "@/lib/validators/members";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const ctx = await requireRole("ADMIN");
  return json({ items: await listMembers(ctx.workspaceId) });
});

export const POST = withHandler(async (req) => {
  const ctx = await requireRole("ADMIN");
  const input = await parseJson(req, createMemberSchema);
  return json(await createMember(ctx.workspaceId, input), 201);
});
