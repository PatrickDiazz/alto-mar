import { useTranslation } from "react-i18next";
import {
  ownerBookingCountdownBadgeClass,
  ownerBookingCountdownLabel,
} from "@/lib/ownerBookingTiming";
import { ownerBookingDayDiff, type OwnerBookingRow } from "@/lib/ownerBookingTypes";
import { cn } from "@/lib/utils";

export function BookingCountdownBadge({
  booking,
  className,
}: {
  booking: Pick<OwnerBookingRow, "bookingDate" | "status">;
  className?: string;
}) {
  const { t } = useTranslation();
  const dayDiff = ownerBookingDayDiff(booking.bookingDate);
  const label = ownerBookingCountdownLabel(booking, t);
  if (!label || dayDiff === null || dayDiff <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none tracking-tight sm:text-[10px]",
        ownerBookingCountdownBadgeClass(dayDiff),
        className
      )}
    >
      {label}
    </span>
  );
}

export function OwnerBookingWhenAmountLine({
  whenLabel,
  amountLabel,
  booking,
  className,
  textClassName = "text-muted-foreground/90",
}: {
  whenLabel: string;
  amountLabel: string;
  booking: Pick<OwnerBookingRow, "bookingDate" | "status">;
  className?: string;
  textClassName?: string;
}) {
  const countdown = <BookingCountdownBadge booking={booking} />;

  return (
    <p className={cn("flex min-w-0 flex-wrap items-center gap-1", className)}>
      <span className={cn("truncate", textClassName)}>{whenLabel}</span>
      {countdown ? (
        <>
          <span className="shrink-0 text-muted-foreground/35" aria-hidden>
            ·
          </span>
          {countdown}
        </>
      ) : null}
      <span className="shrink-0 text-muted-foreground/35" aria-hidden>
        ·
      </span>
      <span className={cn("truncate", textClassName)}>{amountLabel}</span>
    </p>
  );
}
