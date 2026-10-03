import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodType } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "AI_UNAVAILABLE"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
export const forbidden = () => new AppError(403, "FORBIDDEN", "Your role doesn't allow this action.");
export const notFound = (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found.`);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "VALIDATION_ERROR", message, details);
export const aiUnavailable = (message = "The AI service is unavailable right now. Please try again shortly.") =>
  new AppError(502, "AI_UNAVAILABLE", message);

function errorBody(code: ErrorCode, message: string, details?: unknown) {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return NextResponse.json(errorBody("VALIDATION_ERROR", "Some fields are invalid.", details), { status: 400 });
  }
  if (err instanceof AppError) {
    return NextResponse.json(errorBody(err.code, err.message, err.details), { status: err.status });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json(errorBody("CONFLICT", "That record already exists."), { status: 409 });
    }
    if (err.code === "P2025") {
      return NextResponse.json(errorBody("NOT_FOUND", "Resource not found."), { status: 404 });
    }
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json(errorBody("INTERNAL", "Something went wrong on our side. Please try again."), {
    status: 500,
  });
}

type RouteContext<P> = { params: P };

/** Wraps a route handler so every thrown error becomes the standard { error } JSON shape. */
export function withHandler<P extends Record<string, string> = Record<string, never>>(
  handler: (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    if (value !== "") raw[key] = value;
  });
  return schema.parse(raw);
}

export function parseParams<T>(params: unknown, schema: ZodType<T>): T {
  return schema.parse(params);
}
