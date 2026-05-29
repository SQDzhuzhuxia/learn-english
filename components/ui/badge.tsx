import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent text-white",
        secondary: "border-border bg-panel-strong text-muted",
        outline: "border-border bg-white text-muted",
        soft: "border-transparent bg-accent-soft text-accent",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    },
    defaultVariants: {
      variant: "secondary"
    }
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
