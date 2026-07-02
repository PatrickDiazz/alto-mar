import { bbqKitPriceReais } from "@/lib/trip-optionals";
import type { RenterBooking } from "./renterBookingTypes";

/** Card base — premium hover micro-interaction */
export const RENTER_CARD =
  "rounded-[18px] border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.08)] dark:border-border/70 dark:bg-card dark:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.45)]";

export const RENTER_CARD_COMPACT =
  "rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-border/70 dark:bg-card";

export const RENTER_PAGE_BG = "bg-[#F7F9FC] dark:bg-background";

export const RENTER_HEADER =
  "sticky top-0 z-20 border-b border-slate-200/80 bg-[#F7F9FC]/90 backdrop-blur-md dark:border-border/70 dark:bg-background/90";

export const RENTER_BTN_PRIMARY =
  "bg-[#2563EB] text-white hover:bg-[#1d4ed8] transition-colors duration-200 dark:bg-blue-600 dark:hover:bg-blue-500";

export const RENTER_TEXT_TITLE = "text-slate-900 dark:text-foreground";
export const RENTER_TEXT_MUTED = "text-slate-500 dark:text-muted-foreground";
export const RENTER_TEXT_LABEL = "text-slate-400 dark:text-muted-foreground";
export const RENTER_TEXT_BODY = "text-slate-800 dark:text-foreground";
export const RENTER_TEXT_SUBBODY = "text-slate-700 dark:text-foreground/90";
export const RENTER_TEXT_ACCENT = "text-[#2563EB] dark:text-blue-400";

export const RENTER_SURFACE = "bg-slate-50 dark:bg-muted/40";
export const RENTER_SURFACE_SOFT = "bg-slate-50/50 dark:bg-muted/30";
export const RENTER_SURFACE_ROW = "rounded-xl bg-slate-50 px-4 py-3 dark:bg-muted/40";
export const RENTER_BORDER_DIVIDER = "border-slate-100 dark:border-border/60";

export const RENTER_HISTORY_CARD =
  "group w-full rounded-2xl border bg-white p-3 text-left dark:bg-card";

export const RENTER_HISTORY_CARD_SELECTED =
  "border-[#2563EB]/40 ring-2 ring-[#2563EB]/20 shadow-sm dark:border-blue-500/40 dark:ring-blue-500/25";

export const RENTER_HISTORY_CARD_DEFAULT =
  "border-slate-200/80 shadow-[0_1px_6px_-1px_rgba(15,23,42,0.06)] dark:border-border/70";

export const RENTER_IMAGE_PLACEHOLDER = "bg-slate-100 dark:bg-muted";

export const RENTER_STEPPER_BTN =
  "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5 hover:text-[#2563EB] disabled:opacity-40 dark:border-border dark:bg-card dark:text-foreground dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400";

export const RENTER_BADGE_PAID =
  "inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800/60";

export const RENTER_EMPTY_STATE =
  "rounded-[18px] border border-slate-200/80 bg-white p-12 text-center shadow-sm dark:border-border/70 dark:bg-card dark:shadow-none";

export const RENTER_BANNER_PENDING =
  "rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200";

export const RENTER_RESCHEDULE_CARD =
  "border-amber-100 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/25";

export const RENTER_CANCEL_BOX =
  "w-full space-y-3 rounded-2xl border border-red-100 bg-red-50/40 p-4 dark:border-red-900/50 dark:bg-red-950/30";

export const RENTER_ROUTE_STOP =
  "w-full rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-border/60 dark:bg-muted/40 dark:text-foreground dark:hover:border-border dark:hover:bg-card";

export const RENTER_OPTIONAL_CHECKED =
  "border-[#2563EB]/40 bg-[#2563EB]/5 shadow-sm ring-1 ring-[#2563EB]/20 dark:border-blue-500/40 dark:bg-blue-500/10 dark:ring-blue-500/25";

export const RENTER_OPTIONAL_DEFAULT =
  "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-border/70 dark:bg-muted/30 dark:hover:border-border dark:hover:bg-card";

export const RENTER_RADIO_LABEL =
  "flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm transition-colors hover:border-[#2563EB]/30 dark:border-border/70 dark:bg-card dark:hover:border-blue-500/40";

export const RENTER_PROGRESS_TRACK = "bg-slate-100 dark:bg-muted";
export const RENTER_PROGRESS_FILL = "bg-[#2563EB] dark:bg-blue-500";

export const RENTER_CALENDAR_WRAP =
  "overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-3 dark:border-border/60 dark:bg-muted/30";

export const RENTER_SELECT_TRIGGER = "rounded-xl border-slate-200 bg-white dark:border-border dark:bg-card";

export const RENTER_PRIMARY = "#2563EB";

export type BookingStatusTone = "pending" | "confirmed" | "done" | "cancelled" | "neutral";

