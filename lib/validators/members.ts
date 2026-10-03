import { z } from "zod";
import { roleSchema } from "./common";

export const createMemberSchema = z.object({
  name: z.string().trim().min(1, "is required").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("must be a valid email address")),
  role: roleSchema,
  tempPassword: z.string().min(8, "must be at least 8 characters").max(128),
});
export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = z.object({ role: roleSchema });
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
