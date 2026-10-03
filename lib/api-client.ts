// Typed fetch wrapper for the LOOP REST API: one function per endpoint, all errors as ApiError.
import type { AnalyticsQuery, FeedbackListParams, ThemeListParams, TrendsParams } from "@/lib/api-params";
import type {
  AnalyticsResponse,
  AskResponse,
  Feedback,
  ImportResult,
  Me,
  Member,
  Paginated,
  ProcessPendingResponse,
  Report,
  ReportListItem,
  Role,
  SignupResponse,
  SimulateResponse,
  Theme,
  ThemeDetail,
  ThemeListItem,
  TrendsResponse,
} from "@/lib/types";
import type { SignupInput } from "@/lib/validators/auth";
import type { CreateFeedbackInput, SimulateFeedbackInput } from "@/lib/validators/feedback";
import type { CreateMemberInput } from "@/lib/validators/members";
import type { CreateThemeInput } from "@/lib/validators/themes";

export type FieldIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 400 VALIDATION_ERROR details as { field: message } (first message per field). */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const issue of this.details as FieldIssue[]) {
        if (issue && typeof issue.path === "string" && !(issue.path in out)) out[issue.path] = issue.message;
      }
    }
    return out;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof DOMException && err.name === "AbortError") return new ApiError(0, "ABORTED", "Request cancelled.");
  return new ApiError(0, "NETWORK", "Can't reach LOOP right now. Check your connection and try again.");
}

type QueryValue = string | number | boolean | null | undefined;

export function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  const callbackUrl = window.location.pathname + window.location.search;
  window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}

type RequestOptions = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit };

/** Low-level request. Parses `{ error: { code, message, details } }` into ApiError; 401 → /login. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, ...init } = options;
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers: { Accept: "application/json", ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  } catch (err) {
    throw toApiError(err);
  }

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const body = payload as { error?: { code?: string; message?: string; details?: unknown } } | null;
    const error = new ApiError(
      res.status,
      body?.error?.code ?? (res.status === 401 ? "UNAUTHENTICATED" : "INTERNAL"),
      body?.error?.message ?? "Something went wrong on our side. Please try again.",
      body?.error?.details,
    );
    if (res.status === 401) redirectToLogin();
    throw error;
  }
  return payload as T;
}

// ---- URL builders (used by GET hooks so the cache key is the URL) ----

export const paths = {
  me: () => "/api/me",
  members: () => "/api/members",
  feedbackList: (q: FeedbackListParams) => withQuery("/api/feedback", q),
  feedback: (id: string) => `/api/feedback/${encodeURIComponent(id)}`,
  themes: (q: ThemeListParams = {}) => withQuery("/api/themes", q),
  theme: (id: string) => `/api/themes/${encodeURIComponent(id)}`,
  themeTrends: (q: TrendsParams) => withQuery("/api/themes/trends", q),
  analytics: (q: AnalyticsQuery) => withQuery("/api/analytics", q),
  reports: (q: { page?: number; pageSize?: number } = {}) => withQuery("/api/reports", q),
  report: (id: string) => `/api/reports/${encodeURIComponent(id)}`,
};

// ---- Auth ----

/** #1 POST /api/auth/signup */
export const signup = (input: SignupInput) =>
  request<SignupResponse>("/api/auth/signup", { method: "POST", json: input });

// #2 / #3 GET+POST /api/auth/[...nextauth] go through next-auth/react (signIn, signOut, SessionProvider).

/** #4 GET /api/me */
export const getMe = (signal?: AbortSignal) => request<Me>(paths.me(), { signal });

// ---- Members (ADMIN) ----

/** #6 GET /api/members */
export const getMembers = (signal?: AbortSignal) => request<{ items: Member[] }>(paths.members(), { signal });

/** #7 POST /api/members */
export const createMember = (input: CreateMemberInput) =>
  request<Member>("/api/members", { method: "POST", json: input });

/** #8 PATCH /api/members/[id] */
export const updateMember = (id: string, input: { role: Role }) =>
  request<Member>(`/api/members/${encodeURIComponent(id)}`, { method: "PATCH", json: input });

/** #9 DELETE /api/members/[id] */
export const deleteMember = (id: string) =>
  request<void>(`/api/members/${encodeURIComponent(id)}`, { method: "DELETE" });

