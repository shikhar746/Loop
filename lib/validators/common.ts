import { z } from "zod";

// Literal tuples mirror the Prisma enums so these schemas can be imported by client components too.
export const ROLES = ["ADMIN", "ANALYST", "VIEWER"] as const;
export const SENTIMENTS = ["POS", "NEU", "NEG"] as const;
export const FEEDBACK_STATUSES = ["NEW", "REVIEWED", "ACTIONED"] as const;
export const CHANNELS = ["SUPPORT_TICKET", "APP_REVIEW", "NPS_SURVEY", "SALES_NOTE", "COMMUNITY", "OTHER"] as const;
export const CLASSIFICATION_STATUSES = ["PENDING", "DONE", "FAILED"] as const;

export const roleSchema = z.enum(ROLES);
export const sentimentSchema = z.enum(SENTIMENTS);
export const feedbackStatusSchema = z.enum(FEEDBACK_STATUSES);
export const channelSchema = z.enum(CHANNELS);

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Accepts an ISO date or datetime. */
export const isoDate = z.coerce.date({ error: "must be an ISO date such as 2026-10-01" });

/** Upper bound of a range: a bare date (2026-10-01) means "through the end of that day" (UTC). */
export const isoDateEnd = z
  .string()
  .transform((value, ctx) => {
    const date = new Date(DATE_ONLY.test(value) ? `${value}T23:59:59.999Z` : value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "must be an ISO date such as 2026-10-31" });
      return z.NEVER;
    }
    return date;
  });

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });

export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a hex color such as #6366f1");

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function paginated<T>(items: T[], page: number, pageSize: number, total: number): Paginated<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
