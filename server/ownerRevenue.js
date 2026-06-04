import { query } from "./db.js";

const ALLOWED_RANGES = [3, 6, 12];

/**
 * @param {number} months
 */
export function normalizeRevenueChartMonths(months) {
  const n = Number(months);
  return ALLOWED_RANGES.includes(n) ? n : 6;
}

/**
 * @param {string} ownerUserId
 * @param {number} monthsCount 3 | 6 | 12
 */
export async function buildOwnerRevenueMonthly(ownerUserId, monthsCount) {
  const months = normalizeRevenueChartMonths(monthsCount);

  const aggRes = await query(
    `select
       to_char(date_trunc('month', bk.booking_date), 'YYYY-MM') as month_key,
       coalesce(sum(bk.total_cents), 0)::bigint as amount_cents
     from bookings bk
     where bk.owner_user_id = $1
       and bk.status = 'COMPLETED'
       and bk.booking_date >= date_trunc('month', current_date - ($2::int - 1) * interval '1 month')::date
     group by 1
     order by 1`,
    [ownerUserId, months]
  );

  const byKey = new Map(
    aggRes.rows.map((r) => [String(r.month_key), Number(r.amount_cents ?? 0)])
  );

  const points = [];
  const anchor = new Date();
  const startYear = anchor.getFullYear();
  const startMonth = anchor.getMonth();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(startYear, startMonth - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    points.push({
      monthKey,
      amountCents: byKey.get(monthKey) ?? 0,
    });
  }

  return { months, points };
}

/**
 * @param {string} monthKey YYYY-MM
 */
export function parseRevenueMonthKey(monthKey) {
  const m = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * @param {string} ownerUserId
 * @param {string} monthKey YYYY-MM
 */
export async function buildOwnerRevenueDaily(ownerUserId, monthKey) {
  const parsed = parseRevenueMonthKey(monthKey);
  if (!parsed) {
    throw new Error("Mês inválido.");
  }

  const monthStart = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-01`;

  const aggRes = await query(
    `select
       to_char(bk.booking_date, 'YYYY-MM-DD') as day_key,
       coalesce(sum(bk.total_cents), 0)::bigint as amount_cents
     from bookings bk
     where bk.owner_user_id = $1
       and bk.status = 'COMPLETED'
       and bk.booking_date >= $2::date
       and bk.booking_date < ($2::date + interval '1 month')::date
     group by 1
     order by 1`,
    [ownerUserId, monthStart]
  );

  const byDay = new Map(
    aggRes.rows.map((r) => [String(r.day_key), Number(r.amount_cents ?? 0)])
  );

  const daysInMonth = new Date(parsed.year, parsed.month, 0).getDate();
  const points = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayKey = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    points.push({
      dayKey,
      amountCents: byDay.get(dayKey) ?? 0,
    });
  }

  return { monthKey, points };
}
