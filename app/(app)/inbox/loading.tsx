import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackTableSkeleton } from "@/components/inbox/feedback-table";

export default function InboxLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading inbox">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <FeedbackTableSkeleton />
    </div>
  );
}
