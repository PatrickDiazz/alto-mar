import { ChevronRight } from "lucide-react";
import { OwnerBookingWhenAmountLine } from "@/components/owner/bookings/BookingCountdownBadge";
import { reservationStatusTone } from "@/components/owner/reservations/reservationUi";
import {
  ownerBookingPreviewSurfaceClass,
  ownerBookingStatusVariant,
} from "@/lib/ownerBookingTiming";
import { cn } from "@/lib/utils";
import type { OwnerBookingRow } from "@/lib/ownerBookingTypes";

export function OwnerBookingCompactRow({
  booking,
  whenLabel,
  statusLabel,
  amountLabel,
  onClick,
  className,
}: {
  booking: OwnerBookingRow;
  whenLabel: string;
  statusLabel: string;
  amountLabel: string;
  onClick: () => void;
  className?: string;
}) {
  const statusVariant = ownerBookingStatusVariant(booking);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        ownerBookingPreviewSurfaceClass(booking),
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{booking.boat.nome}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              reservationStatusTone(statusVariant)
            )}
          >
            {statusLabel}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{booking.renter.nome}</p>
        <OwnerBookingWhenAmountLine
          className="mt-0.5 text-[11px] leading-tight"
          whenLabel={whenLabel}
          amountLabel={amountLabel}
          booking={booking}
        />
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

export function OwnerBookingPreviewStrip({
  booking,
  whenLabel,
  statusLabel,
  amountLabel,
  onClick,
  className,
}: {
  booking: OwnerBookingRow;
  whenLabel: string;
  statusLabel: string;
  amountLabel: string;
  onClick?: () => void;
  className?: string;
}) {
  const statusVariant = ownerBookingStatusVariant(booking);
  const surfaceClass = ownerBookingPreviewSurfaceClass(booking, Boolean(onClick));

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{booking.renter.nome}</p>
        <OwnerBookingWhenAmountLine
          className="mt-0.5 text-[11px] leading-tight"
          textClassName="text-muted-foreground"
          whenLabel={whenLabel}
          amountLabel={amountLabel}
          booking={booking}
        />
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
          reservationStatusTone(statusVariant)
        )}
      >
        {statusLabel}
      </span>
      {onClick ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors", surfaceClass, className)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("rounded-lg border px-2.5 py-2", surfaceClass, className)}>
      {content}
    </div>
  );
}
