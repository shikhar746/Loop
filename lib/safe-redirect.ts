/** Only same-origin relative paths are allowed as post-login destinations. */
export function safeCallbackUrl(value: string | string[] | undefined | null, fallback = "/dashboard"): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  if (v.startsWith("/login") || v.startsWith("/signup")) return fallback;
  return v;
}
