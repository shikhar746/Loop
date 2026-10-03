import type { FeedbackListParams, FeedbackSort } from "@/lib/api-params";
import type { Channel, FeedbackStatus, Sentiment } from "@/lib/types";
import { CHANNELS, FEEDBACK_STATUSES, SENTIMENTS } from "@/lib/validators/common";
import { FEEDBACK_SORTS } from "@/lib/validators/feedback";

export const INBOX_PAGE_SIZE = 25;

/** URL keys that count as "filters" (Clear filters removes them). */
export const FILTER_KEYS = ["q", "channel", "sentiment", "themeId", "status", "from", "to", "sort"] as const;

const oneOf = <T extends string>(values: readonly T[], v: string | null): T | undefined =>
  v && (values as readonly string[]).includes(v) ? (v as T) : undefined;

/** Reads the inbox filters from the URL, dropping anything the API wouldn't accept. */
export function readInboxParams(sp: URLSearchParams): FeedbackListParams & { sort: FeedbackSort; page: number } {
  const page = Number(sp.get("page"));
  const q = sp.get("q")?.trim();
  return {
    q: q ? q.slice(0, 200) : undefined,
    channel: oneOf<Channel>(CHANNELS, sp.get("channel")),
    sentiment: oneOf<Sentiment>(SENTIMENTS, sp.get("sentiment")),
    status: oneOf<FeedbackStatus>(FEEDBACK_STATUSES, sp.get("status")),
    themeId: sp.get("themeId") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    sort: oneOf<FeedbackSort>(FEEDBACK_SORTS, sp.get("sort")) ?? "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: INBOX_PAGE_SIZE,
  };
}

export const SORT_LABELS: Record<FeedbackSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  most_negative: "Most negative",
};
