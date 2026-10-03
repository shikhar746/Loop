import { z } from "zod";
import {
  CHANNELS,
  channelSchema,
  feedbackStatusSchema,
  isoDate,
  isoDateEnd,
  paginationSchema,
  sentimentSchema,
} from "./common";

export const FEEDBACK_SORTS = ["newest", "oldest", "most_negative"] as const;

/** Filters shared by GET /api/feedback and GET /api/analytics. */
export const feedbackFiltersSchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  channel: channelSchema.optional(),
  sentiment: sentimentSchema.optional(),
  themeId: z.string().min(1).max(64).optional(),
  status: feedbackStatusSchema.optional(),
  from: isoDate.optional(),
  to: isoDateEnd.optional(),
});
export type FeedbackFilters = z.infer<typeof feedbackFiltersSchema>;

export const feedbackListQuerySchema = feedbackFiltersSchema.extend(paginationSchema.shape).extend({
  sort: z.enum(FEEDBACK_SORTS).default("newest"),
});
export type FeedbackListQuery = z.infer<typeof feedbackListQuerySchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const createFeedbackSchema = z.object({
  content: z.string().trim().min(1, "is required").max(5000, "must be 5000 characters or fewer"),
  channel: channelSchema,
  customerLabel: optionalText(120),
  sourceRef: optionalText(120),
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const updateFeedbackSchema = z
  .object({
    status: feedbackStatusSchema.optional(),
    // null clears the label
    customerLabel: z.string().trim().max(120).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.customerLabel !== undefined, {
    message: "Provide status and/or customerLabel.",
  });
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;

export const simulateFeedbackSchema = z.object({
  channel: channelSchema,
  count: z.coerce.number().int().min(5).max(25),
});
export type SimulateFeedbackInput = z.infer<typeof simulateFeedbackSchema>;

// ---- CSV import ----

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 1000;

type ChannelValue = (typeof CHANNELS)[number];

// Lenient channel names seen in real exports ("Support ticket", "App Store", "NPS"...).
const CHANNEL_ALIASES: Record<string, ChannelValue> = {
  "support ticket": "SUPPORT_TICKET",
  "support tickets": "SUPPORT_TICKET",
  support: "SUPPORT_TICKET",
  ticket: "SUPPORT_TICKET",
  zendesk: "SUPPORT_TICKET",
  intercom: "SUPPORT_TICKET",
  email: "SUPPORT_TICKET",
  "app review": "APP_REVIEW",
  "app reviews": "APP_REVIEW",
  "app store": "APP_REVIEW",
  "play store": "APP_REVIEW",
  "google play": "APP_REVIEW",
  review: "APP_REVIEW",
  "nps survey": "NPS_SURVEY",
  nps: "NPS_SURVEY",
  survey: "NPS_SURVEY",
  "sales note": "SALES_NOTE",
  "sales notes": "SALES_NOTE",
  sales: "SALES_NOTE",
  crm: "SALES_NOTE",
  salesforce: "SALES_NOTE",
  community: "COMMUNITY",
  forum: "COMMUNITY",
  slack: "COMMUNITY",
  discord: "COMMUNITY",
  reddit: "COMMUNITY",
  other: "OTHER",
};

export function normalizeChannel(raw: string | undefined | null): ChannelValue | null {
  const key = (raw ?? "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (key === "") return "OTHER";
  const asEnum = key.replace(/ /g, "_").toUpperCase();
  if ((CHANNELS as readonly string[]).includes(asEnum)) return asEnum as ChannelValue;
  return CHANNEL_ALIASES[key] ?? null;
}

export const importRowSchema = z.object({
  content: z.string().trim().min(1, "content is required").max(5000, "content must be 5000 characters or fewer"),
  channel: z.string().optional().transform((value, ctx) => {
    const channel = normalizeChannel(value);
    if (!channel) {
      ctx.addIssue({
        code: "custom",
        message: `unknown channel "${value}". Use one of: ${CHANNELS.join(", ")} (or e.g. "Support ticket", "App review", "NPS")`,
      });
      return z.NEVER;
    }
    return channel;
  }),
  customer_label: z
    .string()
    .trim()
    .max(120, "customer_label must be 120 characters or fewer")
    .optional()
    .transform((v) => (v ? v : undefined)),
  created_at: z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: "custom", message: `created_at "${value}" is not a valid date (use ISO, e.g. 2026-09-14)` });
        return z.NEVER;
      }
      if (date.getTime() > Date.now() + 5 * 60_000) {
        ctx.addIssue({ code: "custom", message: "created_at cannot be in the future" });
        return z.NEVER;
      }
      return date;
    }),
});
export type ImportRow = z.infer<typeof importRowSchema>;

export type ImportResult = {
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
};
