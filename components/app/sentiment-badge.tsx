import { CircleDashed, Frown, Meh, Smile } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatScore, SENTIMENT_LABELS } from "@/lib/format";
import type { Sentiment } from "@/lib/types";

const META = {
  POS: { variant: "positive", Icon: Smile },
  NEU: { variant: "neutral", Icon: Meh },
  NEG: { variant: "negative", Icon: Frown },
} as const;

export function SentimentBadge({
  sentiment,
  score,
  className,
}: {
  sentiment: Sentiment | null;
  score?: number | null;
  className?: string;
}) {
  if (!sentiment) {
    return (
      <Badge variant="muted" className={className}>
        <CircleDashed aria-hidden="true" />
        Unclassified
      </Badge>
    );
  }
  const { variant, Icon } = META[sentiment];
  return (
    <Badge variant={variant} className={cn("tabular", className)}>
      <Icon aria-hidden="true" />
      {SENTIMENT_LABELS[sentiment]}
      {score !== undefined && score !== null && <span className="font-mono opacity-80">{formatScore(score)}</span>}
    </Badge>
  );
}
