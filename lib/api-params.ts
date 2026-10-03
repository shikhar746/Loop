// Query-string shapes for the GET endpoints (all values are strings/numbers as sent over the wire).
import type { Channel, FeedbackStatus, Sentiment } from "@/lib/types";
import type { FEEDBACK_SORTS } from "@/lib/validators/feedback";

export type FeedbackSort = (typeof FEEDBACK_SORTS)[number];

/** GET /api/analytics: same filters as the feedback list, minus paging/sort. */
export type AnalyticsQuery = {
  q?: string;
  channel?: Channel;
  sentiment?: Sentiment;
  themeId?: string;
  status?: FeedbackStatus;
  /** yyyy-MM-dd (start of day, UTC) */
  from?: string;
  /** yyyy-MM-dd (end of day, UTC) */
  to?: string;
};

export type FeedbackListParams = AnalyticsQuery & {
  page?: number;
  pageSize?: number;
  sort?: FeedbackSort;
};

export type ThemeListParams = { from?: string; to?: string };

export type TrendsParams = { period: "7d" | "30d" | "90d"; bucket: "day" | "week" };
