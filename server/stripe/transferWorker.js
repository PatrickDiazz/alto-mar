import { pool, query } from "../db.js";
import { getStripe } from "./client.js";
import { assertOwnerConnectReady } from "./connectStatus.js";
import { deductPendingPenaltiesInTx } from "./penalties.js";
import { StripeFlowStatus } from "./flowStatus.js";

export const TRANSFER_MAX_RETRIES = Number(process.env.STRIPE_TRANSFER_MAX_RETRIES ?? 5);

/** Minutos de backoff por tentativa (PDF v7: retry exponencial). */
export const TRANSFER_BACKOFF_MINUTES = [1, 5, 15, 60, 120];

/**
 * @param {number} retryCount
 */
export function transferNextRetryAt(retryCount) {
  const idx = Math.min(Math.max(0, retryCount), TRANSFER_BACKOFF_MINUTES.length - 1);
  const mins = TRANSFER_BACKOFF_MINUTES[idx];
  return new Date(Date.now() + mins * 60_000);
}

/**
 * Executa transferência Stripe Connect para uma linha PENDING/FAILED elegível.
 * @param {string} transferRowId
 * @returns {Promise<{ ok: boolean; transferId?: string; skipped?: boolean; error?: string }>}
 */
export async function executeStripeTransfer(transferRowId) {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "STRIPE_DISABLED" };
  }

  const client = await pool.connect();
  let bookingId;
  let ownerNetCents;
  let ownerStripe;
  let stripeChargeId;
  let ownerUserId;
  let penaltyDeducted = 0;

  try {
    await client.query("BEGIN");

    const tr = await client.query(
      `select t.*, bk.stripe_flow_status, bk.owner_net_cents as bk_owner_net,
              u.stripe_connect_account_id,
              p.stripe_charge_id
       from stripe_connect_transfers t
       join bookings bk on bk.id = t.booking_id
       join users u on u.id = t.owner_user_id
       join payments p on p.booking_id = t.booking_id and p.provider = 'STRIPE' and p.status = 'APPROVED'
       where t.id = $1::uuid
         and t.status in ('PENDING', 'FAILED')
         and t.retry_count < $2
         and (t.next_retry_at is null or t.next_retry_at <= now())
       for update of t`,
      [transferRowId, TRANSFER_MAX_RETRIES]
    );
    const row = tr.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: true, skipped: true };
    }

    bookingId = row.booking_id;
    ownerUserId = row.owner_user_id;
    ownerStripe = row.stripe_connect_account_id;
    stripeChargeId = row.stripe_charge_id;
    ownerNetCents = Number(row.amount_cents);

    if (!ownerStripe || !stripeChargeId) {
      await client.query("ROLLBACK");
      return { ok: false, error: "MISSING_CHARGE_OR_ACCOUNT" };
    }

    await assertOwnerConnectReady(stripe, ownerStripe);

    penaltyDeducted = await deductPendingPenaltiesInTx(
      client,
      ownerUserId,
      transferRowId,
      ownerNetCents
    );
    const transferAmount = Math.max(1, ownerNetCents - penaltyDeducted);

    await client.query(
      `update stripe_connect_transfers
       set status = 'PROCESSING',
           penalty_deducted_cents = $2,
           updated_at = now()
       where id = $1::uuid`,
      [transferRowId, penaltyDeducted]
    );
    await client.query(
      `update bookings set stripe_flow_status = $2 where id = $1::uuid`,
      [bookingId, StripeFlowStatus.TRANSFER_PROCESSING]
    );

    await client.query("COMMIT");

    const idempotencyKey = `stripe_transfer_${transferRowId}`;

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: transferAmount,
          currency: "brl",
          destination: ownerStripe,
          source_transaction: stripeChargeId,
          transfer_group: `booking_${bookingId}`,
          metadata: {
            booking_id: bookingId,
            transfer_row_id: String(transferRowId),
            release_reason: "tour_started",
            penalty_deducted_cents: String(penaltyDeducted),
          },
        },
        { idempotencyKey }
      );

      await query(
        `update stripe_connect_transfers
         set stripe_transfer_id = $2,
             status = 'PROCESSING',
             amount_cents = $3,
             updated_at = now()
         where id = $1::uuid`,
        [transferRowId, transfer.id, transferAmount]
      );

      return { ok: true, transferId: transfer.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryCount = Number(row.retry_count) + 1;
      const failed = retryCount >= TRANSFER_MAX_RETRIES;
      await query(
        `update stripe_connect_transfers
         set status = $2,
             retry_count = $3,
             last_error = $4,
             failed_at = case when $5::boolean then now() else failed_at end,
             next_retry_at = $6,
             updated_at = now()
         where id = $1::uuid`,
        [
          transferRowId,
          failed ? "FAILED" : "PENDING",
          retryCount,
          msg,
          failed,
          failed ? null : transferNextRetryAt(retryCount),
        ]
      );
      await query(
        `update bookings set stripe_flow_status = $2 where id = $1::uuid`,
        [bookingId, failed ? StripeFlowStatus.TRANSFER_FAILED : StripeFlowStatus.TRANSFER_PENDING]
      );
      return { ok: false, error: msg };
    }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    client.release();
  }
}

/**
 * Processa fila de transferências pendentes (PostgreSQL; PDF v7 — alternativa a Redis).
 * @param {{ limit?: number }} [opts]
 */
export async function processTransferQueue(opts = {}) {
  const limit = Math.min(50, Math.max(1, Number(opts.limit ?? 10)));
  const rows = await query(
    `select id from stripe_connect_transfers
     where status in ('PENDING', 'FAILED')
       and retry_count < $1
       and (next_retry_at is null or next_retry_at <= now())
     order by requested_at asc
     limit $2`,
    [TRANSFER_MAX_RETRIES, limit]
  );

  const results = [];
  for (const row of rows.rows) {
    results.push(await executeStripeTransfer(String(row.id)));
  }
  return results;
}

/**
 * Re-enfileira transfers PROCESSING stale (PDF: cron 10 min).
 * @param {number} [staleMinutes]
 */
export async function requeueStaleTransfers(staleMinutes = 30) {
  const r = await query(
    `update stripe_connect_transfers
     set status = 'PENDING',
         next_retry_at = now(),
         updated_at = now()
     where status = 'PROCESSING'
       and stripe_transfer_id is null
       and updated_at < now() - ($1::int || ' minutes')::interval
     returning id`,
    [staleMinutes]
  );
  return r.rowCount ?? 0;
}

/**
 * Alerta se taxa de falha > limite nas últimas 24h (PDF v7).
 * @param {number} [threshold]
 */
export async function checkTransferFailureRate(threshold = 5) {
  const r = await query(
    `select count(*)::int as n
     from stripe_connect_transfers
     where status = 'FAILED'
       and failed_at >= now() - interval '24 hours'`
  );
  const n = Number(r.rows[0]?.n ?? 0);
  if (n >= threshold) {
    // eslint-disable-next-line no-console
    console.warn(`[stripe] ALERTA: ${n} transferências falharam nas últimas 24h (limite ${threshold}).`);
  }
  return n;
}
