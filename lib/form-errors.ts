"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/notify";

/**
 * Maps an API error onto a react-hook-form instance:
 * 400 → inline field errors from `details`; anything else (409, 403, 502…) → a form-level `root` error.
 * Returns the message that was shown.
 */
export function applyApiErrors<T extends FieldValues>(form: UseFormReturn<T>, err: unknown): string {
  const e = toApiError(err);
  const fields = e.status === 400 ? e.fieldErrors : {};
  const known = Object.keys(form.getValues());
  let placed = 0;
  for (const [path, message] of Object.entries(fields)) {
    if (known.includes(path)) {
      form.setError(path as Path<T>, { type: "server", message });
      placed++;
    }
  }
  const message = errorMessage(e);
  if (placed === 0) form.setError("root", { type: "server", message });
  return message;
}
