/** Normaliza data da API (YYYY-MM-DD ou ISO) para Date local. */
export function parseOwnerRevenueYmd(value: string): Date {
  const ymd = String(value).slice(0, 10);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
