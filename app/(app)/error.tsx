"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="surface mx-auto mt-10 max-w-lg space-y-4 p-8 text-center" role="alert">
      <TriangleAlert className="mx-auto size-8 text-spike" aria-hidden="true" />
      <h1 className="display-wonk font-display text-3xl font-black">Something went sideways</h1>
      <p className="text-sm text-muted-foreground">
        This page hit an unexpected error. Your data is safe. Try again, or head back to the dashboard.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
