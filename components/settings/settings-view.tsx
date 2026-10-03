"use client";

import { useState } from "react";
import { Lock, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { useMe } from "@/components/app/me-provider";
import { PageHeader } from "@/components/app/page-header";
import { RoleBadge } from "@/components/app/status-badge";
import { deleteMember, getMembers, paths, toApiError, updateMember } from "@/lib/api-client";
import { useApi } from "@/lib/hooks/use-api";
import { toastError } from "@/lib/notify";
import { reveal } from "@/lib/reveal";
import { formatDate, ROLE_LABELS } from "@/lib/format";
import type { Member, Role } from "@/lib/types";
import { ROLES } from "@/lib/validators/common";
import { AddMemberDialog } from "./add-member-dialog";

export function SettingsView() {
  const { me, name, email, role, workspaceName, isAdmin, loading } = useMe();
  const r = [1, 2].map(reveal);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Settings" title="Settings" description="Your profile and, for admins, who can access this workspace." />

      <Card className={r[0].className} style={r[0].style}>
        <CardHeader>
          <CardTitle className="text-xl">Profile</CardTitle>
          <CardDescription>Ask an admin to change your role.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !me ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Field label="Name">{name}</Field>
              <Field label="Email">
                <span className="break-all font-mono text-sm">{email}</span>
              </Field>
              <Field label="Role">{role ? <RoleBadge role={role} /> : "—"}</Field>
              <Field label="Workspace">{workspaceName ?? "—"}</Field>
            </dl>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="members-heading" className={`space-y-4 ${r[1].className}`} style={r[1].style}>
        {isAdmin ? (
          <MembersSection myId={me?.id} />
        ) : (
          <div className="surface flex items-start gap-4 p-5">
            <Lock className="mt-0.5 size-4 text-lavender" aria-hidden="true" />
            <div>
              <h2 id="members-heading" className="font-display text-xl font-semibold">
                Members
              </h2>
              <p className="text-sm text-muted-foreground">Only admins can manage members.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-[0.95rem]">{children}</dd>
    </div>
  );
}

function MembersSection({ myId }: { myId?: string }) {
  const { data, error, loading, refetch, setData } = useApi<{ items: Member[] }>(paths.members(), (signal) => getMembers(signal));
  const [saving, setSaving] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<Member | null>(null);

  const replace = (m: Member) => setData((prev) => (prev ? { items: prev.items.map((x) => (x.id === m.id ? m : x)) } : prev));

  async function changeRole(m: Member, role: Role) {
    if (m.role === role) return;
    setSaving(m.id);
    replace({ ...m, role });
    try {
      replace(await updateMember(m.id, { role }));
      toast.success(`${m.name} is now ${ROLE_LABELS[role].toLowerCase()}.`);
    } catch (err) {
      replace(m);
      const e = toApiError(err);
      // 409 = would remove the last admin; show the API's own message.
      if (e.status === 409) toast.error(e.message);
      else toastError(e);
    } finally {
      setSaving(null);
    }
  }

  async function remove() {
    if (!toRemove) return false;
    try {
      await deleteMember(toRemove.id);
      toast.success(`${toRemove.name} removed. Their reports are kept.`);
      setData((prev) => (prev ? { items: prev.items.filter((x) => x.id !== toRemove.id) } : prev));
      return true;
    } catch (err) {
      const e = toApiError(err);
      if (e.status === 409) toast.error(e.message);
      else toastError(e);
      return false;
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="members-heading" className="font-display text-2xl font-bold">
            Members
          </h2>
          <p className="text-sm text-muted-foreground">Everyone with access to this workspace.</p>
        </div>
        <AddMemberDialog onAdded={() => refetch({ silent: true })} />
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : loading || !data ? (
        <div className="surface space-y-3 p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="surface">
          <EmptyState icon={Users} title="No members" description="Add your teammates to collaborate." />
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((m) => {
                const self = m.id === myId;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {m.name}
                      {self && <span className="ml-2 font-mono text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {self ? (
                        <RoleBadge role={m.role} />
                      ) : (
                        <Select value={m.role} onValueChange={(v) => void changeRole(m, v as Role)} disabled={saving === m.id}>
                          <SelectTrigger className="h-8 w-32 text-xs" aria-label={`Role for ${m.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                    <TableCell>
                      {self ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <Button variant="ghost" size="icon" disabled aria-label="You can't remove yourself">
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>You can&apos;t change or remove yourself.</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setToRemove(m)} aria-label={`Remove ${m.name}`}>
                          <Trash2 className="text-destructive" aria-hidden="true" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(o) => !o && setToRemove(null)}
        title={`Remove ${toRemove?.name ?? "member"}?`}
        description={<p>They lose access immediately. Reports they generated are kept.</p>}
        confirmLabel="Remove"
        onConfirm={remove}
      />
    </>
  );
}
