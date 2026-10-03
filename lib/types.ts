// Response types for the LOOP REST API, mirroring lib/services/* (dates arrive as ISO strings).
import type { CHANNELS, CLASSIFICATION_STATUSES, FEEDBACK_STATUSES, Paginated, ROLES, SENTIMENTS } from "@/lib/validators/common";
import type { AnalyticsResponse } from "@/lib/validators/analytics";
import type { ImportResult } from "@/lib/validators/feedback";
import type { AskCitation, AskResponse } from "@/lib/validators/insights";
import type { ReportContent, ReportQuote, ReportStats, ReportThemeStat } from "@/lib/validators/reports";

export type Role = (typeof ROLES)[number];
export type Sentiment = (typeof SENTIMENTS)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export type Channel = (typeof CHANNELS)[number];
export type ClassificationStatus = (typeof CLASSIFICATION_STATUSES)[number];

export type { Paginated, AnalyticsResponse, ImportResult, AskCitation, AskResponse };
export type { ReportContent, ReportQuote, ReportStats, ReportThemeStat };

export type ApiErrorBody = {
  error: { code: string; message: string; details?: { path: string; message: string }[] | unknown };
};

// ---- Members / me ----

export type Member = { id: string; name: string; email: string; role: Role; createdAt: string };

export type Me = Member & { workspace: { id: string; name: string } };

export type SignupResponse = { user: Member; workspace: { id: string; name: string } };

// ---- Feedback ----

export type FeedbackTheme = { id: string; name: string; color: string; confidence: number };

export type Feedback = {
  id: string;
  content: string;
  channel: Channel;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: Sentiment | null;
  sentimentScore: number | null;
  featureArea: string | null;
  aiRationale: string | null;
  classificationStatus: ClassificationStatus;
  classifiedAt: string | null;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  themes: FeedbackTheme[];
};

export type SimulateResponse = { created: number; ids: string[] };
export type ProcessPendingResponse = { processed: number; failed: number; remaining: number };

// ---- Themes ----

export type Theme = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
};

export type ThemeListItem = Omit<Theme, "workspaceId"> & { count: number };

export type ThemeDetail = Theme & {
  count: number;
  sentiment: { sentiment: Sentiment; count: number }[];
  unclassified: number;
  latest: Feedback[];
};

export type ThemeTrend = {
  themeId: string;
  name: string;
  color: string;
  series: { date: string; count: number }[];
  current: number;
  previous: number;
  changePct: number | null;
  isSpiking: boolean;
};

export type TrendsResponse = {
  period: "7d" | "30d" | "90d";
  bucket: "day" | "week";
  range: { previousStart: string; currentStart: string; end: string };
  buckets: string[];
  themes: ThemeTrend[];
  chartData: Record<string, string | number>[];
};

// ---- Reports ----

export type ReportListItem = {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  shareToken: string | null;
  generatedBy: { id: string; name: string } | null;
};

export type Report = ReportListItem & { contentJson: ReportContent };
