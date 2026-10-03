import { cn } from "@/lib/utils";

/** The LOOP wordmark: Fraunces black with the second O as a lime ring (the loop). */
export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <span
      className={cn("display-wonk inline-flex items-baseline font-display font-black tracking-tight", text, className)}
      aria-label="LOOP"
      role="img"
    >
      <span aria-hidden="true">LO</span>
      <span
        aria-hidden="true"
        className="mx-[0.04em] inline-block size-[0.62em] translate-y-[0.02em] rounded-full border-[0.14em] border-primary shadow-[0_0_14px_hsl(var(--primary)/0.55)]"
      />
      <span aria-hidden="true">P</span>
    </span>
  );
}
