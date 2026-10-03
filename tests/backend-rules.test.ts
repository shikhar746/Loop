/**
 * Backend rules the UI depends on: validation, spike detection, error envelope, env parsing,
 * and the Google-account mapping. No database or network: Prisma is mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// ---- mocks (hoisted above the imports below) ----
const dbMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn() },
  workspace: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/auth", () => ({ BCRYPT_COST: 4 })); // members.ts only needs the cost; avoids env + NextAuth

import { Prisma } from "@prisma/client";
import { AppError, toErrorResponse } from "@/lib/http";
import { readEnv } from "@/lib/env";
import { deleteMember, findOrCreateGoogleUser, updateMemberRole } from "@/lib/services/members";
import { changePct, isSpiking } from "@/lib/services/themes";
import { signupSchema } from "@/lib/validators/auth";
import { importRowSchema, normalizeChannel, simulateFeedbackSchema, updateFeedbackSchema } from "@/lib/validators/feedback";
import { createReportSchema } from "@/lib/validators/reports";
import { updateThemeSchema } from "@/lib/validators/themes";

describe("validators", () => {
  it("signup normalises email and enforces password length", () => {
    expect(signupSchema.parse({ name: " Ada ", email: " ADA@X.IO ", password: "longpassword", workspaceName: "Acme" })).toMatchObject({
      name: "Ada",
      email: "ada@x.io",
    });
    expect(signupSchema.safeParse({ name: "Ada", email: "ada@x.io", password: "short", workspaceName: "Acme" }).success).toBe(false);
  });

  it("feedback PATCH needs status or customerLabel; null clears the label", () => {
    expect(updateFeedbackSchema.safeParse({}).success).toBe(false);
    expect(updateFeedbackSchema.parse({ customerLabel: null })).toEqual({ customerLabel: null });
  });

  it("simulate count must be 5–25 (UI sends 10)", () => {
    expect(simulateFeedbackSchema.safeParse({ channel: "OTHER", count: 10 }).success).toBe(true);
    expect(simulateFeedbackSchema.safeParse({ channel: "OTHER", count: 50 }).success).toBe(false);
  });

  it("CSV channel aliases map onto the enum", () => {
    expect(normalizeChannel("App Store")).toBe("APP_REVIEW");
    expect(normalizeChannel("zendesk")).toBe("SUPPORT_TICKET");
    expect(normalizeChannel("")).toBe("OTHER");
    expect(normalizeChannel("carrier pigeon")).toBeNull();
    expect(importRowSchema.safeParse({ content: "hi", channel: "carrier pigeon" }).success).toBe(false);
  });

  it("CSV rows can't be dated in the future", () => {
    expect(importRowSchema.safeParse({ content: "hi", created_at: "2999-01-01" }).success).toBe(false);
    expect(importRowSchema.safeParse({ content: "hi", created_at: "2026-09-14" }).success).toBe(true);
  });

  it("report period: bare end date means end of day; end must follow start; max one year", () => {
    const r = createReportSchema.parse({ periodStart: "2026-10-03", periodEnd: "2026-10-03" });
    expect(r.periodEnd.toISOString()).toBe("2026-10-03T23:59:59.999Z");
    expect(createReportSchema.safeParse({ periodStart: "2026-10-03", periodEnd: "2026-10-01" }).success).toBe(false);
    expect(createReportSchema.safeParse({ periodStart: "2024-01-01", periodEnd: "2026-01-01" }).success).toBe(false);
  });

  it("theme PATCH rejects an empty update and bad colours", () => {
    expect(updateThemeSchema.safeParse({}).success).toBe(false);
    expect(updateThemeSchema.safeParse({ color: "purple" }).success).toBe(false);
    expect(updateThemeSchema.safeParse({ description: null }).success).toBe(true);
  });
});

describe("spike detection (drives the Spiking badge + amber chart lines)", () => {
  it("changePct is null when there's no previous data", () => {
    expect(changePct(10, 0)).toBeNull();
    expect(changePct(21, 2)).toBe(950);
    expect(changePct(6, 7)).toBe(-14.3);
  });

  it("needs ≥5 items and ≥50% growth (or growth from zero)", () => {
    expect(isSpiking(4, 0)).toBe(false); // too few
    expect(isSpiking(5, 0)).toBe(true); // new and big enough
    expect(isSpiking(15, 10)).toBe(true); // +50%
    expect(isSpiking(14, 10)).toBe(false); // +40%
  });
});

describe("error envelope (what api-client parses)", () => {
  const body = async (res: Response) => (await res.json()) as { error: { code: string; message: string; details?: unknown } };

  it("ZodError → 400 VALIDATION_ERROR with { path, message } details", async () => {
    const err = z.object({ email: z.string().min(3) }).safeParse({ email: "x" }).error!;
    const res = toErrorResponse(err);
    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Some fields are invalid.", details: [{ path: "email", message: expect.any(String) }] },
    });
  });

  it("AppError keeps its status and code (e.g. 502 AI_UNAVAILABLE)", async () => {
    const res = toErrorResponse(new AppError(502, "AI_UNAVAILABLE", "down"));
    expect(res.status).toBe(502);
    expect((await body(res)).error.code).toBe("AI_UNAVAILABLE");
  });

  it("Prisma unique violation → 409 CONFLICT", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" });
    expect(toErrorResponse(err).status).toBe(409);
  });

  it("unknown errors → 500 INTERNAL without leaking the message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = toErrorResponse(new Error("db password is hunter2"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await body(res))).not.toContain("hunter2");
    spy.mockRestore();
  });
});

describe("env (Google OAuth is opt-in)", () => {
  const base = {
    DATABASE_URL: "postgresql://u:p@h:6543/db",
    DIRECT_URL: "postgresql://u:p@h:5432/db",
    NEXTAUTH_SECRET: "x".repeat(32),
    VOYAGE_API_KEY: "pa-test",
    AI_PROVIDER: "gemini",
    GEMINI_API_KEY: "test",
  } as unknown as NodeJS.ProcessEnv;

  it("empty Google values (as in .env.example) mean 'not configured', not an error", () => {
    const env = readEnv({ ...base, GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" });
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  });

  it("keeps configured Google credentials", () => {
    const env = readEnv({ ...base, GOOGLE_CLIENT_ID: "1-abc.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "GOCSPX-x" });
    expect(env.GOOGLE_CLIENT_ID).toBe("1-abc.apps.googleusercontent.com");
  });

  it("lists every missing required variable at once", () => {
    expect(() => readEnv({ AI_PROVIDER: "gemini" } as unknown as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL[\s\S]*NEXTAUTH_SECRET[\s\S]*GEMINI_API_KEY/);
  });
});

describe("members: self-protection (Settings hides these; the API must enforce them too)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("an admin can't change their own role (409, no DB write)", async () => {
    const err = await updateMemberRole("w1", "me", "me", { role: "VIEWER" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ status: 409, code: "CONFLICT" });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("an admin can't remove themselves (409)", async () => {
    await expect(deleteMember("w1", "me", "me")).rejects.toMatchObject({ status: 409 });
  });
});

describe("findOrCreateGoogleUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (fn: (tx: typeof dbMock) => unknown) => fn(dbMock));
  });

  it("signs an existing account in by (case-insensitive) email, keeping role + workspace", async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: "u1", role: "ANALYST", workspaceId: "w1" });
    const res = await findOrCreateGoogleUser({ email: "Analyst@Loop.Demo", name: "Sam" });
    expect(dbMock.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "analyst@loop.demo" } }));
    expect(res).toEqual({ id: "u1", role: "ANALYST", workspaceId: "w1", isNew: false });
    expect(dbMock.workspace.create).not.toHaveBeenCalled();
  });

  it("creates a workspace + ADMIN with an unusable password for a new email", async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.workspace.create.mockResolvedValue({ id: "w9" });
    dbMock.user.create.mockResolvedValue({ id: "u9", role: "ADMIN", workspaceId: "w9" });

    const res = await findOrCreateGoogleUser({ email: "new@gmail.com", name: "Shikhar Srivastava" });

    expect(dbMock.workspace.create).toHaveBeenCalledWith({ data: { name: "Shikhar's workspace" } });
    const data = dbMock.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: "new@gmail.com", name: "Shikhar Srivastava", role: "ADMIN", workspaceId: "w9" });
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/); // a real bcrypt hash of random bytes
    expect(res.isNew).toBe(true);
  });

  it("falls back to the email's local part when Google gives no name", async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.workspace.create.mockResolvedValue({ id: "w2" });
    dbMock.user.create.mockResolvedValue({ id: "u2", role: "ADMIN", workspaceId: "w2" });
    await findOrCreateGoogleUser({ email: "jo@x.io", name: null });
    expect(dbMock.user.create.mock.calls[0][0].data.name).toBe("jo");
  });

  it("recovers from a first-sign-in race (unique violation) by reading the winner", async () => {
    dbMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "u3", role: "ADMIN", workspaceId: "w3" });
    dbMock.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" }),
    );
    await expect(findOrCreateGoogleUser({ email: "race@x.io", name: "R" })).resolves.toMatchObject({ id: "u3", isNew: false });
  });
});
