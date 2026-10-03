/**
 * Frontend ↔ backend coherence, checked at runtime:
 *  1. every lib/api-client function hits a route file that exports that HTTP method,
 *  2. every backend route is used by the UI (except the documented exceptions),
 *  3. request bodies / query strings the UI builds pass the backend's own Zod schemas,
 *  4. each route's role guard matches the role the UI gates the action behind.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ZodType } from "zod";
import * as client from "@/lib/api-client";
import { presetRange } from "@/lib/format";
import { readInboxParams } from "@/components/inbox/inbox-params";
import { signupSchema } from "@/lib/validators/auth";
import { feedbackListQuerySchema, createFeedbackSchema, simulateFeedbackSchema, updateFeedbackSchema } from "@/lib/validators/feedback";
import { askSchema } from "@/lib/validators/insights";
import { createMemberSchema, updateMemberSchema } from "@/lib/validators/members";
import { createReportSchema } from "@/lib/validators/reports";
import { createThemeSchema, trendsQuerySchema, updateThemeSchema } from "@/lib/validators/themes";
import { analyticsQuerySchema } from "@/lib/validators/analytics";
import { paginationSchema } from "@/lib/validators/common";

// ---------------------------------------------------------------------------------------------
// Backend inventory: parse app/api/**/route.ts
// ---------------------------------------------------------------------------------------------

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Guard = "public" | "session" | "analyst" | "admin" | "nextauth";
type Route = { pattern: string; regex: RegExp; methods: Map<Method, Guard>; file: string };

const API_DIR = join(process.cwd(), "app", "api");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : name === "route.ts" ? [full] : [];
  });
}

function guardFor(body: string): Guard {
  if (/requireRole\(\s*"ADMIN"\s*\)/.test(body)) return "admin";
  if (/requireRole\(\s*\.\.\.ANALYST_UP\s*\)/.test(body)) return "analyst";
  if (/requireSession\(\)/.test(body)) return "session";
  return "public";
}

function loadRoutes(): Route[] {
  return walk(API_DIR).map((file) => {
    const segs = relative(API_DIR, file).split(sep).slice(0, -1);
    const pattern = "/api/" + segs.map((s) => (s.startsWith("[...") ? "*" : s.startsWith("[") ? ":id" : s)).join("/");
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".+").replace(/:id/g, "[^/]+") + "$",
    );
    const src = readFileSync(file, "utf8");
    const methods = new Map<Method, Guard>();
    if (/handler as GET/.test(src)) {
      methods.set("GET", "nextauth");
      methods.set("POST", "nextauth");
    }
    // Split the file at each exported handler so each method gets its own guard.
    const parts = src.split(/(?=export (?:const|async function) (?:GET|POST|PATCH|DELETE)\b)/);
    for (const part of parts) {
      const m = /^export (?:const|async function) (GET|POST|PATCH|DELETE)\b/.exec(part);
      if (m) methods.set(m[1] as Method, guardFor(part));
    }
    return { pattern, regex, methods, file: relative(process.cwd(), file) };
  });
}

const routes = loadRoutes();

function routeFor(path: string): Route | undefined {
  return routes.find((r) => r.regex.test(path));
}

// ---------------------------------------------------------------------------------------------
// Frontend inventory: call every api-client function against a recording fetch
// ---------------------------------------------------------------------------------------------

type Recorded = { method: Method; path: string; query: URLSearchParams; body: unknown };
let recorded: Recorded[] = [];

