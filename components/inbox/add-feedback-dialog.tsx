"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Plus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createFeedback, toApiError } from "@/lib/api-client";
import { applyApiErrors } from "@/lib/form-errors";
import { toastError } from "@/lib/notify";
import { CHANNEL_LABELS } from "@/lib/format";
import type { Feedback } from "@/lib/types";
import { CHANNELS } from "@/lib/validators/common";
import { createFeedbackSchema, type CreateFeedbackInput } from "@/lib/validators/feedback";

export function AddFeedbackDialog({ onCreated }: { onCreated: (item: Feedback) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(createFeedbackSchema),
    defaultValues: { content: "", channel: "SUPPORT_TICKET" as const, customerLabel: "", sourceRef: "" },
  });

  async function onSubmit(values: CreateFeedbackInput) {
    try {
      const item = await createFeedback(values);
      toast.success(
        item.classificationStatus === "DONE"
          ? "Feedback added and classified."
          : "Feedback added. Classification will be retried shortly.",
      );
      onCreated(item);
      form.reset();
      setOpen(false);
    } catch (err) {
      const e = toApiError(err);
      // 403 / 5xx / 502 → toast; 400 → inline field errors; anything else → form-level message.
      if (e.status === 403 || e.status >= 500) toastError(e);
      else applyApiErrors(form, e);
    }
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (form.formState.isSubmitting) return;
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          Add feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add feedback</DialogTitle>
          <DialogDescription>LOOP classifies it as soon as you save (this takes a few seconds).</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {rootError && (
              <Alert variant="destructive">
                <CircleAlert className="size-4" aria-hidden="true" />
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Paste what the customer said…" maxLength={5000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHANNELS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CHANNEL_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer label</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" maxLength={120} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="sourceRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source ref (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ZD-48213" maxLength={120} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>A ticket number or URL so you can trace it back.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={form.formState.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding & classifying…" : "Add feedback"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
