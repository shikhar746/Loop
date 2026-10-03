import type { Metadata } from "next";
import { ReportView } from "@/components/reports/report-view";

export const metadata: Metadata = { title: "Report" };

export default function ReportPage({ params }: { params: { id: string } }) {
  return <ReportView id={params.id} />;
}
