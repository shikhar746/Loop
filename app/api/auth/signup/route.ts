import { json, parseJson, withHandler } from "@/lib/http";
import { signUp } from "@/lib/services/members";
import { signupSchema } from "@/lib/validators/auth";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req) => {
  const input = await parseJson(req, signupSchema);
  const result = await signUp(input);
  return json(result, 201);
});
