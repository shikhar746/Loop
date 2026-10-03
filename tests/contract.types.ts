/**
 * Compile-time contract between backend services and the frontend's response types (lib/types.ts).
 * Checked by `npm run typecheck`: if a service's return shape drifts from what the UI expects,
 * this file stops compiling. Nothing here runs.
 *
 * Each assertion takes a service's real return type, converts it to what JSON.stringify produces
 * (Date → string, etc.) and requires it to be assignable to the frontend type.
 */
import type { getAnalytics } from "@/lib/services/analytics";
import type {
  createFeedback,
  getFeedback,
  importFeedbackCsv,
  listFeedback,
  processPending,
  reclassifyFeedback,
  simulateFeedback,
  updateFeedback,
} from "@/lib/services/feedback";
import type { askLoop } from "@/lib/services/insights";
import type { createMember, getMe, listMembers, signUp, updateMemberRole } from "@/lib/services/members";
import type { createReport, getReport, listReports } from "@/lib/services/reports";
import type { createTheme, getThemeDetail, getThemeTrends, listThemes, updateTheme } from "@/lib/services/themes";
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
  SignupResponse,
  SimulateResponse,
  Theme,
  ThemeDetail,
  ThemeListItem,
  TrendsResponse,
} from "@/lib/types";

/** What a value looks like after JSON.stringify → JSON.parse. */
type Jsonify<T> = T extends Date
  ? string
  : T extends string | number | boolean | null | undefined
    ? T
    : T extends readonly (infer U)[]
      ? Jsonify<U>[]
      : T extends object
        ? { [K in keyof T]: Jsonify<T[K]> }
        : T;

type Out<F extends (...args: never[]) => unknown> = Jsonify<Awaited<ReturnType<F>>>;

/** Compiles only when A is assignable to B. */
type Assert<A extends B, B> = A;

// Each line is one endpoint: <server JSON> must satisfy <client type>.
export type Contracts = [
  // auth + members
  Assert<Out<typeof signUp>, SignupResponse>, // POST /api/auth/signup
  Assert<Out<typeof getMe>, Me>, // GET /api/me
  Assert<{ items: Out<typeof listMembers> }, { items: Member[] }>, // GET /api/members
  Assert<Out<typeof createMember>, Member>, // POST /api/members
  Assert<Out<typeof updateMemberRole>, Member>, // PATCH /api/members/[id]
  // feedback
  Assert<Out<typeof listFeedback>, Paginated<Feedback>>, // GET /api/feedback
  Assert<Out<typeof createFeedback>, Feedback>, // POST /api/feedback
  Assert<Out<typeof getFeedback>, Feedback>, // GET /api/feedback/[id]
  Assert<Out<typeof updateFeedback>, Feedback>, // PATCH /api/feedback/[id]
  Assert<Out<typeof reclassifyFeedback>, Feedback>, // POST /api/feedback/[id]/classify
  Assert<Out<typeof importFeedbackCsv>, ImportResult>, // POST /api/feedback/import
  Assert<Out<typeof simulateFeedback>, SimulateResponse>, // POST /api/feedback/simulate
  Assert<Out<typeof processPending>, ProcessPendingResponse>, // POST /api/feedback/process-pending
  // themes
  Assert<Out<typeof listThemes>, { items: ThemeListItem[] }>, // GET /api/themes
  Assert<Out<typeof createTheme>, Theme>, // POST /api/themes
  Assert<Out<typeof getThemeDetail>, ThemeDetail>, // GET /api/themes/[id]
  Assert<Out<typeof updateTheme>, Theme>, // PATCH /api/themes/[id]
  Assert<Out<typeof getThemeTrends>, TrendsResponse>, // GET /api/themes/trends
  // analytics + insights
  Assert<Out<typeof getAnalytics>, AnalyticsResponse>, // GET /api/analytics
  Assert<Out<typeof askLoop>, AskResponse>, // POST /api/insights/ask
  // reports (contentJson is a Prisma JsonValue on the server; its shape is ReportContent by construction)
  Assert<Out<typeof listReports>, Paginated<ReportListItem>>, // GET /api/reports
  Assert<Omit<Out<typeof getReport>, "contentJson">, Omit<Report, "contentJson">>, // GET /api/reports/[id]
  Assert<Omit<Out<typeof createReport>, "contentJson">, Omit<Report, "contentJson">>, // POST /api/reports
];
