/**
 * Regista ou actualiza disputa/chargeback Stripe.
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe.Dispute} dispute
 * @param {string} stripeEventId
 */
export async function upsertDisputeFromWebhookInTx(client, dispute, stripeEventId) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  let bookingId = null;
  let paymentId = null;

  if (chargeId) {
    const pay = await client.query(
      `select id, booking_id from payments where stripe_charge_id = $1 limit 1`,
      [chargeId]
    );
    if (pay.rows[0]) {
      paymentId = pay.rows[0].id;
      bookingId = pay.rows[0].booking_id;
    }
  }

  const payload = { stripe_event_id: stripeEventId, dispute };
  const closedAt =
    dispute.status === "won" || dispute.status === "lost" || dispute.status === "charge_refunded"
      ? new Date()
      : null;

  await client.query(
    `insert into stripe_disputes (
       booking_id, payment_id, stripe_dispute_id, stripe_charge_id,
       amount_cents, currency, status, reason, payload, closed_at, updated_at
     ) values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, now())
     on conflict (stripe_dispute_id) do update set
       status = excluded.status,
       reason = excluded.reason,
       payload = excluded.payload,
       closed_at = coalesce(excluded.closed_at, stripe_disputes.closed_at),
       updated_at = now()`,
    [
      bookingId,
      paymentId,
      dispute.id,
      chargeId ?? null,
      Number(dispute.amount ?? 0),
      dispute.currency ?? "brl",
      dispute.status,
      dispute.reason ?? null,
      JSON.stringify(payload),
      closedAt,
    ]
  );

  if (dispute.status === "needs_response" || dispute.status === "warning_needs_response") {
    // eslint-disable-next-line no-console
    console.warn(
      `[stripe] DISPUTA aberta ${dispute.id} booking=${bookingId ?? "n/a"} amount=${dispute.amount}`
    );
  }
}
