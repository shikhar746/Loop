"use client";

import { toast } from "sonner";
import { ApiError, toApiError } from "@/lib/api-client";

export const PERMISSION_MESSAGE = "You don't have permission to do that";
export const AI_UNAVAILABLE_MESSAGE = "AI is temporarily unavailable. Please try again in a moment.";
export const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/** Human message for an API error, following the app-wide status → message rules. */
export function errorMessage(err: unknown): string {
  const e = toApiError(err);
  if (e.status === 403) return PERMISSION_MESSAGE;
  if (e.status === 502) return AI_UNAVAILABLE_MESSAGE;
  if (e.status === 0) return e.message;
  if (e.status >= 500) return GENERIC_MESSAGE;
  return e.message;
}

/** Toast for a failed mutation. 401 is silent (api-client is already redirecting to /login). */
export function toastError(err: unknown, opts?: { retry?: () => void }) {
  const e = toApiError(err);
  if (e.status === 401 || e.code === "ABORTED") return;
  toast.error(errorMessage(e), opts?.retry ? { action: { label: "Retry", onClick: opts.retry } } : undefined);
}

export const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;
