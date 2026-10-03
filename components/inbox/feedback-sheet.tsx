"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, Hash, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ChannelLabel } from "@/components/app/channel-label";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { SentimentBadge } from "@/components/app/sentiment-badge";
import { ClassificationBadge, StatusBadge } from "@/components/app/status-badge";
import { ThemeTag } from "@/components/app/theme-tag";
import { classifyFeedback, deleteFeedback, getFeedback, paths, toApiError, updateFeedback } from "@/lib/api-client";
import { useApi } from "@/lib/hooks/use-api";
import { applyApiErrors } from "@/lib/form-errors";
import { toastError } from "@/lib/notify";
import { formatDateTime, formatScore } from "@/lib/format";
import type { Feedback, FeedbackStatus } from "@/lib/types";
import { createFeedbackSchema } from "@/lib/validators/feedback";
import { StatusSelect } from "./status-select";

const labelSchema = createFeedbackSchema.pick({ customerLabel: true });

export function FeedbackSheet({
  id,
  canEdit,
  onClose,
  onUpdated,
  onDeleted,
}: {
  id: string | undefined;
  canEdit: boolean;
  onClose: () => void;
  onUpdated: (item: Feedback) => void;
  onDeleted: (id: string) => void;
}) {
  const open = Boolean(id);
  const { data, error, loading, refetch, setData } = useApi<Feedback>(
    id ? paths.feedback(id) : null,
    (signal) => getFeedback(id!, signal),
  );
  const item = data && data.id === id ? data : null;
  const [reclassifying, setReclassifying] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const apply = (updated: Feedback) => {
    setData(() => updated);
    onUpdated(updated);
  };

  async function changeStatus(status: FeedbackStatus) {
    if (!item) return;
    const previous = item;
    apply({ ...item, status });
    setStatusSaving(true);
    try {
      apply(await updateFeedback(item.id, { status }));
      toast.success(`Marked as ${status.toLowerCase()}.`);
    } catch (err) {
      apply(previous);
      toastError(err);
    } finally {
      setStatusSaving(false);
    }
  }

  async function reclassify() {
    if (!item) return;
    setReclassifying(true);
    try {
      apply(await classifyFeedback(item.id));
      toast.success("Re-classified.");
    } catch (err) {
      toastError(err, { retry: reclassify });
      refetch({ silent: true }); // the item is now FAILED server-side
    } finally {
      setReclassifying(false);
    }
  }

  async function remove() {
    if (!item) return false;
    try {
      await deleteFeedback(item.id);
      toast.success("Feedback deleted.");
      onDeleted(item.id);
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-border bg-popover p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b border-border px-6 pb-4 pt-6 text-left">
          <p className="eyebrow">Feedback</p>
          <SheetTitle className="font-display text-2xl font-bold">
            {item?.customerLabel ?? (item ? "Customer feedback" : "Loading…")}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {item ? (
              <>
                <ChannelLabel channel={item.channel} />
                <time dateTime={item.createdAt} className="font-mono text-xs">
                  {formatDateTime(item.createdAt)}
                </time>
              </>
            ) : (
              <span>Details, classification and status.</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 px-6 py-5">
            {error ? (
              error.status === 404 ? (
                <EmptyState title="Feedback not found" description="It may have been deleted, or it belongs to another workspace." />
              ) : (
                <ErrorState error={error} onRetry={() => refetch()} />
              )
            ) : loading || !item ? (
              <SheetSkeleton />
            ) : (
              <>
                <blockquote className="border-l-2 border-primary pl-4 text-[1.02rem] leading-relaxed text-foreground">
                  {item.content}
                </blockquote>

                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <Meta label="Source ref">
                    {item.sourceRef ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <Hash className="size-3 text-lavender" aria-hidden="true" />
                        {item.sourceRef}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Meta>
                  <Meta label="Status">
                    {canEdit ? (
                      <StatusSelect
                        id="sheet-status"
                        value={item.status}
                        onChange={changeStatus}
                        disabled={statusSaving}
                        className="h-9 w-full"
                      />
                    ) : (
                      <StatusBadge status={item.status} />
                    )}
                  </Meta>
                </dl>

                <Separator />

                <section aria-labelledby="ai-heading" className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id="ai-heading" className="flex items-center gap-2 font-display text-lg font-semibold">
                      <Bot className="size-4 text-lavender" aria-hidden="true" />
                      AI classification
                    </h3>
                    <ClassificationBadge status={item.classificationStatus} />
                  </div>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <Meta label="Sentiment">
                      <SentimentBadge sentiment={item.sentiment} />
                    </Meta>
                    <Meta label="Score">
                      <span className="font-mono tabular">{formatScore(item.sentimentScore)}</span>
                    </Meta>
                    <Meta label="Feature area">{item.featureArea ?? "—"}</Meta>
                    <Meta label="Classified">
                      <span className="font-mono text-xs">{item.classifiedAt ? formatDateTime(item.classifiedAt) : "—"}</span>
                    </Meta>
                  </dl>
                  {item.aiRationale && (
                    <div className="rounded-lg border border-border bg-raised p-3 text-sm leading-relaxed text-foreground/85">
                      <p className="eyebrow mb-1">Rationale</p>
                      {item.aiRationale}
                    </div>
                  )}
                  <div>
                    <p className="eyebrow mb-2">Themes</p>
                    {item.themes.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {item.themes.map((t) => (
                          <li key={t.id}>
                            <ThemeTag name={t.name} color={t.color} confidence={t.confidence} href={`/themes/${t.id}`} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No themes yet.</p>
                    )}
                  </div>
                </section>

                {canEdit && (
                  <>
                    <Separator />
                    <CustomerLabelForm item={item} onSaved={apply} />
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {canEdit && item && (
          <div className="flex flex-wrap justify-between gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={reclassify} loading={reclassifying}>
              {!reclassifying && <RefreshCw aria-hidden="true" />}
              Re-classify
            </Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </div>
        )}
      </SheetContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this feedback?"
        description={<p>It will be removed from every chart, theme, search and future report. This can&apos;t be undone.</p>}
        onConfirm={remove}
      />
    </Sheet>
  );
}

function CustomerLabelForm({ item, onSaved }: { item: Feedback; onSaved: (item: Feedback) => void }) {
  const form = useForm({
    resolver: zodResolver(labelSchema),
    defaultValues: { customerLabel: item.customerLabel ?? "" },
  });

  useEffect(() => {
    form.reset({ customerLabel: item.customerLabel ?? "" });
  }, [item.id, item.customerLabel, form]);

  async function onSubmit(values: { customerLabel?: string }) {
    try {
      const updated = await updateFeedback(item.id, { customerLabel: values.customerLabel ?? null });
      onSaved(updated);
      toast.success(values.customerLabel ? "Customer label saved." : "Customer label cleared.");
    } catch (err) {
      if (toApiError(err).status === 400) applyApiErrors(form, err);
      else toastError(err);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2" noValidate>
        <FormField
          control={form.control}
          name="customerLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer label</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="e.g. Acme Corp (Enterprise)" maxLength={120} {...field} value={field.value ?? ""} />
                </FormControl>
                <Button type="submit" variant="secondary" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>
                  {!form.formState.isSubmitting && <Save aria-hidden="true" />}
                  Save
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading feedback">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
