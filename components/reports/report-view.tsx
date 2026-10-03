"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft, Link2, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ErrorState } from "@/components/app/error-state";
import { useMe } from "@/components/app/me-provider";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { deleteReport, getReport, paths, shareReport } from "@/lib/api-client";
import { useApi } from "@/lib/hooks/use-api";
import { toastError } from "@/lib/notify";
import { reveal } from "@/lib/reveal";
import type { Report } from "@/lib/types";
import { ReportDocument } from "./report-document";

export function ReportView({ id }: { id: string }) {
  const router = useRouter();
  const { canEdit, isAdmin } = useMe();
  const { data, error, loading, refetch } = useApi<Report>(paths.report(id), (signal) => getReport(id, signal));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (error?.status === 404) notFound();
  if (error && !data) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (loading || !data) return <PageSkeleton blocks={3} label="Loading report" />;

  async function remove() {
    try {
      await deleteReport(id);
      toast.success("Report deleted.");
      router.push("/reports");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function share() {
    setSharing(true);
    try {
      const { sharePath } = await shareReport(id);
      const url = `${window.location.origin}${sharePath}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied. Anyone with the link can view this report.");
      } catch {
        toast.success("Share link ready.", { description: url });
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSharing(false);
    }
  }

  const r0 = reveal(0);
  const r1 = reveal(1);

  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-center justify-between gap-2 ${r0.className}`} style={r0.style}>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/reports">
            <ArrowLeft aria-hidden="true" />
            Reports
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/reports/${id}/print`} target="_blank" rel="noopener">
              <Printer aria-hidden="true" />
              Print / Save as PDF
            </Link>
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={share} disabled={sharing}>
              <Link2 aria-hidden="true" />
              {sharing ? "Creating link…" : "Copy share link"}
            </Button>
          )}
          {isAdmin && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Solid paper-like surface over the animated background */}
      <div className={`surface px-5 py-10 sm:px-10 sm:py-14 ${r1.className}`} style={r1.style}>
        <ReportDocument report={data} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this report?"
        description={<p>&ldquo;{data.title}&rdquo; will be removed for everyone in the workspace. Feedback is not affected.</p>}
        onConfirm={remove}
      />
    </div>
  );
}
