import { query } from "../db.js";

/**
 * Métricas operacionais Stripe Connect (PDF v7).
 */
export async function fetchStripeConnectMetrics() {
  const [
    cancellations,
    ownerCancellations,
    penalties,
    transferSuccess,
    avgTransferTime,
    transferFailures24h,
  ] = await Promise.all([
    query(`
      select count(*)::int as n
      from bookings
      where status = 'CANCELLED'
        and decided_at >= date_trunc('month', now())
    `),
    query(`
      select count(*)::int as n
      from stripe_connect_refunds
      where cancelled_by = 'OWNER'
        and created_at >= date_trunc('month', now())
    `),
    query(`
      select coalesce(sum(penalty_amount_cents), 0)::int as total_cents,
             count(*)::int as n
      from stripe_owner_penalties
      where status in ('DEDUCTED', 'OVERDUE', 'PENDING')
    `),
    query(`
      select
        count(*) filter (where status = 'PAID')::int as paid,
        count(*) filter (where status = 'FAILED')::int as failed,
        count(*)::int as total
      from stripe_connect_transfers
      where requested_at >= date_trunc('month', now())
    `),
    query(`
      select avg(extract(epoch from (paid_at - requested_at)))::float as avg_seconds
      from stripe_connect_transfers
      where status = 'PAID' and paid_at is not null
    `),
    query(`
      select count(*)::int as n
      from stripe_connect_transfers
      where status = 'FAILED' and failed_at >= now() - interval '24 hours'
    `),
  ]);

  const ts = transferSuccess.rows[0];
  const paid = Number(ts?.paid ?? 0);
  const total = Number(ts?.total ?? 0);

  return {
    cancellation_rate_month: Number(cancellations.rows[0]?.n ?? 0),
    owner_cancellation_rate_month: Number(ownerCancellations.rows[0]?.n ?? 0),
    total_penalties_cents: Number(penalties.rows[0]?.total_cents ?? 0),
    total_penalties_count: Number(penalties.rows[0]?.n ?? 0),
    transfer_success_rate:
      total > 0 ? Math.round((paid / total) * 1000) / 10 : null,
    avg_transfer_time_seconds: avgTransferTime.rows[0]?.avg_seconds ?? null,
    transfer_failures_24h: Number(transferFailures24h.rows[0]?.n ?? 0),
  };
}
