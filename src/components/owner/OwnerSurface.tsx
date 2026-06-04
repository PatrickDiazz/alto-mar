import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type OwnerSurfaceVariant = "default" | "subtle" | "ghost";

const variantClass: Record<OwnerSurfaceVariant, string> = {
  default: "rounded-xl border border-border/45 bg-transparent",
  subtle: "rounded-xl border border-border/35 bg-muted/10",
  ghost: "rounded-xl",
};

export function OwnerSurface({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLElement> & { variant?: OwnerSurfaceVariant }) {
  return <section className={cn(variantClass[variant], className)} {...props} />;
}

