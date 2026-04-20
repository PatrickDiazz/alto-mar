import { getBookingLedgerBalanceForUpdate, insertLedgerEntry } from "./ledger.js";
import { StripeFlowStatus } from "./flowStatus.js";
import { splitPlatformOwnerNet } from "./fees.js";

/**
 * Marca reserva como paga a partir de uma Checkout Session já paga (webhook ou sync ao voltar do browser).
 * Idempotente: se já existir pagamento STRIPE APPROVED para a reserva, não faz nada.
 *
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe} stripe
 * @param {import("stripe").Stripe.Checkout.Session} session
 * @param {string} ledgerEventId id único (ex.: `${event.id}:payment_in` ou `return_sync_${session.id}:payment_in`)
 */
export async function applyPaidCheckoutSessionInTx(client, stripe, session, ledgerEventId) {
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;

  const bookingId = session.metadata?.booking_id || session.client_reference_id;
  if (!bookingId) {
    // eslint-disable-next-line no-console
    console.warn("[stripe] checkout session sem booking_id");
    return;
  }

  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!piId) return;

  const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
  const ch = pi.latest_charge;
  const chargeId = typeof ch === "string" ? ch : ch && "id" in ch ? ch.id : null;

  const amountTotal = session.amount_total ?? pi.amount_received ?? pi.amount;
  if (amountTotal == null) return;

  const bk = await client.query(
    `select id, renter_user_id, total_cents, stripe_flow_status
     from bookings where id = $1::uuid for update`,
    [bookingId]
  );
  const b = bk.rows[0];
  if (!b) return;

  if (String(session.metadata?.renter_user_id || "") !== String(b.renter_user_id)) {
    const e = new Error("metadata.renter_user_id não coincide com a reserva.");
    e.code = "RENTER_MISMATCH";
    throw e;
  }

  if (Number(b.total_cents) !== Number(amountTotal)) {
    const e = new Error("Valor pago não coincide com o total da reserva.");
    e.code = "AMOUNT_MISMATCH";
    throw e;
  }

  const already = await client.query(
    `select 1 from payments where booking_id = $1::uuid and provider = 'STRIPE' and status = 'APPROVED' limit 1`,
    [bookingId]
  );
  if (already.rows[0]) return;

  const dup = await client.query(`select 1 from stripe_connect_ledger where event_id = $1`, [ledgerEventId]);
  if (dup.rows[0]) return;

  const { platformFeeCents, ownerNetCents } = splitPlatformOwnerNet(Number(b.total_cents));

  await client.query(
    `update bookings
     set stripe_flow_status = $2,
         platform_fee_cents = $3,
         owner_net_cents = $4,
         stripe_checkout_session_id = coalesce(stripe_checkout_session_id, $5)
     where id = $1::uuid`,
    [bookingId, StripeFlowStatus.PAID, platformFeeCents, ownerNetCents, session.id]
  );

  const upPay = await client.query(
    `update payments
     set provider = 'STRIPE',
         status = 'APPROVED',
         stripe_checkout_session_id = $2,
         stripe_payment_intent_id = $3,
         stripe_charge_id = coalesce($4, stripe_charge_id),
         amount_cents = $5,
         currency = 'brl',
         paid_at = now(),
         updated_at = now()
     where booking_id = $1::uuid`,
    [bookingId, session.id, piId, chargeId, Number(amountTotal)]
  );
  if (!upPay.rowCount) {
    await client.query(
      `insert into payments (
         booking_id, provider, mp_preference_id, mp_init_point, status,
         stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id,
         amount_cents, currency, paid_at
       ) values ($1::uuid, 'STRIPE', null, null, 'APPROVED', $2, $3, $4, $5, 'brl', now())`,
      [bookingId, session.id, piId, chargeId, Number(amountTotal)]
    );
  }

  const currentBalance = await getBookingLedgerBalanceForUpdate(client, bookingId);
  const paid = Number(amountTotal);
  await insertLedgerEntry(client, {
    bookingId,
    entryType: "PAYMENT_IN",
    amountCents: paid,
    runningBalanceCents: currentBalance + paid,
    eventId: ledgerEventId,
    description: "Pagamento recebido (Stripe Checkout)",
    metadata: { checkout_session_id: session.id, payment_intent_id: piId },
  });
}
