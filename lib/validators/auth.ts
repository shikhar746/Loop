import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("must be a valid email address"));

export const signupSchema = z.object({
  name: z.string().trim().min(1, "is required").max(80),
  email,
  password: z.string().min(8, "must be at least 8 characters").max(128),
  workspaceName: z.string().trim().min(1, "is required").max(80),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;
