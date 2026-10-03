import { cn } from "@/lib/utils";
import { reveal } from "@/lib/reveal";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const r = reveal(0);
  return (
    <header
      className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", r.className, className)}
      style={r.style}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display-wonk break-words font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
          {title}
        </h1>
        {description && <p className="max-w-2xl text-[0.95rem] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
