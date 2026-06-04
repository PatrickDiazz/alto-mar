import { cn } from "@/lib/utils";
import { formatDeltaPct } from "@/lib/ownerRevenuePeriod";

export function OwnerRevenueDelta({
  pct,
  className,
}: {
  pct: number;
  className?: string;
}) {
  const { text, positive } = formatDeltaPct(pct);
  return (
    <span
      className={cn(
        "text-[11px] font-medium tabular-nums",
        positive ? "text-emerald-500" : "text-red-500",
        className
      )}
    >
      {text}
    </span>
  );
}
