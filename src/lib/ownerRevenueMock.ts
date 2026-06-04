export type RevenueUpcomingPayout = {
  id: string;
  date: string;
  amountCents: number;
  status: "scheduled" | "processing";
};

export const OWNER_REVENUE_SUMMARY = {
  monthRevenueCents: 1_245_000,
  monthDeltaPct: 18,
  confirmedBookings: 8,
  pendingReceiveCents: 320_000,
  cancellations: 1,
};

export const OWNER_REVENUE_UPCOMING: RevenueUpcomingPayout[] = [
  { id: "u1", date: "2026-07-12", amountCents: 250_000, status: "scheduled" },
  { id: "u2", date: "2026-07-15", amountCents: 180_000, status: "scheduled" },
  { id: "u3", date: "2026-07-20", amountCents: 340_000, status: "processing" },
];
