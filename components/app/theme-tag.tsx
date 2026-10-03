import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRatio } from "@/lib/format";

/** A theme name with its DB colour as a small identifying marker (never the only signal). */
export function ThemeTag({
  name,
  color,
  confidence,
  href,
  className,
}: {
  name: string;
  color: string;
  confidence?: number;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="truncate">{name}</span>
      {confidence !== undefined && (
        <span className="font-mono text-[0.68rem] text-muted-foreground tabular">{formatRatio(confidence)}</span>
      )}
    </>
  );
  const cls = cn(
    "inline-flex max-w-[12rem] items-center gap-1.5 rounded-md border border-border bg-raised px-1.5 py-0.5 text-xs text-foreground",
    href && "transition-colors hover:border-violet/60 hover:bg-accent",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}
