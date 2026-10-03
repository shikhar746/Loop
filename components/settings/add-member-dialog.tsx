"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, UserPlus } from "lucide-react";
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
import { createMember, toApiError } from "@/lib/api-client";
import { applyApiErrors } from "@/lib/form-errors";
import { toastError } from "@/lib/notify";
import { ROLE_LABELS } from "@/lib/format";
import type { Member } from "@/lib/types";
import { ROLES } from "@/lib/validators/common";
import { createMemberSchema, type CreateMemberInput } from "@/lib/validators/members";

const ROLE_HINTS = {
  ADMIN: "Everything, including members and deletions",
  ANALYST: "Ingest, edit, classify, themes and reports",
  VIEWER: "Read-only, plus Ask LOOP",
} as const;

export function AddMemberDialog({ onAdded }: { onAdded: (m: Member) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(createMemberSchema),
    defaultValues: { name: "", email: "", role: "VIEWER" as const, tempPassword: "" },
  });

  async function onSubmit(values: CreateMemberInput) {
    try {
      const m = await createMember(values);
      toast.success(`${m.name} added as ${ROLE_LABELS[m.role].toLowerCase()}. Share the temporary password with them.`);
      onAdded(m);
      form.reset();
      setOpen(false);
    } catch (err) {
      const e = toApiError(err);
      if (e.status === 409) form.setError("email", { message: e.message });
      else if (e.status === 400) applyApiErrors(form, e);
      else toastError(e);
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
          <UserPlus aria-hidden="true" />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add member</DialogTitle>
          <DialogDescription>They sign in with this email and the temporary password you set.</DialogDescription>
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
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{ROLE_HINTS[field.value]}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tempPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>At least 8 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={form.formState.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Add member
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
