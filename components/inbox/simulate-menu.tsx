"use client";

import { useState } from "react";
import { ChevronDown, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHANNEL_ICONS } from "@/components/app/channel-label";
import { simulateFeedback } from "@/lib/api-client";
import { toastError } from "@/lib/notify";
import { CHANNEL_LABELS } from "@/lib/format";
import type { Channel } from "@/lib/types";
import { CHANNELS } from "@/lib/validators/common";

const SIMULATE_COUNT = 10;

/** Generates 10 realistic items on a channel, then hands off to the classify loop. */
export function SimulateMenu({ onSimulated, disabled }: { onSimulated: () => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function simulate(channel: Channel) {
    setBusy(true);
    try {
      const r = await simulateFeedback({ channel, count: SIMULATE_COUNT });
      toast.success(`${r.created} new ${CHANNEL_LABELS[channel].toLowerCase()} items arrived. Classifying…`);
      onSimulated();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" loading={busy} disabled={disabled}>
          {!busy && <Radio aria-hidden="true" />}
          Simulate channel
          <ChevronDown className="opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Send {SIMULATE_COUNT} items from…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CHANNELS.map((c) => {
          const Icon = CHANNEL_ICONS[c];
          return (
            <DropdownMenuItem key={c} onSelect={() => void simulate(c)}>
              <Icon className="text-lavender" aria-hidden="true" />
              {CHANNEL_LABELS[c]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
