import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "warning" | "success" | "error";

const variantStyles: Record<AlertVariant, { wrap: string; icon: string }> = {
  info: {
    wrap: "border-blue-100 bg-blue-50/80 text-slate-700 dark:border-blue-900/50 dark:bg-blue-950/35 dark:text-foreground/90",
    icon: "text-[#2563EB] dark:text-blue-400",
  },
  warning: {
    wrap: "border-amber-100 bg-amber-50/80 text-slate-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-foreground/90",
    icon: "text-amber-600 dark:text-amber-400",
  },
  success: {
    wrap: "border-emerald-100 bg-emerald-50/80 text-slate-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-foreground/90",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    wrap: "border-red-100 bg-red-50/80 text-slate-700 dark:border-red-900/50 dark:bg-red-950/35 dark:text-foreground/90",
    icon: "text-red-600 dark:text-red-400",
  },
};

type Props = {
  variant?: AlertVariant;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
};

export function RenterBookingAlert({ variant = "info", icon: Icon, children, className }: Props) {
  const styles = variantStyles[variant];
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-relaxed",
        styles.wrap,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
