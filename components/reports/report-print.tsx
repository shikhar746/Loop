"use client";

import { useEffect, useRef } from "react";
import { getReport, paths } from "@/lib/api-client";
import { useApi } from "@/lib/hooks/use-api";
import { errorMessage } from "@/lib/notify";
import type { Report } from "@/lib/types";
import { ReportDocument } from "./report-document";

/** Print layout: no shell, no background, dark text on white; opens the print dialog once loaded. */
export function ReportPrint({ id }: { id: string }) {
  const { data, error, loading } = useApi<Report>(paths.report(id), (signal) => getReport(id, signal));
  const printed = useRef(false);

  useEffect(() => {
    if (!data || printed.current) return;
    // Give fonts a moment to settle so the PDF uses Fraunces / Plex. The flag is set inside the
    // timeout so a strict-mode effect re-run (which clears the timer) can't cancel the print.
    const t = window.setTimeout(() => {
      printed.current = true;
      window.print();
    }, 600);
    return () => window.clearTimeout(t);
  }, [data]);

  if (error) {
    return (
      <p className="p-10 text-zinc-800">
        {error.status === 404 ? "This report doesn't exist or belongs to another workspace." : errorMessage(error)}
      </p>
    );
  }
  if (loading || !data) return <p className="p-10 text-zinc-600">Preparing report…</p>;

  return (
    <main className="min-h-dvh bg-white px-6 py-10 text-zinc-900 print:p-0">
      <ReportDocument report={data} print />
    </main>
  );
}
