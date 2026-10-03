import { PageSkeleton } from "@/components/app/page-skeleton";

export default function DashboardLoading() {
  return <PageSkeleton stats={3} blocks={2} label="Loading dashboard" />;
}
