/** Multa de parceiro (PDF v7): 20% do líquido do locador. */
export const OWNER_PENALTY_PERCENT = 20;

/**
 * @param {import("pg").PoolClient} client
 * @param {{
 *   bookingId: string;
 *   ownerUserId: string;
 *   penaltyAmountCents: number;
 *   penaltyType: string;
 * }} input
 */
export async function createOwnerPenaltyInTx(client, input) {
  const amount = Math.max(0, Math.floor(Number(input.penaltyAmountCents || 0)));
  if (amount <= 0) return null;

  const ins = await client.query(
    `insert into stripe_owner_penalties (
       booking_id, owner_user_id, penalty_amount_cents, penalty_type, status
     ) values ($1::uuid, $2::uuid, $3, $4, 'PENDING')
     returning id, penalty_amount_cents`,
    [input.bookingId, input.ownerUserId, amount, input.penaltyType]
  );
  return ins.rows[0];
}

/**
 * Soma penalidades pendentes do locador (para dedução no repasse).
 * @param {import("pg").PoolClient} client
 * @param {string} ownerUserId
 */
export async function sumPendingPenaltiesForOwner(client, ownerUserId) {
  const r = await client.query(
    `select coalesce(sum(penalty_amount_cents), 0)::int as total
     from stripe_owner_penalties
     where owner_user_id = $1::uuid and status = 'PENDING'`,
    [ownerUserId]
  );
  return Number(r.rows[0]?.total ?? 0);
}

/**
 * Marca penalidades como deduzidas num repasse.
 * @param {import("pg").PoolClient} client
 * @param {string} ownerUserId
 * @param {string} transferRowId
 * @param {number} maxDeductCents
 * @returns {Promise<number>} centavos efectivamente deduzidos
 */
export async function deductPendingPenaltiesInTx(client, ownerUserId, transferRowId, maxDeductCents) {
  let remaining = Math.max(0, Math.floor(Number(maxDeductCents || 0)));
  if (remaining <= 0) return 0;

  const pending = await client.query(
    `select id, penalty_amount_cents
     from stripe_owner_penalties
     where owner_user_id = $1::uuid and status = 'PENDING'
     order by created_at asc
     for update`,
    [ownerUserId]
  );

  let deducted = 0;
  for (const row of pending.rows) {
    if (remaining <= 0) break;
    const amt = Number(row.penalty_amount_cents);
    if (amt <= remaining) {
      await client.query(
        `update stripe_owner_penalties
         set status = 'DEDUCTED',
             deducted_from_transfer_id = $2::uuid,
             resolved_at = now()
         where id = $1::uuid`,
        [row.id, transferRowId]
      );
      deducted += amt;
      remaining -= amt;
    }
  }
  return deducted;
}

/**
 * Penalidades pendentes há mais de N dias → OVERDUE (cron).
 * @param {import("pg").PoolClient} [client]
 * @param {number} [days]
 */
export async function markOverduePenalties(client, days = 7) {
  const q = client ? client.query.bind(client) : (await import("../db.js")).query;
  const r = await q(
    `update stripe_owner_penalties
     set status = 'OVERDUE'
     where status = 'PENDING'
       and created_at < now() - ($1::int || ' days')::interval
     returning id`,
    [days]
  );
  return r.rowCount ?? 0;
}
