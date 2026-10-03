import { z } from "zod";
import { colorSchema, isoDate, isoDateEnd } from "./common";

export const themeListQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDateEnd.optional(),
});
export type ThemeListQuery = z.infer<typeof themeListQuerySchema>;

export const createThemeSchema = z.object({
  name: z.string().trim().min(1, "is required").max(40, "must be 40 characters or fewer"),
  description: z.string().trim().max(300).optional(),
  color: colorSchema.optional(),
});
export type CreateThemeInput = z.infer<typeof createThemeSchema>;

export const updateThemeSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    description: z.string().trim().max(300).nullable().optional(),
    color: colorSchema.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Provide at least one field to update." });
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

export const TREND_PERIODS = ["7d", "30d", "90d"] as const;
export const TREND_BUCKETS = ["day", "week"] as const;

export const trendsQuerySchema = z.object({
  period: z.enum(TREND_PERIODS).default("30d"),
  bucket: z.enum(TREND_BUCKETS).default("day"),
});
export type TrendsQuery = z.infer<typeof trendsQuerySchema>;
