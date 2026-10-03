"use client";

import { useCallback, useMemo } from "react";
import { Inbox as InboxIcon, SearchX, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClassifyProgress } from "@/components/app/classify-progress";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { useMe } from "@/components/app/me-provider";
import { PageHeader } from "@/components/app/page-header";
import { Pager } from "@/components/app/pager";
import { getFeedbackList, getThemes, paths, updateFeedback } from "@/lib/api-client";
import { useApi } from "@/lib/hooks/use-api";
import { useClassifyLoop } from "@/lib/hooks/use-classify-loop";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { toastError } from "@/lib/notify";
import { reveal } from "@/lib/reveal";
import { STATUS_LABELS } from "@/lib/format";
import type { Feedback, FeedbackStatus, Paginated, ThemeListItem } from "@/lib/types";
import { AddFeedbackDialog } from "./add-feedback-dialog";
import { FeedbackSheet } from "./feedback-sheet";
import { FeedbackTable, FeedbackTableSkeleton } from "./feedback-table";
import { ImportCsvDialog } from "./import-csv-dialog";
import { FILTER_KEYS, readInboxParams } from "./inbox-params";
import { InboxToolbar } from "./inbox-toolbar";
import { SimulateMenu } from "./simulate-menu";

export function InboxView() {
  const { searchParams, set } = useUrlParams();
  const { canEdit } = useMe();
  const params = useMemo(() => readInboxParams(searchParams), [searchParams]);
  const openId = searchParams.get("id") ?? undefined;
  const hasFilters = FILTER_KEYS.some((k) => k !== "sort" && searchParams.has(k)) || params.sort !== "newest";

  const list = useApi<Paginated<Feedback>>(paths.feedbackList(params), (signal) => getFeedbackList(params, signal));
  const themes = useApi<{ items: ThemeListItem[] }>(paths.themes(), (signal) => getThemes({}, signal));

  const silentRefetch = list.refetch;
  const classify = useClassifyLoop({
    onBatch: () => silentRefetch({ silent: true }),
    onFinish: () => {
      silentRefetch({ silent: true });
      themes.refetch({ silent: true });
    },
  });

  const update = useCallback((u: Record<string, string | number | null | undefined>) => set(u), [set]);
  const clearFilters = () => set(Object.fromEntries([...FILTER_KEYS, "page"].map((k) => [k, null])));

  const replaceItem = useCallback(
    (item: Feedback) =>
      list.setData((prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === item.id ? item : i)) } : prev)),
    [list],
  );

  async function changeStatus(item: Feedback, status: FeedbackStatus) {
    if (item.status === status) return;
    replaceItem({ ...item, status }); // optimistic
    try {
      replaceItem(await updateFeedback(item.id, { status }));
      toast.success(`Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (err) {
      replaceItem(item); // revert
      toastError(err);
    }
  }

  const data = list.data;
  const pendingOnPage = data?.items.some((i) => i.classificationStatus !== "DONE") ?? false;
  const r1 = reveal(1);
  const r2 = reveal(2);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="C3 · C4 · Inbox"
        title="Inbox"
        description="Every piece of feedback, classified. Filter, triage and drill into the evidence."
        actions={
          canEdit ? (
            <>
              <Button variant="ghost" onClick={() => void classify.run()} loading={classify.running}>
                {!classify.running && <Sparkles aria-hidden="true" />}
                Classify pending
              </Button>
              <SimulateMenu onSimulated={() => void classify.run()} disabled={classify.running} />
              <ImportCsvDialog onImported={() => void classify.run()} />
              <AddFeedbackDialog
                onCreated={() => {
                  list.refetch({ silent: true });
                  themes.refetch({ silent: true });
                }}
              />
            </>
          ) : null
        }
      />

      {classify.running && <ClassifyProgress done={classify.done} total={classify.total} />}

      <div className={r1.className} style={r1.style}>
        <InboxToolbar
          params={params}
          themes={themes.data?.items ?? []}
          themesLoading={themes.loading}
          onChange={update}
          onClear={clearFilters}
          hasFilters={hasFilters}
        />
      </div>

      <section aria-label="Feedback list" aria-busy={list.loading} className={`space-y-4 ${r2.className}`} style={r2.style}>
        {list.error && !data ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.loading || !data ? (
          <FeedbackTableSkeleton />
        ) : data.items.length === 0 ? (
          <div className="surface">
            {hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="No feedback matches these filters"
                description="Try a different search or widen the date range."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={InboxIcon}
                title="No feedback yet"
                description={
                  canEdit
                    ? "Add a single item, import a CSV export, or simulate a channel to see LOOP classify in real time."
                    : "Feedback appears here once an analyst or admin imports it."
                }
                action={
                  canEdit ? (
                    <>
                      <AddFeedbackDialog onCreated={() => list.refetch()} />
                      <ImportCsvDialog onImported={() => void classify.run()} />
                    </>
                  ) : undefined
                }
              />
            )}
          </div>
        ) : (
          <>
            {pendingOnPage && canEdit && !classify.running && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                Some items on this page are still being classified.
                <Button variant="link" className="h-auto p-0" onClick={() => void classify.run()}>
                  Classify now
                </Button>
              </p>
            )}
            <FeedbackTable
              items={data.items}
              canEdit={canEdit}
              selectedId={openId}
              onOpen={(id) => set({ id })}
              onStatusChange={changeStatus}
            />
            <Pager
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              noun="items"
              hrefFor={(p) => {
                const next = new URLSearchParams(searchParams.toString());
                next.set("page", String(p));
                next.delete("id");
                return `/inbox?${next.toString()}`;
              }}
              onPageChange={(p) => {
                set({ page: p === 1 ? null : p });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </>
        )}
      </section>

      <FeedbackSheet
        id={openId}
        canEdit={canEdit}
        onClose={() => set({ id: null })}
        onUpdated={replaceItem}
        onDeleted={() => {
          set({ id: null });
          list.refetch({ silent: true });
        }}
      />
    </div>
  );
}
