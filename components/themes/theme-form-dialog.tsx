"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTheme, toApiError, updateTheme } from "@/lib/api-client";
import { applyApiErrors } from "@/lib/form-errors";
import { toastError } from "@/lib/notify";
import type { Theme } from "@/lib/types";
import { createThemeSchema, type CreateThemeInput } from "@/lib/validators/themes";

const DEFAULT_COLOR = "#8b5cf6";

/** Create (POST /api/themes) or edit (PATCH /api/themes/[id]) a theme. */
export function ThemeFormDialog({
  open,
  onOpenChange,
  theme,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this theme. */
  theme?: Pick<Theme, "id" | "name" | "description" | "color">;
  onSaved: (theme: Theme) => void;
}) {
  const editing = Boolean(theme);
  const [busy, setBusy] = useState(false);
  const form = useForm({
    resolver: zodResolver(createThemeSchema),
    defaultValues: { name: "", description: "", color: DEFAULT_COLOR },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: theme?.name ?? "",
        description: theme?.description ?? "",
        color: theme?.color ?? DEFAULT_COLOR,
      });
    }
  }, [open, theme, form]);

  async function onSubmit(values: CreateThemeInput) {
    setBusy(true);
    try {
      const saved = theme
        ? await updateTheme(theme.id, {
            name: values.name,
            description: values.description ? values.description : null,
            color: values.color,
          })
        : await createTheme(values);
      toast.success(theme ? "Theme updated." : `Theme "${saved.name}" created.`);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      const e = toApiError(err);
      if (e.status === 400 || e.status === 409) applyApiErrors(form, e);
      else toastError(e);
    } finally {
      setBusy(false);
    }
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{editing ? "Edit theme" : "New theme"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Renaming keeps every tagged item linked."
              : "LOOP will start tagging matching feedback with it on the next classification."}
          </DialogDescription>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input maxLength={40} placeholder="e.g. Billing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} maxLength={300} placeholder="What belongs in this theme?" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>Helps the classifier decide what fits.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marker colour</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      aria-label="Pick marker colour"
                      className="h-9 w-14 cursor-pointer p-1"
                      value={field.value ?? DEFAULT_COLOR}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    <FormControl>
                      <Input className="font-mono" maxLength={7} {...field} value={field.value ?? ""} />
                    </FormControl>
                  </div>
                  <FormDescription>A small identifying dot next to the theme name.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                {editing ? "Save changes" : "Create theme"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
