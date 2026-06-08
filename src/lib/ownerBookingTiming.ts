import type { ReservationStatusVariant } from "@/components/owner/reservations/reservationUi";
import { reservationStatusVariant } from "@/components/owner/reservations/reservationUi";
import { ownerBookingDayDiff, type OwnerBookingRow } from "@/lib/ownerBookingTypes";
import { cn } from "@/lib/utils";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** Dias até ao passeio: dias (≤7), semanas (8–30), meses (>30). */
export function formatBookingCountdown(dayDiff: number, t: TranslateFn): string {
  if (dayDiff <= 7) {
    return t("ownerBooking.countdownDays", { count: dayDiff });
  }
  if (dayDiff <= 30) {
    const weeks = Math.max(1, Math.ceil(dayDiff / 7));
    return t("ownerBooking.countdownWeeks", { count: weeks });
  }
  const months = Math.max(1, Math.ceil(dayDiff / 30));
  return t("ownerBooking.countdownMonths", { count: months });
}

export function ownerBookingCountdownLabel(
  booking: Pick<OwnerBookingRow, "bookingDate" | "status">,
  t: TranslateFn
): string | null {
  const dayDiff = ownerBookingDayDiff(booking.bookingDate);
  if (dayDiff === null || dayDiff <= 0) return null;
  if (booking.status !== "PENDING" && booking.status !== "ACCEPTED") return null;
  return formatBookingCountdown(dayDiff, t);
}

export function ownerBookingStatusVariant(
  booking: Pick<OwnerBookingRow, "status" | "bookingDate">
): ReservationStatusVariant {
  return reservationStatusVariant(booking.status, ownerBookingDayDiff(booking.bookingDate));
}

/** Rótulo de status com «Em curso» só para passeios confirmados hoje. */
export function ownerBookingStatusDisplayLabel(
  booking: Pick<OwnerBookingRow, "status" | "bookingDate">,
  t: TranslateFn
): string {
  const variant = ownerBookingStatusVariant(booking);
  if (variant === "inProgress") return t("ownerBooking.statusInProgress");
  if (variant === "confirmed") return t("ownerReservas.statusConfirmed");
  if (variant === "overdue") return t("marinheiro.acceptedOverdueBadge");
  return t(`ownerAgenda.status.${booking.status}`);
}

export function ownerBookingWhenWithCountdown(
  whenLabel: string,
  booking: Pick<OwnerBookingRow, "bookingDate" | "status">,
  t: TranslateFn
): string {
  const countdown = ownerBookingCountdownLabel(booking, t);
  if (!countdown) return whenLabel;
  return `${whenLabel} · ${countdown}`;
}

/** Destaque visual do countdown — contrasta com cards âmbar (pendente). */
export function ownerBookingCountdownBadgeClass(dayDiff: number): string {
  if (dayDiff <= 3) {
    return "bg-orange-500/25 text-orange-950 ring-1 ring-orange-500/40 dark:bg-orange-400/20 dark:text-orange-100 dark:ring-orange-400/45";
  }
  if (dayDiff <= 7) {
    return "bg-sky-500/25 text-sky-950 ring-1 ring-sky-500/40 dark:bg-sky-400/20 dark:text-sky-100 dark:ring-sky-400/45";
  }
  return "bg-violet-500/20 text-violet-950 ring-1 ring-violet-500/35 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/40";
}

export function ownerBookingPreviewSurfaceClass(
  booking: Pick<OwnerBookingRow, "status" | "bookingDate">,
  interactive = true
): string {
  const variant = ownerBookingStatusVariant(booking);
  if (variant === "inProgress") {
    return cn(
      "border-emerald-500/45 bg-emerald-500/10",
      interactive && "hover:bg-emerald-500/15"
    );
  }
  if (variant === "confirmed") {
    return cn(
      "border-primary/25 bg-primary/5",
      interactive && "hover:bg-primary/10"
    );
  }
  if (variant === "pending") {
    return cn(
      "border-amber-500/35 bg-amber-500/8",
      interactive && "hover:bg-amber-500/12"
    );
  }
  if (variant === "overdue") {
    return cn(
      "border-amber-600/40 bg-amber-500/10",
      interactive && "hover:bg-amber-500/15"
    );
  }
  return cn("border-border/35 bg-muted/15", interactive && "hover:bg-muted/30");
}

export function ownerBookingListCardSurfaceClass(
  booking: Pick<OwnerBookingRow, "status" | "bookingDate">
): string {
  const variant = ownerBookingStatusVariant(booking);
  if (variant === "inProgress") {
    return "border-emerald-500/40 bg-emerald-500/[0.07]";
  }
  if (variant === "confirmed") {
    return "border-border/35 bg-transparent";
  }
  if (variant === "pending") {
    return "border-amber-500/30 bg-amber-500/[0.06]";
  }
  return "";
}
