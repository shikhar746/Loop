"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <TooltipProvider delayDuration={250}>
        {children}
        {/* Sonner renders an aria-live region, so toasts are announced. */}
        <Toaster position="bottom-right" richColors={false} closeButton />
      </TooltipProvider>
    </SessionProvider>
  );
}
