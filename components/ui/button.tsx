import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/85",
        secondary: "border border-border bg-panel text-foreground hover:bg-panel-strong",
        outline: "border border-border bg-white text-foreground hover:bg-panel-strong",
        ghost: "text-muted hover:bg-panel-strong hover:text-foreground",
        soft: "bg-accent-soft text-accent hover:bg-accent-soft/75",
        destructive: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        warning: "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
        link: "min-h-0 rounded-none p-0 text-accent underline-offset-4 hover:underline"
      },
      size: {
        default: "px-4 py-2",
        sm: "min-h-9 rounded-md px-3 py-1.5 text-xs",
        lg: "min-h-11 px-5 py-2.5",
        icon: "h-10 w-10 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
