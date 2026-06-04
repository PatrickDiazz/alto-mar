import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OwnerSurface } from "@/components/owner/OwnerSurface";

export function OwnerRevenueStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading = false,
  className,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: "default" | "positive" | "warning" | "danger";
  loading?: boolean;
  className?: string;
}) {
  const toneClass = {
    default: "text-primary",
    positive: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  }[tone];

  return (
    <OwnerSurface
      className={cn(
        "group relative overflow-hidden p-4 transition-all duration-300",
        "hover:border-primary/20 hover:shadow-md hover:shadow-primary/5",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-8 w-28 sm:h-9 sm:w-32" />
          ) : (
            <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
              {value}
            </p>
          )}
          {hint && !loading ? (
            <div className={cn("mt-1 text-[11px] font-medium", toneClass)}>{hint}</div>
          ) : loading ? (
            <Skeleton className="mt-1.5 h-3 w-20" />
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10",
            tone === "positive" && "bg-emerald-500/10",
            tone === "warning" && "bg-amber-500/10",
            tone === "danger" && "bg-red-500/10"
          )}
        >
          <Icon className={cn("h-5 w-5", toneClass)} aria-hidden />
        </div>
      </div>
    </OwnerSurface>
  );
}