export function bookingStatusTone(status: string): BookingStatusTone {
  if (status === "PENDING") return "pending";
  if (status === "ACCEPTED") return "confirmed";
  if (status === "COMPLETED") return "done";
  if (status === "CANCELLED" || status === "DECLINED") return "cancelled";
  return "neutral";
}

export function statusBadgeClasses(tone: BookingStatusTone): string {
  switch (tone) {
    case "pending":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/45 dark:text-amber-300 dark:ring-amber-800/50";
    case "confirmed":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/45 dark:text-emerald-300 dark:ring-emerald-800/50";
    case "done":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 dark:bg-muted dark:text-muted-foreground dark:ring-border/80";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-1 ring-red-200/80 dark:bg-red-950/45 dark:text-red-300 dark:ring-red-800/50";
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 dark:bg-muted dark:text-muted-foreground dark:ring-border/80";
  }
}

export function statusLabelKey(status: string): string {
  if (status === "PENDING") return "reservasConta.statusPending";
  if (status === "ACCEPTED") return "reservasConta.statusAccepted";
  if (status === "COMPLETED") return "reservasConta.statusDoneBadge";
  if (status === "CANCELLED") return "reservasConta.statusCancelledBadge";
  if (status === "DECLINED") return "reservasConta.statusDeclinedBadge";
  return "reservasConta.statusOther";
}

export function isPaid(booking: RenterBooking): boolean {
  if (booking.paymentProvider === "STRIPE" && booking.paymentStatus === "APPROVED") return true;
  if (booking.paymentProvider === "MERCADOPAGO" && booking.paymentStatus === "APPROVED") return true;
  return false;
}

export function paymentMethodLabel(
  booking: RenterBooking,
  t: (k: string) => string
): string {
  if (!booking.paymentProvider) return t("reservasConta.paymentPending");
  if (booking.paymentProvider === "STRIPE") return t("reservasConta.paymentStripe");
  if (booking.paymentProvider === "MERCADOPAGO") return t("reservasConta.paymentMercadoPago");
  return booking.paymentProvider;
}

export function financialBreakdown(booking: RenterBooking) {
  const bbqReais = bbqKitPriceReais({
    bbqOffered: true,
    bbqKitPriceCents: booking.boat.bbqKitPriceCents,
  });
  const jetReais =
    booking.boat.jetSkiOffered && booking.jetSki
      ? Number(booking.boat.jetSkiPriceCents || 0) / 100
      : 0;
  const extrasReais =
    (booking.bbqKit ? bbqReais : 0) + jetReais;
  const tripReais = Math.max(0, booking.totalCents / 100 - extrasReais);
  return {
    tripReais,
    extrasReais,
    serviceFeeReais: 0,
    totalReais: booking.totalCents / 100,
  };
}

export type TimelineStepId = "created" | "confirmation" | "payment" | "trip" | "done";

export type TimelineStep = {
  id: TimelineStepId;
  active: boolean;
  completed: boolean;
  date?: string | null;
};

export function buildTimelineSteps(booking: RenterBooking): TimelineStep[] {
  const { status, createdAt, bookingDate } = booking;
  const paid = isPaid(booking);

  const cancelled = status === "CANCELLED" || status === "DECLINED";

  const createdDone = true;
  const paymentDone = paid || status === "COMPLETED";
  const paymentActive = !paymentDone && (status === "PENDING" || status === "ACCEPTED");
  const confirmationDone = status === "ACCEPTED" || status === "COMPLETED";
  const confirmationActive = status === "PENDING" && paid;
  const tripDone = status === "COMPLETED";
  const tripActive = status === "ACCEPTED" && paid;
  const doneDone = status === "COMPLETED";

  if (cancelled) {
    return [
      { id: "created", active: false, completed: true, date: createdAt },
      { id: "payment", active: !paid && status === "PENDING", completed: paid, date: null },
      {
        id: "confirmation",
        active: status === "PENDING",
        completed: status !== "PENDING",
        date: null,
      },
      { id: "trip", active: false, completed: false, date: bookingDate },
      { id: "done", active: true, completed: false, date: null },
    ];
  }

  return [
    { id: "created", active: false, completed: createdDone, date: createdAt },
    {
      id: "payment",
      active: paymentActive,
      completed: paymentDone,
      date: null,
    },
    {
      id: "confirmation",
      active: confirmationActive,
      completed: confirmationDone,
      date: confirmationDone ? createdAt : null,
    },
    {
      id: "trip",
      active: tripActive,
      completed: tripDone,
      date: bookingDate,
    },
    { id: "done", active: false, completed: doneDone, date: null },
  ];
}

export function routeStopEmoji(index: number, total: number): string {
  if (index === 0) return "📍";
  if (index === total - 1) return "⚓";
  return "🏝";
}
