export type OwnerBookingRow = {
  id: string;
  status: string;
  bookingDate?: string;
  createdAt?: string;
  decidedAt?: string | null;
  stripeFlowStatus?: string | null;
  paymentProvider?: string | null;
  paymentStatus?: string | null;
  ownerNetCents?: number | null;
  passengersAdults: number;
  passengersChildren: number;
  hasKids: boolean;
  bbqKit: boolean;
  jetSki?: boolean;
  embarkLocation: string | null;
  embarkTime?: string | null;
  totalCents: number;
  routeIslands?: string[];
  decisionNote?: string | null;
  boat: { id: string; nome: string; jetSkiOffered?: boolean; jetSkiPriceCents?: number };
  renter: { id: string; nome: string; email: string };
  ratingRenter?: { stars: number; comment: string | null; ratedAt: string } | null;
  rescheduleReason?: string | null;
  rescheduleTitle?: string | null;
  rescheduleNote?: string | null;
  rescheduleAttachments?: string[];
};

export type OwnerBookingPaymentDetail = {
  id: string;
  provider: string | null;
  status: string | null;
  amountCents: number;
  paidAt: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  receiptUrl: string | null;
  transferStatus: string | null;
  transferPaidAt: string | null;
};

export type OwnerBookingDetailResponse = {
  booking: OwnerBookingRow;
  payment: OwnerBookingPaymentDetail | null;
  stripeEnabled: boolean;
};

/** >0 futuro, 0 hoje, <0 passado; null sem data válida. */
export function ownerBookingDayDiff(yyyyMmDd: string | undefined): number | null {
  if (!yyyyMmDd) return null;
  const parts = String(yyyyMmDd)
    .split("-")
    .map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export function ownerBookingYmd(b: Pick<OwnerBookingRow, "bookingDate">): string {
  return String(b.bookingDate || "").slice(0, 10);
}

const ACTIVE_UPCOMING_STATUSES = new Set(["PENDING", "ACCEPTED"]);

/** Reservas pendentes ou aceites com data hoje ou futura, ordenadas por data e horário. */
export function ownerUpcomingActiveBookings(
  bookings: OwnerBookingRow[],
  limit?: number
): OwnerBookingRow[] {
  const sorted = bookings
    .filter((b) => {
      if (!ACTIVE_UPCOMING_STATUSES.has(b.status)) return false;
      const d = ownerBookingDayDiff(b.bookingDate);
      return d === null || d >= 0;
    })
    .sort((a, b) => {
      const cmp = ownerBookingYmd(a).localeCompare(ownerBookingYmd(b));
      if (cmp !== 0) return cmp;
      return (a.embarkTime || "").localeCompare(b.embarkTime || "");
    });
  return limit != null ? sorted.slice(0, limit) : sorted;
}

export function ownerBookingPreviewForBoat(
  bookings: OwnerBookingRow[],
  boatId: string
): OwnerBookingRow | null {
  const forBoat = bookings.filter((b) => b.boat.id === boatId);
  const active = ownerUpcomingActiveBookings(forBoat, 1);
  if (active.length > 0) return active[0];
  return (
    [...forBoat].sort((a, b) => ownerBookingYmd(b).localeCompare(ownerBookingYmd(a)))[0] ?? null
  );
}

export type OwnerBookingListTier = "highlight" | "summary" | "archived";

export type OwnerBookingStatusFilter =
  | "ALL"
  | "PENDING"
  | "ACCEPTED"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED";

export function ownerBookingListTier(status: string): OwnerBookingListTier {
  if (status === "PENDING" || status === "ACCEPTED") return "highlight";
  if (status === "COMPLETED") return "summary";
  return "archived";
}