// ---- Feedback ----

/** #10 GET /api/feedback */
export const getFeedbackList = (q: FeedbackListParams, signal?: AbortSignal) =>
  request<Paginated<Feedback>>(paths.feedbackList(q), { signal });

/** #11 POST /api/feedback */
export const createFeedback = (input: CreateFeedbackInput) =>
  request<Feedback>("/api/feedback", { method: "POST", json: input });

/** #12 GET /api/feedback/[id] */
export const getFeedback = (id: string, signal?: AbortSignal) => request<Feedback>(paths.feedback(id), { signal });

/** #13 PATCH /api/feedback/[id] */
export const updateFeedback = (id: string, input: { status?: Feedback["status"]; customerLabel?: string | null }) =>
  request<Feedback>(paths.feedback(id), { method: "PATCH", json: input });

/** #14 DELETE /api/feedback/[id] */
export const deleteFeedback = (id: string) => request<void>(paths.feedback(id), { method: "DELETE" });

/** #15 POST /api/feedback/import (multipart, "file" field) */
export const importFeedback = (file: File) => {
  const form = new FormData();
  form.set("file", file);
  return request<ImportResult>("/api/feedback/import", { method: "POST", body: form });
};

/** #16 POST /api/feedback/simulate */
export const simulateFeedback = (input: SimulateFeedbackInput) =>
  request<SimulateResponse>("/api/feedback/simulate", { method: "POST", json: input });

/** #17 POST /api/feedback/[id]/classify */
export const classifyFeedback = (id: string) =>
  request<Feedback>(`/api/feedback/${encodeURIComponent(id)}/classify`, { method: "POST" });

/** #18 POST /api/feedback/process-pending */
export const processPending = () =>
  request<ProcessPendingResponse>("/api/feedback/process-pending", { method: "POST" });

// ---- Themes ----

/** #19 GET /api/themes */
export const getThemes = (q: ThemeListParams = {}, signal?: AbortSignal) =>
  request<{ items: ThemeListItem[] }>(paths.themes(q), { signal });

/** #20 POST /api/themes */
export const createTheme = (input: CreateThemeInput) => request<Theme>("/api/themes", { method: "POST", json: input });

/** #21 GET /api/themes/[id] */
export const getTheme = (id: string, signal?: AbortSignal) => request<ThemeDetail>(paths.theme(id), { signal });

/** #22 PATCH /api/themes/[id] */
export const updateTheme = (id: string, input: { name?: string; description?: string | null; color?: string }) =>
  request<Theme>(paths.theme(id), { method: "PATCH", json: input });

/** #23 DELETE /api/themes/[id] */
export const deleteTheme = (id: string) => request<void>(paths.theme(id), { method: "DELETE" });

/** #24 GET /api/themes/trends */
export const getThemeTrends = (q: TrendsParams, signal?: AbortSignal) =>
  request<TrendsResponse>(paths.themeTrends(q), { signal });

// ---- Analytics + insights ----

/** #25 GET /api/analytics */
export const getAnalytics = (q: AnalyticsQuery, signal?: AbortSignal) =>
  request<AnalyticsResponse>(paths.analytics(q), { signal });

/** #26 POST /api/insights/ask */
export const askLoop = (question: string, signal?: AbortSignal) =>
  request<AskResponse>("/api/insights/ask", { method: "POST", json: { question }, signal });

// ---- Reports ----

/** #27 GET /api/reports */
export const getReports = (q: { page?: number; pageSize?: number } = {}, signal?: AbortSignal) =>
  request<Paginated<ReportListItem>>(paths.reports(q), { signal });

/** #28 POST /api/reports */
export const createReport = (input: { periodStart: string; periodEnd: string; title?: string }) =>
  request<Report>("/api/reports", { method: "POST", json: input });

/** #29 GET /api/reports/[id] */
export const getReport = (id: string, signal?: AbortSignal) => request<Report>(paths.report(id), { signal });

/** #30 DELETE /api/reports/[id] */
export const deleteReport = (id: string) => request<void>(paths.report(id), { method: "DELETE" });

/** #31 POST /api/reports/[id]/share: returns the public read-only path, /share/[token]. */
export const shareReport = (id: string) =>
  request<{ shareToken: string; sharePath: string }>(`${paths.report(id)}/share`, { method: "POST" });
