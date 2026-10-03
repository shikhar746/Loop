"use client";

import Link from "next/link";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppBackground } from "./app-background";
import { AppSidebar } from "./app-sidebar";
import { MeProvider } from "./me-provider";
import { Wordmark } from "./wordmark";

/**
 * The signed-in shell. Lives in the (app) layout, so it (and the Gradient Waves background) mounts once
 * and persists across client-side navigation between app pages.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <AppBackground />
      <SidebarProvider>
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
            <SidebarTrigger aria-label="Open navigation" />
            <Link href="/dashboard" aria-label="LOOP dashboard">
              <Wordmark size="sm" />
            </Link>
          </header>
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 outline-none sm:px-6 lg:px-10 lg:py-10">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </MeProvider>
  );
}
