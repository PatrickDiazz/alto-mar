import { cn } from "@/lib/utils";
import type { ReservationStatusVariant } from "./reservationUi";
import { reservationStatusTone } from "./reservationUi";

export function ReservationStatusBadge({
  label,
  variant,
  className,
}: {
  label: string;
  variant: ReservationStatusVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        reservationStatusTone(variant),
        className
      )}
    >
      {label}
    </span>
  );
}
