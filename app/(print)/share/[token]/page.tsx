import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/http";
import { getSharedReport } from "@/lib/services/reports";
import { ReportDocument } from "@/components/reports/report-document";
import { Wordmark } from "@/components/app/wordmark";
import type { Report, ReportContent } from "@/lib/types";

export const dynamic = "force-dynamic";

// A shared link is a capability URL: keep it out of search engines.
export const metadata: Metadata = { title: "Shared report", robots: { index: false, follow: false } };

async function loadReport(token: string): Promise<Report> {
  try {
    const r = await getSharedReport(token);
    return {
      id: r.id,
      title: r.title,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      createdAt: r.createdAt.toISOString(),
      shareToken: token,
      generatedBy: null,
      contentJson: r.contentJson as unknown as ReportContent,
    };
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }
}

// Public, read-only: no session needed (middleware doesn't match /share). The unguessable token is the only credential.
export default async function SharedReportPage({ params }: { params: { token: string } }) {
  const report = await loadReport(params.token);
  return (
    <main className="min-h-dvh bg-white px-6 py-10 text-zinc-900 print:p-0">
      <div className="mx-auto mb-8 flex max-w-3xl items-center justify-between border-b border-zinc-200 pb-4 print:hidden">
        <Wordmark />
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">Shared read-only report</span>
      </div>
      <ReportDocument report={report} print />
    </main>
  );
}
