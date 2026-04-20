/**
 * Saldo corrente da reserva no razão (último running_balance), com lock pessimista na linha.
 * @param {import("pg").PoolClient} client
 * @param {string} bookingId
 */
export async function getBookingLedgerBalanceForUpdate(client, bookingId) {
  const result = await client.query(
    `select running_balance_cents
     from stripe_connect_ledger
     where booking_id = $1::uuid
     order by created_at desc, id desc
     limit 1
     for update`,
    [bookingId]
  );
  return result.rows[0]?.running_balance_cents ?? 0;
}

/**
 * @param {import("pg").PoolClient} client
 * @param {{
 *   bookingId: string;
 *   entryType: string;
 *   amountCents: number;
 *   runningBalanceCents: number;
 *   eventId: string;
 *   description?: string | null;
 *   metadata?: object | null;
 * }} row
 */
export async function insertLedgerEntry(client, row) {
  await client.query(
    `insert into stripe_connect_ledger
      (booking_id, entry_type, amount_cents, running_balance_cents, event_id, description, metadata)
     values ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      row.bookingId,
      row.entryType,
      row.amountCents,
      row.runningBalanceCents,
      row.eventId,
      row.description ?? null,
      row.metadata ?? null,
    ]
  );
}