beforeEach(() => {
  recorded = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://loop.test");
      let body: unknown = undefined;
      if (typeof init?.body === "string") body = JSON.parse(init.body);
      else if (init?.body instanceof FormData) body = init.body;
      recorded.push({ method: (init?.method ?? "GET") as Method, path: url.pathname, query: url.searchParams, body });
      return new Response(init?.method === "DELETE" ? null : "{}", { status: init?.method === "DELETE" ? 204 : 200 });
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

const ID = "ckxyz123";
const week = presetRange(7);

// What the UI actually sends (values mirror the components that make these calls).
const UI_CALLS: { name: string; run: () => Promise<unknown>; schema?: ZodType; part?: "body" | "query"; uiRole: Guard }[] = [
  { name: "signup", run: () => client.signup({ name: "Ada", email: "ada@x.io", password: "longpassword", workspaceName: "Acme" }), schema: signupSchema, part: "body", uiRole: "public" },
  { name: "getMe", run: () => client.getMe(), uiRole: "session" },
  { name: "getMembers", run: () => client.getMembers(), uiRole: "admin" },
  { name: "createMember", run: () => client.createMember({ name: "Bo", email: "bo@x.io", role: "VIEWER", tempPassword: "temporary1" }), schema: createMemberSchema, part: "body", uiRole: "admin" },
  { name: "updateMember", run: () => client.updateMember(ID, { role: "ANALYST" }), schema: updateMemberSchema, part: "body", uiRole: "admin" },
  { name: "deleteMember", run: () => client.deleteMember(ID), uiRole: "admin" },
  {
    name: "getFeedbackList",
    run: () =>
      client.getFeedbackList(
        readInboxParams(new URLSearchParams("q=billing&channel=APP_REVIEW&sentiment=NEG&status=NEW&themeId=t1&from=2026-09-01&to=2026-09-30&sort=most_negative&page=2")),
      ),
    schema: feedbackListQuerySchema,
    part: "query",
    uiRole: "session",
  },
  { name: "createFeedback", run: () => client.createFeedback({ content: "Love it", channel: "SUPPORT_TICKET", customerLabel: "Acme", sourceRef: "ZD-1" }), schema: createFeedbackSchema, part: "body", uiRole: "analyst" },
  { name: "getFeedback", run: () => client.getFeedback(ID), uiRole: "session" },
  { name: "updateFeedback (status)", run: () => client.updateFeedback(ID, { status: "ACTIONED" }), schema: updateFeedbackSchema, part: "body", uiRole: "analyst" },
  { name: "updateFeedback (clear label)", run: () => client.updateFeedback(ID, { customerLabel: null }), schema: updateFeedbackSchema, part: "body", uiRole: "analyst" },
  { name: "deleteFeedback", run: () => client.deleteFeedback(ID), uiRole: "analyst" },
  { name: "importFeedback", run: () => client.importFeedback(new File(["content\nhi"], "x.csv", { type: "text/csv" })), uiRole: "analyst" },
  { name: "simulateFeedback", run: () => client.simulateFeedback({ channel: "NPS_SURVEY", count: 10 }), schema: simulateFeedbackSchema, part: "body", uiRole: "analyst" },
  { name: "classifyFeedback", run: () => client.classifyFeedback(ID), uiRole: "analyst" },
  { name: "processPending", run: () => client.processPending(), uiRole: "analyst" },
  { name: "getThemes", run: () => client.getThemes(), uiRole: "session" },
  { name: "createTheme", run: () => client.createTheme({ name: "Billing", description: "", color: "#8b5cf6" }), schema: createThemeSchema, part: "body", uiRole: "analyst" },
  { name: "getTheme", run: () => client.getTheme(ID), uiRole: "session" },
  { name: "updateTheme", run: () => client.updateTheme(ID, { name: "Billing", description: null, color: "#8b5cf6" }), schema: updateThemeSchema, part: "body", uiRole: "analyst" },
  { name: "deleteTheme", run: () => client.deleteTheme(ID), uiRole: "admin" },
  { name: "getThemeTrends", run: () => client.getThemeTrends({ period: "90d", bucket: "week" }), schema: trendsQuerySchema, part: "query", uiRole: "session" },
  { name: "getAnalytics", run: () => client.getAnalytics({ ...presetRange(30), channel: "COMMUNITY" }), schema: analyticsQuerySchema, part: "query", uiRole: "session" },
  { name: "askLoop", run: () => client.askLoop("Why are customers unhappy with billing?"), schema: askSchema, part: "body", uiRole: "session" },
  { name: "getReports", run: () => client.getReports({ page: 2, pageSize: 20 }), schema: paginationSchema, part: "query", uiRole: "session" },
  { name: "createReport", run: () => client.createReport({ periodStart: week.from, periodEnd: week.to, title: "Weekly VoC" }), schema: createReportSchema, part: "body", uiRole: "analyst" },
  { name: "getReport", run: () => client.getReport(ID), uiRole: "session" },
  { name: "deleteReport", run: () => client.deleteReport(ID), uiRole: "admin" },
];

// Backend routes the UI intentionally doesn't call through api-client.
const NOT_CALLED = new Set([
  "GET /api/health", // deploy smoke test only
  "POST /api/reports/:id/share", // API-GAP: no public read endpoint for shared reports yet
  "GET /api/auth/*", // next-auth/react (SessionProvider, getSession)
  "POST /api/auth/*", // next-auth/react (signIn, signOut)
]);

describe("api-client ↔ route handlers", () => {
  it("route scanner found the backend (guards against a vacuous pass)", () => {
    expect(routes.length).toBeGreaterThanOrEqual(19);
    const guards = new Set(routes.flatMap((r) => [...r.methods.values()]));
    expect([...guards].sort()).toEqual(["admin", "analyst", "nextauth", "public", "session"]);
  });

  it.each(UI_CALLS.map((c) => [c.name, c] as const))("%s hits an existing route + method", async (_name, call) => {
    await call.run();
    expect(recorded).toHaveLength(1);
    const { method, path } = recorded[0];
    const route = routeFor(path);
    expect(route, `no route file serves ${path}`).toBeDefined();
    expect([...route!.methods.keys()], `${route!.file} doesn't export ${method}`).toContain(method);
  });

  it("every backend route is used by the UI (or explicitly exempt)", async () => {
    const used = new Set<string>();
    for (const call of UI_CALLS) {
      recorded = [];
      await call.run();
      const r = routeFor(recorded[0].path)!;
      used.add(`${recorded[0].method} ${r.pattern}`);
    }
    const unused = routes
      .flatMap((r) => [...r.methods.keys()].map((m) => `${m} ${r.pattern}`))
      .filter((key) => !used.has(key) && !NOT_CALLED.has(key));
    expect(unused).toEqual([]);
  });
});

describe("request payloads pass the backend's Zod schemas", () => {
  it.each(UI_CALLS.filter((c) => c.schema).map((c) => [c.name, c] as const))("%s", async (_name, call) => {
    await call.run();
    const { body, query } = recorded[0];
    // Mirrors lib/http.ts parseQuery: empty values are dropped before parsing.
    const input = call.part === "query" ? Object.fromEntries([...query].filter(([, v]) => v !== "")) : body;
    const result = call.schema!.safeParse(input);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });
});

describe("role guards match the UI's gating", () => {
  it.each(UI_CALLS.map((c) => [c.name, c] as const))("%s", async (_name, call) => {
    await call.run();
    const { method, path } = recorded[0];
    const guard = routeFor(path)!.methods.get(method);
    expect(guard).toBe(call.uiRole);
  });
});
