import type { HTMLAttributes } from "react";
import { cn } from "~/lib/utils";

type Variant = "default" | "outline" | "success" | "warning" | "destructive";

const variants: Record<Variant, string> = {
  default: "bg-secondary text-secondary-foreground border-transparent",
  outline: "border-border text-foreground",
  success: "bg-emerald-100 text-emerald-900 border-emerald-200",
  warning: "bg-amber-100 text-amber-900 border-amber-200",
  destructive: "bg-red-100 text-red-900 border-red-200",
};

export function Badge({
  className,
  variant = "default",
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
