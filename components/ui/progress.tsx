import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentProps<"div"> & {
  value?: number;
};

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-panel-strong", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      {...props}
    >
      <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}

export { Progress };
