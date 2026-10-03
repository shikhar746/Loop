"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

/**
 * "Continue with Google" (NextAuth Google provider). It's a full-page redirect to Google and back.
 * lucide has no Google mark, so a typographic G stands in for the logo.
 */
export function GoogleButton({ callbackUrl, label = "Continue with Google" }: { callbackUrl: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      loading={busy}
      onClick={() => {
        setBusy(true);
        void signIn("google", { callbackUrl });
      }}
    >
      {!busy && (
        <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-foreground font-display text-[0.8rem] font-black text-background">
          G
        </span>
      )}
      {label}
    </Button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label="or">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** NextAuth puts ?error=<code> on /login when an OAuth sign-in fails. */
export function oauthErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "GoogleEmailUnverified":
      return "Your Google account's email isn't verified, so it can't be used to sign in.";
    case "AccessDenied":
      return "Google sign-in was cancelled or denied.";
    case "OAuthSignin":
    case "OAuthCallback":
    case "Callback":
      return "We couldn't complete Google sign-in. Please try again.";
    case "OAuthAccountNotLinked":
      return "That email is already linked to a different sign-in method.";
    case "SessionRequired":
      return null;
    default:
      return "Sign-in failed. Please try again.";
  }
}
