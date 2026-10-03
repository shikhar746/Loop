import { format, formatDistanceToNowStrict, subDays } from "date-fns";
import type { Channel, ClassificationStatus, FeedbackStatus, Role, Sentiment } from "@/lib/types";

// ---- Label maps ----

export const CHANNEL_LABELS: Record<Channel, string> = {
  SUPPORT_TICKET: "Support ticket",
  APP_REVIEW: "App review",
  NPS_SURVEY: "NPS survey",
  SALES_NOTE: "Sales note",
  COMMUNITY: "Community",
  OTHER: "Other",
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  POS: "Positive",
  NEU: "Neutral",
  NEG: "Negative",
};

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  ACTIONED: "Actioned",
};

export const CLASSIFICATION_LABELS: Record<ClassificationStatus, string> = {
  PENDING: "Classifying…",
  DONE: "Classified",
  FAILED: "Needs review",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel as Channel] ?? channel;
}

export function sentimentLabel(sentiment: string | null | undefined): string {
  return sentiment ? (SENTIMENT_LABELS[sentiment as Sentiment] ?? sentiment) : "Unclassified";
}

// ---- Dates ----

const dateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
// Bucket keys from the API are UTC dates ("2026-10-01"); format them in UTC so they don't shift a day.
const utcShortDateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
const utcDateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value: string | Date) => dateFmt.format(toDate(value));
export const formatShortDate = (value: string | Date) => shortDateFmt.format(toDate(value));
export const formatDateTime = (value: string | Date) => dateTimeFmt.format(toDate(value));
export const formatBucket = (key: string) => utcShortDateFmt.format(new Date(`${key}T00:00:00Z`));
export const formatUtcDate = (value: string) => utcDateFmt.format(new Date(value));

export function formatRelative(value: string | Date): string {
  return `${formatDistanceToNowStrict(toDate(value))} ago`;
}

export function formatPeriod(start: string, end: string): string {
  return `${formatUtcDate(start)} – ${formatUtcDate(end)}`;
}

/** yyyy-MM-dd in local time, as the API's date filters expect. */
export const toDateParam = (date: Date) => format(date, "yyyy-MM-dd");

export const parseDateParam = (value: string | undefined): Date | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Last N days including today. */
export function presetRange(days: number): { from: string; to: string } {
  const today = new Date();
  return { from: toDateParam(subDays(today, days - 1)), to: toDateParam(today) };
}

// ---- Numbers ----

const intFmt = new Intl.NumberFormat("en");

export const formatNumber = (n: number) => intFmt.format(n);

/** 37.5 → "37.5%" (input is already a percentage). */
export const formatPct = (pct: number, digits = 1) => `${pct.toFixed(digits).replace(/\.0+$/, "")}%`;

/** 0.873 → "87%" */
export const formatRatio = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** Change vs previous period. null means "new" (previous was 0). */
export function formatChange(changePct: number | null): string {
  if (changePct === null) return "New";
  const sign = changePct > 0 ? "+" : changePct < 0 ? "−" : "±";
  return `${sign}${formatPct(Math.abs(changePct))}`;
}

export function formatScore(score: number | null): string {
  if (score === null) return "—";
  return `${score > 0 ? "+" : score < 0 ? "−" : ""}${Math.abs(score).toFixed(2)}`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/** "is required" → "Is required" (API/Zod messages are written to follow a field label). */
export const sentenceCase = (message: string) => message.charAt(0).toUpperCase() + message.slice(1);
