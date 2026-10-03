import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Semantic variants: tinted surface + coloured text; always rendered with an icon/label.
        positive: "border-positive/30 bg-positive/10 text-positive",
        neutral: "border-neutral/30 bg-neutral/10 text-neutral",
        negative: "border-negative/30 bg-negative/10 text-negative",
        spike: "border-spike/40 bg-spike/15 text-spike",
        new: "border-status-new/30 bg-status-new/10 text-status-new",
        reviewed: "border-status-reviewed/30 bg-status-reviewed/10 text-status-reviewed",
        actioned: "border-status-actioned/30 bg-status-actioned/10 text-status-actioned",
        muted: "border-border bg-muted text-muted-foreground",
        violet: "border-violet/30 bg-violet/10 text-lavender",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
