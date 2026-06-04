import { authFetch } from "@/lib/auth";

export type RevenueMonthlyPoint = {
  monthKey: string;
  amountCents: number;
};

export type RevenueChartRange = 3 | 6 | 12;

export type OwnerRevenueMonthlyResponse = {
  months: RevenueChartRange;
  points: RevenueMonthlyPoint[];
};

export async function fetchOwnerRevenueMonthly(
  months: RevenueChartRange
): Promise<OwnerRevenueMonthlyResponse> {
  const resp = await authFetch(`/api/owner/revenue/monthly?months=${months}`);
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(msg || "Erro ao carregar faturamento mensal.");
  }
  const data = (await resp.json()) as OwnerRevenueMonthlyResponse;
  return {
    months: data.months,
    points: (data.points ?? []).map((p) => ({
      monthKey: p.monthKey,
      amountCents: Number(p.amountCents ?? 0),
    })),
  };
}

export function formatRevenueMonthShort(monthKey: string, locale: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(y, m - 1, 1));
}

export function formatRevenueMonthLong(monthKey: string, locale: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1)
  );
}

export type RevenueDailyPoint = {
  dayKey: string;
  amountCents: number;
};

export type OwnerRevenueDailyResponse = {
  monthKey: string;
  points: RevenueDailyPoint[];
};

export async function fetchOwnerRevenueDaily(monthKey: string): Promise<OwnerRevenueDailyResponse> {
  const resp = await authFetch(
    `/api/owner/revenue/daily?month=${encodeURIComponent(monthKey)}`
  );
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(msg || "Erro ao carregar faturamento diário.");
  }
  const data = (await resp.json()) as OwnerRevenueDailyResponse;
  return {
    monthKey: data.monthKey,
    points: (data.points ?? []).map((p) => ({
      dayKey: p.dayKey,
      amountCents: Number(p.amountCents ?? 0),
    })),
  };
}

export function formatRevenueDayShort(dayKey: string, locale: string): string {
  const [, , d] = dayKey.split("-").map(Number);
  return String(d);
}

export function formatRevenueDayLong(dayKey: string, locale: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}
