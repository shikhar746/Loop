"use client";

import { CircleAlert, RotateCw, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/notify";
import { toApiError } from "@/lib/api-client";
import { Forbidden } from "./forbidden";

/** Failed fetch: friendly message + Retry. 403 renders the Forbidden panel instead. */
export function ErrorState({
  error,
  onRetry,
  title,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  const e = toApiError(error);
  if (e.status === 403) return <Forbidden className={className} />;
  const ai = e.status === 502;
  const Icon = e.status === 0 ? WifiOff : CircleAlert;
  return (
    <Alert variant={ai ? "default" : "destructive"} className={cn("bg-card", className)}>
      <Icon className="size-4" aria-hidden="true" />
      <AlertTitle>{title ?? (ai ? "AI is temporarily unavailable" : "We couldn't load this")}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{errorMessage(e)}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="self-start sm:self-auto">
            <RotateCw aria-hidden="true" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
