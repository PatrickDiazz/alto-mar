import { getBookingLedgerBalanceForUpdate, insertLedgerEntry } from "./ledger.js";

/** Códigos persistidos em `bookings.renter_notice_code` (i18n no front). */
export const RenterNoticeCode = {
  SAME_DAY_OTHER_ACCEPTED: "SAME_DAY_OTHER_ACCEPTED",
  OWNER_DECLINED_REFUND: "OWNER_DECLINED_REFUND",
  RENTER_CANCEL_FULL_FEE_DEDUCTED: "RENTER_CANCEL_FULL_FEE_DEDUCTED",
  RENTER_CANCEL_PARTIAL_50: "RENTER_CANCEL_PARTIAL_50",
  RENTER_CANCEL_NO_REFUND_LT48H: "RENTER_CANCEL_NO_REFUND_LT48H",
};

/**
 * @returns {boolean}
 */
export function isPaymentsStripe() {
  return String(process.env.PAYMENTS_PROVIDER || "").toLowerCase() === "stripe";
}

/**
 * Taxas não reembolsáveis (estimativa operacional):
 * - comissão da plataforma;
 * - taxa do cartão Stripe (percentual + fixo, ambos configuráveis por env).
 * @param {{ totalCents: number; platformFeeCents?: number | null }} input
 */
export function estimateNonRefundableFeesCents(input) {
  const total = Math.max(0, Number(input.totalCents || 0));
  const platform = Math.max(0, Number(input.platformFeeCents || 0));
  const stripePct = Math.max(0, Number(process.env.STRIPE_CARD_FEE_PERCENT ?? 0));
  const stripeFixed = Math.max(0, Number(process.env.STRIPE_CARD_FEE_FIXED_CENTS ?? 0));
  const stripeFee = Math.floor((total * stripePct) / 100) + stripeFixed;
  return Math.min(total, platform + stripeFee);
}

/**
 * Reembolso Stripe + razão na BD, dentro de uma transação já aberta.
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe} stripe
 * @param {{
 *   bookingId: string;
 *   refundType: string;
 *   reason: string;
 *   cancelledBy: string;
 *   cancelledByUserId: string | null;
 *   refundAmountCents?: number | null;
 * }} input
 * @returns {Promise<{ refunded: boolean; duplicate?: boolean; stripeRefundId?: string; refundAmountCents?: number }>}
 */
export async function refundStripePaymentInTx(client, stripe, input) {
  const { bookingId, refundType, reason, cancelledBy, cancelledByUserId, refundAmountCents } = input;

  const pay = await client.query(
    `select p.id, p.provider::text as provider, p.status::text as status, p.stripe_charge_id, p.amount_cents
     from payments p
     where p.booking_id = $1::uuid
     for update`,
    [bookingId]
  );
  const p = pay.rows[0];
  if (!p || p.provider !== "STRIPE" || p.status !== "APPROVED" || !p.stripe_charge_id) {
    return { refunded: false };
  }

  const dup = await client.query(
    `select 1 from stripe_connect_refunds
     where booking_id = $1::uuid and refund_type = $2 and status = 'completed'
     limit 1`,
    [bookingId, refundType]
  );
  if (dup.rows[0]) {
    return { refunded: false, duplicate: true };
  }

  const maxAmount = Number(p.amount_cents || 0);
  const chosenAmount =
    refundAmountCents == null
      ? maxAmount
      : Math.max(0, Math.min(maxAmount, Math.floor(Number(refundAmountCents))));
  if (!Number.isFinite(chosenAmount) || chosenAmount <= 0) {
    return { refunded: false };
  }

  const idempotencyKey = `refund_${bookingId}_${refundType}`.slice(0, 240);
  const refundPayload = { charge: String(p.stripe_charge_id), amount: chosenAmount };
  const refund = await stripe.refunds.create(refundPayload, { idempotencyKey });

  await client.query(
    `insert into stripe_connect_refunds (
       booking_id, payment_id, stripe_refund_id, amount_cents, refund_type, reason,
       cancelled_by, cancelled_by_user_id, status, idempotency_key, completed_at
     ) values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::uuid, 'completed', $9, now())`,
    [
      bookingId,
      p.id,
      refund.id,
      chosenAmount,
      refundType,
      reason,
      cancelledBy,
      cancelledByUserId || null,
      idempotencyKey,
    ]
  );

  if (chosenAmount >= maxAmount) {
    await client.query(
      `update payments set status = 'REFUNDED', updated_at = now() where id = $1::uuid`,
      [p.id]
    );
  }

  const hasPaymentIn = await client.query(
    `select 1 from stripe_connect_ledger where booking_id = $1::uuid and entry_type = 'PAYMENT_IN' limit 1`,
    [bookingId]
  );
  if (hasPaymentIn.rows[0]) {
    const cur = await getBookingLedgerBalanceForUpdate(client, bookingId);
    const amt = chosenAmount;
    await insertLedgerEntry(client, {
      bookingId,
      entryType: "REFUND_OUT",
      amountCents: -amt,
      runningBalanceCents: cur - amt,
      eventId: `refund_${refund.id}:${bookingId}:${refundType}`,
      description: reason,
      metadata: { stripe_refund_id: refund.id, refund_type: refundType },
    });
  }

  await client.query(
    `update bookings
     set stripe_flow_status = null
     where id = $1::uuid`,
    [bookingId]
  );

  return { refunded: true, stripeRefundId: refund.id, refundAmountCents: chosenAmount };
}
