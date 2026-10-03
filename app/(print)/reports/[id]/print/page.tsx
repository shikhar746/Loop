import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReportPrint } from "@/components/reports/report-print";

export const metadata: Metadata = { title: "Print report" };

// Outside the (app) group: no sidebar and no animated background, just the document on white.
export default async function ReportPrintPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/reports/${params.id}/print`)}`);
  return <ReportPrint id={params.id} />;
}
