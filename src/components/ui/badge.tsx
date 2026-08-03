import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "success" | "warning" | "muted" | "destructive";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-teal-100 text-teal-800",
        variant === "success" && "bg-emerald-100 text-emerald-800",
        variant === "warning" && "bg-amber-100 text-amber-900",
        variant === "muted" && "bg-stone-100 text-stone-600",
        variant === "destructive" && "bg-red-100 text-red-800",
        className
      )}
      {...props}
    />
  );
}
