import { CircleCheck, CircleDot, Eye, Flame, LoaderCircle, ShieldCheck, TriangleAlert, User, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CLASSIFICATION_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/lib/format";
import type { ClassificationStatus, FeedbackStatus, Role } from "@/lib/types";

const STATUS_META = {
  NEW: { variant: "new", Icon: CircleDot },
  REVIEWED: { variant: "reviewed", Icon: Eye },
  ACTIONED: { variant: "actioned", Icon: CircleCheck },
} as const;

export function StatusBadge({ status, className }: { status: FeedbackStatus; className?: string }) {
  const { variant, Icon } = STATUS_META[status];
  return (
    <Badge variant={variant} className={className}>
      <Icon aria-hidden="true" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export const STATUS_ICONS = { NEW: CircleDot, REVIEWED: Eye, ACTIONED: CircleCheck } as const;

/** Only rendered for items that aren't fully classified yet. */
export function ClassificationBadge({ status }: { status: ClassificationStatus }) {
  if (status === "DONE") return null;
  if (status === "PENDING") {
    return (
      <Badge variant="violet">
        <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        {CLASSIFICATION_LABELS.PENDING}
      </Badge>
    );
  }
  return (
    <Badge variant="spike">
      <TriangleAlert aria-hidden="true" />
      {CLASSIFICATION_LABELS.FAILED}
    </Badge>
  );
}

export function SpikeBadge({ className }: { className?: string }) {
  return (
    <Badge variant="spike" className={className}>
      <Flame aria-hidden="true" />
      Spiking
    </Badge>
  );
}

const ROLE_ICONS = { ADMIN: ShieldCheck, ANALYST: UserCog, VIEWER: User } as const;

export function RoleBadge({ role }: { role: Role }) {
  const Icon = ROLE_ICONS[role];
  return (
    <Badge variant={role === "ADMIN" ? "default" : "violet"} className="shadow-none">
      <Icon aria-hidden="true" />
      {ROLE_LABELS[role]}
    </Badge>
  );
}
