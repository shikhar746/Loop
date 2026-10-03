/**
 * End-to-end checks against a running server (no AI calls): auth, roles, tenant isolation, validation.
 * Requires `npm run seed` first and `npm run dev` (or a deployed URL) running.
 *
 *   npm run smoke                                   # http://localhost:3000
 *   SMOKE_BASE_URL=https://loop.vercel.app npm run smoke
 */
const BASE = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "";

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
}

function cookiesFrom(res: Response): string[] {
  return res.headers.getSetCookie().map((c) => c.split(";")[0]);
}

async function login(email: string): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const jar = cookiesFrom(csrfRes);
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar.join("; ") },
    body: new URLSearchParams({ csrfToken, email, password: PASSWORD, json: "true" }),
  });
  const cookie = [...jar, ...cookiesFrom(res)].join("; ");
  if (!/session-token=/.test(cookie)) throw new Error(`login failed for ${email} (status ${res.status})`);
  return cookie;
}

async function call(method: string, path: string, cookie?: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

type Json = Record<string, unknown>;
const errCode = (data: unknown) => ((data as { error?: { code?: string } })?.error?.code ?? "");

async function main() {
  if (!PASSWORD) throw new Error("Set SEED_DEMO_PASSWORD (same value used by npm run seed).");
  console.log(`Smoke testing ${BASE}\n`);

  const health = await call("GET", "/api/health");
  check("GET /api/health → 200", health.status === 200, `got ${health.status}`);

  // No session
  const anon = await call("GET", "/api/feedback");
  check("no session: GET /api/feedback → 401 UNAUTHENTICATED", anon.status === 401 && errCode(anon.data) === "UNAUTHENTICATED", `got ${anon.status}`);
  const anonAsk = await call("POST", "/api/insights/ask", undefined, { question: "What do people say about billing?" });
  check("no session: POST /api/insights/ask → 401", anonAsk.status === 401, `got ${anonAsk.status}`);

  const [admin, analyst, viewer, globex] = await Promise.all([
    login("admin@loop.demo"),
    login("analyst@loop.demo"),
    login("viewer@loop.demo"),
    login("admin@globex.demo"),
  ]);

  // Me
  const me = await call("GET", "/api/me", viewer);
  check("viewer: GET /api/me → 200 role VIEWER", me.status === 200 && (me.data as Json).role === "VIEWER", JSON.stringify(me.data));

  // Lists + Acme ids
  const list = await call("GET", "/api/feedback?pageSize=5&sort=newest", analyst);
  const page = list.data as { items: Json[]; total: number; totalPages: number; pageSize: number };
  check("analyst: GET /api/feedback → list shape", list.status === 200 && Array.isArray(page.items) && page.pageSize === 5 && typeof page.total === "number");
  const acmeFeedbackId = String(page.items[0]?.id ?? "");
  const themes = await call("GET", "/api/themes", analyst);
  const acmeThemeId = String(((themes.data as { items: Json[] }).items[0] ?? {}).id ?? "");
  check("analyst: GET /api/themes → 200 with items", themes.status === 200 && acmeThemeId !== "");

  // Roles
  const viewerPost = await call("POST", "/api/feedback", viewer, { content: "viewer should not write", channel: "OTHER" });
  check("viewer: POST /api/feedback → 403 FORBIDDEN", viewerPost.status === 403 && errCode(viewerPost.data) === "FORBIDDEN", `got ${viewerPost.status}`);
  const viewerSim = await call("POST", "/api/feedback/simulate", viewer, { channel: "SUPPORT_TICKET", count: 5 });
  check("viewer: POST /api/feedback/simulate → 403", viewerSim.status === 403, `got ${viewerSim.status}`);
  const viewerMembers = await call("GET", "/api/members", viewer);
  check("viewer: GET /api/members → 403", viewerMembers.status === 403, `got ${viewerMembers.status}`);
  const analystDeleteTheme = await call("DELETE", `/api/themes/${acmeThemeId}`, analyst);
  check("analyst: DELETE /api/themes/[id] → 403 (admin only)", analystDeleteTheme.status === 403, `got ${analystDeleteTheme.status}`);
  const analystMembers = await call("GET", "/api/members", analyst);
  check("analyst: GET /api/members → 403", analystMembers.status === 403, `got ${analystMembers.status}`);

  // Tenant isolation: Globex admin vs Acme ids → 404 (not 403)
  const crossGet = await call("GET", `/api/feedback/${acmeFeedbackId}`, globex);
  check("globex: GET Acme feedback → 404 NOT_FOUND", crossGet.status === 404 && errCode(crossGet.data) === "NOT_FOUND", `got ${crossGet.status}`);
  const crossPatch = await call("PATCH", `/api/feedback/${acmeFeedbackId}`, globex, { status: "ACTIONED" });
  check("globex: PATCH Acme feedback → 404", crossPatch.status === 404, `got ${crossPatch.status}`);
  const crossDelete = await call("DELETE", `/api/feedback/${acmeFeedbackId}`, globex);
  check("globex: DELETE Acme feedback → 404", crossDelete.status === 404, `got ${crossDelete.status}`);
  const crossTheme = await call("GET", `/api/themes/${acmeThemeId}`, globex);
  check("globex: GET Acme theme → 404", crossTheme.status === 404, `got ${crossTheme.status}`);
  const globexList = await call("GET", "/api/feedback?pageSize=100", globex);
  const globexIds = (globexList.data as { items: Json[] }).items.map((i) => i.id);
  check("globex: feedback list contains no Acme rows", !globexIds.includes(acmeFeedbackId));
  const globexThemeFilter = await call("GET", `/api/feedback?themeId=${acmeThemeId}`, globex);
  check("globex: filtering by an Acme themeId returns nothing", (globexThemeFilter.data as { total: number }).total === 0);

  // Validation
  const badPage = await call("GET", "/api/feedback?pageSize=1000", analyst);
  check("GET /api/feedback?pageSize=1000 → 400 VALIDATION_ERROR", badPage.status === 400 && errCode(badPage.data) === "VALIDATION_ERROR", `got ${badPage.status}`);
  const badSim = await call("POST", "/api/feedback/simulate", analyst, { channel: "FAX", count: 2 });
  check("POST simulate with bad body → 400 with details", badSim.status === 400 && Array.isArray((badSim.data as { error: { details?: unknown } }).error.details));

  // Writes that don't need AI
  const sim = await call("POST", "/api/feedback/simulate", analyst, { channel: "APP_REVIEW", count: 5 });
  check("analyst: POST /api/feedback/simulate → 201 created 5", sim.status === 201 && (sim.data as Json).created === 5, JSON.stringify(sim.data));
  const patched = await call("PATCH", `/api/feedback/${acmeFeedbackId}`, analyst, { status: "REVIEWED" });
  check("analyst: PATCH own-workspace feedback → 200", patched.status === 200 && (patched.data as Json).status === "REVIEWED");
  const search = await call("GET", "/api/feedback?q=refund%20OR%20invoice&pageSize=5", viewer);
  check("viewer: full-text search q=refund OR invoice → 200", search.status === 200);

  // Read endpoints
  const analytics = await call("GET", "/api/analytics", viewer);
  const a = analytics.data as { stats?: Json; volume?: unknown[]; sentiment?: unknown[]; topThemes?: unknown[] };
  check("viewer: GET /api/analytics → Recharts-ready shape", analytics.status === 200 && !!a.stats && Array.isArray(a.volume) && Array.isArray(a.sentiment));
  const trends = await call("GET", "/api/themes/trends?period=7d&bucket=day", viewer);
  check("viewer: GET /api/themes/trends → 200", trends.status === 200 && Array.isArray((trends.data as Json).themes));
  const reports = await call("GET", "/api/reports", viewer);
  check("viewer: GET /api/reports → 200", reports.status === 200);

  // Members: last admin can't be demoted
  const members = await call("GET", "/api/members", admin);
  const adminRow = (members.data as { items: Json[] }).items.find((m) => m.email === "admin@loop.demo");
  check("admin: GET /api/members → 200", members.status === 200 && !!adminRow);
  const demote = await call("PATCH", `/api/members/${String(adminRow?.id)}`, admin, { role: "VIEWER" });
  check("admin: demoting the last ADMIN → 409 CONFLICT", demote.status === 409 && errCode(demote.data) === "CONFLICT", `got ${demote.status}`);
  const deleteSelf = await call("DELETE", `/api/members/${String(adminRow?.id)}`, admin);
  check("admin: deleting yourself → 409", deleteSelf.status === 409, `got ${deleteSelf.status}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
