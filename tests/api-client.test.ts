import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, toApiError, withQuery } from "@/lib/api-client";
import { errorMessage, AI_UNAVAILABLE_MESSAGE, GENERIC_MESSAGE, PERMISSION_MESSAGE } from "@/lib/notify";

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("withQuery", () => {
  it("drops empty values and encodes the rest", () => {
    expect(withQuery("/api/feedback", { q: "a b", page: 2, channel: undefined, sentiment: "", x: null })).toBe(
      "/api/feedback?q=a+b&page=2",
    );
  });
  it("returns the bare path when nothing is left", () => {
    expect(withQuery("/api/themes", { from: undefined })).toBe("/api/themes");
  });
});

describe("request", () => {
  it("returns parsed JSON on success and sends JSON bodies", async () => {
    const fetch = mockFetch(200, { ok: true });
    await expect(request("/api/x", { method: "POST", json: { a: 1 } })).resolves.toEqual({ ok: true });
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch(204);
    await expect(request("/api/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("parses the backend error envelope into ApiError with field errors", async () => {
    mockFetch(400, {
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields are invalid.",
        details: [
          { path: "email", message: "must be a valid email address" },
          { path: "email", message: "second message is ignored" },
          { path: "password", message: "must be at least 8 characters" },
        ],
      },
    });
    const err = await request("/api/auth/signup").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const e = err as ApiError;
    expect([e.status, e.code, e.message]).toEqual([400, "VALIDATION_ERROR", "Some fields are invalid."]);
    expect(e.fieldErrors).toEqual({ email: "must be a valid email address", password: "must be at least 8 characters" });
  });

  it("redirects to /login with a callbackUrl on 401", async () => {
    mockFetch(401, { error: { code: "UNAUTHENTICATED", message: "Please sign in to continue." } });
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/inbox", search: "?id=1", assign } });
    await expect(request("/api/me")).rejects.toMatchObject({ status: 401 });
    expect(assign).toHaveBeenCalledWith(`/login?callbackUrl=${encodeURIComponent("/inbox?id=1")}`);
  });

  it("does not redirect-loop when already on /login", async () => {
    mockFetch(401);
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/login", search: "", assign } });
    await expect(request("/api/me")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    expect(assign).not.toHaveBeenCalled();
  });

  it("turns a network failure into a NETWORK ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(request("/api/me")).rejects.toMatchObject({ status: 0, code: "NETWORK" });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>oops</html>", { status: 500 })));
    await expect(request("/api/me")).rejects.toMatchObject({ status: 500, code: "INTERNAL" });
  });
});

describe("error → user message mapping (section 5 rules)", () => {
  const msg = (status: number, message = "API says no") => errorMessage(new ApiError(status, "X", message));
  it("403 → permission toast", () => expect(msg(403)).toBe(PERMISSION_MESSAGE));
  it("502 → AI unavailable", () => expect(msg(502)).toBe(AI_UNAVAILABLE_MESSAGE));
  it("500 → generic", () => expect(msg(500)).toBe(GENERIC_MESSAGE));
  it("409 → the API's own message", () => expect(msg(409, "A workspace must keep at least one admin.")).toBe("A workspace must keep at least one admin."));
  it("404 → the API's own message", () => expect(msg(404, "Theme not found.")).toBe("Theme not found."));
  it("unknown errors become NETWORK errors", () => expect(toApiError(new Error("boom")).code).toBe("NETWORK"));
});
