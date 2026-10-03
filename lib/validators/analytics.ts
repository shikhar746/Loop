import { feedbackFiltersSchema } from "./feedback";

/** GET /api/analytics takes the same filters as GET /api/feedback (minus paging/sort). */
export const analyticsQuerySchema = feedbackFiltersSchema;

export type AnalyticsResponse = {
  stats: { total: number; pctNegative: number; newThisWeek: number; unclassified: number };
  volume: { date: string; count: number }[];
  sentiment: { sentiment: "POS" | "NEU" | "NEG"; count: number }[];
  topThemes: { themeId: string; name: string; color: string; count: number }[];
};
