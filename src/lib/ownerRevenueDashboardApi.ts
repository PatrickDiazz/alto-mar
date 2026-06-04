import { authFetch } from "@/lib/auth";
import type { OwnerRevenuePeriodFilter } from "@/lib/ownerRevenuePeriod";
import { periodQueryString } from "@/lib/ownerRevenuePeriod";

export type RevenueSourceSegmentId = "boats" | "optionals";

export type OwnerRevenueSourceSegment = {
  id: RevenueSourceSegmentId;
  amountCents: number;
  transactionCount: number;
  pct: number;
};

export type OwnerRevenueBoatBreakdown = {
  id: string;
  name: string;
  amountCents: number;
  tripCount: number;
  pct: number;
};

export type OwnerRevenueOptionalBreakdown = {
  id: string;
  name: string;
  amountCents: number;
  requestCount: number;
  pct: number;
};

export type OwnerRevenueBySource = {
  segments: OwnerRevenueSourceSegment[];
  boats: OwnerRevenueBoatBreakdown[];
  optionals: OwnerRevenueOptionalBreakdown[];
};

export type OwnerRevenueDashboard = {
  period: { preset: string; from: string; to: string };
  previousPeriod: { from: string; to: string };
  financial: {
    grossCents: number;
    discountsCents: number;
    platformFeesCents: number;
    netCents: number;
    grossDeltaPct: number;
    netDeltaPct: number;
    platformFeesDeltaPct: number;
    discountsDeltaPct: number;
  };
  revenueBySource: OwnerRevenueBySource;
  summary: {
    completedBookings: number;
    completedBookingsDeltaPct: number;
    occupancyPct: number;
    occupancyDeltaPct: number;
    avgTicketCents: number;
    avgTicketDeltaPct: number;
    revenuePerBoatCents: number;
    revenuePerBoatDeltaPct: number;
  };
  stats: {
    pendingReceiveCents: number;
    cancellations: number;
    revenueTotalCents: number;
  };
  chart: {
    granularity: "day" | "month";
    points: { pointKey: string; amountCents: number }[];
  };
};

export async function fetchOwnerRevenueDashboard(
  filter: OwnerRevenuePeriodFilter
): Promise<OwnerRevenueDashboard> {
  const resp = await authFetch(`/api/owner/revenue/dashboard?${periodQueryString(filter)}`);
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(msg || "Erro ao carregar faturamento.");
  }
  return (await resp.json()) as OwnerRevenueDashboard;
}
