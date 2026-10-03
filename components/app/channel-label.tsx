import { Briefcase, Gauge, MessageSquare, MessagesSquare, Star, Ticket, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { channelLabel } from "@/lib/format";
import type { Channel } from "@/lib/types";

export const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  SUPPORT_TICKET: Ticket,
  APP_REVIEW: Star,
  NPS_SURVEY: Gauge,
  SALES_NOTE: Briefcase,
  COMMUNITY: MessagesSquare,
  OTHER: MessageSquare,
};

export function ChannelLabel({ channel, className }: { channel: string; className?: string }) {
  const Icon = CHANNEL_ICONS[channel as Channel] ?? MessageSquare;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground", className)}>
      <Icon className="size-3.5 shrink-0 text-lavender" aria-hidden="true" />
      {channelLabel(channel)}
    </span>
  );
}
