import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex min-h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-panel-strong disabled:opacity-70",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
