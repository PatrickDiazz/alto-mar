import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { OwnerBookingRow } from "@/lib/ownerBookingTypes";
import {
  reservationListCardHover,
  reservationListCardSurface,
  reservationListTileWidthClass,
  reservationStatusVariant,
} from "./reservationUi";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import { ReservationThumbnail } from "./ReservationThumbnail";
import { ownerBookingDayDiff } from "@/lib/ownerBookingTypes";

const TAP_MOVE_THRESHOLD_PX = 10;

function useTapLinkHandlers() {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      movedRef.current = false;
    },
    onTouchMove: (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      if (!start) return;
      const touch = e.touches[0];
      if (
        Math.abs(touch.clientX - start.x) > TAP_MOVE_THRESHOLD_PX ||
        Math.abs(touch.clientY - start.y) > TAP_MOVE_THRESHOLD_PX
      ) {
        movedRef.current = true;
      }
    },
    onTouchEnd: () => {
      touchStartRef.current = null;
    },
    onClick: (e: React.MouseEvent) => {
      if (movedRef.current) {
        e.preventDefault();
        movedRef.current = false;
      }
    },
  };
}

export function ReservationListCard({
  booking,
  boatImageUrl,
  dateLabel,
  amountLabel,
  statusLabel,
  to,
  variant = "inline",
  className,
}: {
  booking: OwnerBookingRow;
  boatImageUrl?: string | null;
  dateLabel: string;
  amountLabel: string;
  statusLabel: string;
  to: string;
  variant?: "inline" | "tile";
  className?: string;
}) {
  const tapHandlers = useTapLinkHandlers();
  const statusVariant = reservationStatusVariant(
    booking.status,
    ownerBookingDayDiff(booking.bookingDate)
  );

  const linkClass = cn(
    reservationListCardSurface,
    reservationListCardHover,
    className
  );

  if (variant === "tile") {
    return (
      <Link
        to={to}
        state={{ booking }}
        {...tapHandlers}
        className={cn(
          linkClass,
          reservationListTileWidthClass,
          "flex flex-col gap-2 p-2 text-left"
        )}
      >
        <ReservationThumbnail src={boatImageUrl} className="aspect-video w-full rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12px] font-semibold leading-tight text-foreground">
            {booking.boat.nome}
          </p>
          <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">{booking.renter.nome}</p>
          <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground/90">
            {dateLabel} · {amountLabel}
          </p>
          <ReservationStatusBadge
            label={statusLabel}
            variant={statusVariant}
            className="mt-1.5 px-1.5 py-0 text-[9px]"
          />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      state={{ booking }}
      {...tapHandlers}
      className={cn(
        linkClass,
        "flex w-full items-center gap-2.5 p-2 text-left sm:gap-3 sm:p-2.5",
        className
      )}
    >
      <ReservationThumbnail src={boatImageUrl} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground">
            {booking.boat.nome}
          </p>
          <ReservationStatusBadge
            label={statusLabel}
            variant={statusVariant}
            className="hidden shrink-0 px-1.5 py-0 text-[9px] sm:inline-flex"
          />
        </div>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">{booking.renter.nome}</p>
        <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground/90">
          {dateLabel} · {amountLabel}
        </p>
        <ReservationStatusBadge
          label={statusLabel}
          variant={statusVariant}
          className="mt-1 sm:hidden"
        />
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
