import { getBookingLedgerBalanceForUpdate, insertLedgerEntry } from "./ledger.js";

/**
 * Sincroniza reembolso Stripe recebido via webhook (Dashboard ou API externa).
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe.Charge} charge
 * @param {string} stripeEventId
 */
export async function syncChargeRefundFromWebhookInTx(client, charge, stripeEventId) {
  const chargeId = charge.id;
  const pay = await client.query(
    `select p.id, p.booking_id, p.amount_cents, p.status::text as status
     from payments p
     where p.stripe_charge_id = $1
     limit 1
     for update`,
    [chargeId]
  );
  const p = pay.rows[0];
  if (!p) return;

  const refunds = charge.refunds?.data ?? [];
  for (const refund of refunds) {
    if (!refund.id || refund.status === "failed") continue;

    const dup = await client.query(
      `select 1 from stripe_connect_refunds where stripe_refund_id = $1 limit 1`,
      [refund.id]
    );
    if (dup.rows[0]) continue;

    const amount = Number(refund.amount ?? 0);
    if (amount <= 0) continue;

    const idempotencyKey = `webhook_refund_${refund.id}`.slice(0, 240);
    await client.query(
      `insert into stripe_connect_refunds (
         booking_id, payment_id, stripe_refund_id, amount_cents, refund_type, reason,
         cancelled_by, status, idempotency_key, completed_at
       ) values ($1::uuid, $2::uuid, $3, $4, 'WEBHOOK_SYNC', $5, 'STRIPE', 'completed', $6, now())`,
      [
        p.booking_id,
        p.id,
        refund.id,
        amount,
        refund.reason ?? "webhook_sync",
        idempotencyKey,
      ]
    );

    const maxAmount = Number(p.amount_cents || 0);
    if (amount >= maxAmount) {
      await client.query(
        `update payments set status = 'REFUNDED', updated_at = now() where id = $1::uuid`,
        [p.id]
      );
    }

    const hasPaymentIn = await client.query(
      `select 1 from stripe_connect_ledger where booking_id = $1::uuid and entry_type = 'PAYMENT_IN' limit 1`,
      [p.booking_id]
    );
    if (hasPaymentIn.rows[0]) {
      const ledgerEventId = `${stripeEventId}:refund:${refund.id}`;
      const dupLedger = await client.query(
        `select 1 from stripe_connect_ledger where event_id = $1`,
        [ledgerEventId]
      );
      if (!dupLedger.rows[0]) {
        const cur = await getBookingLedgerBalanceForUpdate(client, p.booking_id);
        await insertLedgerEntry(client, {
          bookingId: p.booking_id,
          entryType: "REFUND_OUT",
          amountCents: -amount,
          runningBalanceCents: cur - amount,
          eventId: ledgerEventId,
          description: "Reembolso sincronizado (webhook Stripe)",
          metadata: { stripe_refund_id: refund.id },
        });
      }
    }
  }
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe.Refund} refund
 * @param {string} stripeEventId
 */
export async function syncRefundUpdatedFromWebhookInTx(client, refund, stripeEventId) {
  if (!refund.charge) return;
  const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge.id;
  const pay = await client.query(
    `select p.id, p.booking_id, p.amount_cents from payments p where p.stripe_charge_id = $1 limit 1`,
    [chargeId]
  );
  const p = pay.rows[0];
  if (!p || !refund.id) return;

  const existing = await client.query(
    `select id from stripe_connect_refunds where stripe_refund_id = $1 limit 1`,
    [refund.id]
  );
  if (existing.rows[0]) {
    await client.query(
      `update stripe_connect_refunds
       set status = $2, amount_cents = $3, completed_at = case when $2 = 'completed' then coalesce(completed_at, now()) else completed_at end
       where stripe_refund_id = $1`,
      [refund.id, refund.status ?? "completed", Number(refund.amount ?? 0)]
    );
    return;
  }

  if (refund.status === "succeeded" || refund.status === "completed") {
    await client.query(
      `insert into stripe_connect_refunds (
         booking_id, payment_id, stripe_refund_id, amount_cents, refund_type, reason,
         cancelled_by, status, idempotency_key, completed_at
       ) values ($1::uuid, $2::uuid, $3, $4, 'WEBHOOK_SYNC', $5, 'STRIPE', 'completed', $6, now())`,
      [
        p.booking_id,
        p.id,
        refund.id,
        Number(refund.amount ?? 0),
        refund.reason ?? "webhook_updated",
        `webhook_refund_${refund.id}`.slice(0, 240),
      ]
    );

    const ledgerEventId = `${stripeEventId}:refund:${refund.id}`;
    const hasPaymentIn = await client.query(
      `select 1 from stripe_connect_ledger where booking_id = $1::uuid and entry_type = 'PAYMENT_IN' limit 1`,
      [p.booking_id]
    );
    if (hasPaymentIn.rows[0]) {
      const cur = await getBookingLedgerBalanceForUpdate(client, p.booking_id);
      await insertLedgerEntry(client, {
        bookingId: p.booking_id,
        entryType: "REFUND_OUT",
        amountCents: -Number(refund.amount ?? 0),
        runningBalanceCents: cur - Number(refund.amount ?? 0),
        eventId: ledgerEventId,
        description: "Reembolso (charge.refund.updated)",
        metadata: { stripe_refund_id: refund.id },
      });
    }
  }
}
