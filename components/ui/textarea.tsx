import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-panel-strong disabled:opacity-70",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
