import { calculateRefundAmount } from "./cancellationPolicy.js";
import { createOwnerPenaltyInTx } from "./penalties.js";
import { refundStripePaymentInTx } from "./refunds.js";

/**
 * Cancelamento de reserva ACCEPTED pelo locador (PDF v7).
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe} stripe
 * @param {{
 *   bookingId: string;
 *   ownerUserId: string;
 *   reason: string;
 *   scenario: 'owner' | 'weather' | 'boat_failure';
 * }} input
 */
export async function cancelAcceptedBookingByOwnerInTx(client, stripe, input) {
  const cur = await client.query(
    `select bk.status::text as status,
            bk.total_cents,
            bk.platform_fee_cents,
            bk.owner_net_cents,
            bk.owner_user_id,
            extract(epoch from ((bk.booking_date::timestamp + coalesce(bk.embark_time, '09:00'::time)) - now())) / 3600.0 as hours_until_service,
            p.provider::text as payment_provider,
            p.status::text as payment_status
     from bookings bk
     left join payments p on p.booking_id = bk.id
     where bk.id = $1::uuid and bk.owner_user_id = $2::uuid
     limit 1
     for update of bk`,
    [input.bookingId, input.ownerUserId]
  );
  const row = cur.rows[0];
  if (!row || row.status !== "ACCEPTED") {
    const e = new Error("Reserva não encontrada ou não está aceita.");
    e.code = "NOT_FOUND";
    throw e;
  }

  const initiatedBy = input.scenario;
  const calc = calculateRefundAmount({
    totalCents: Number(row.total_cents || 0),
    ownerNetCents: row.owner_net_cents,
    platformFeeCents: row.platform_fee_cents,
    hoursUntilService: Number(row.hours_until_service ?? 0),
    initiatedBy,
  });

  const stripePaid =
    row.payment_provider === "STRIPE" && row.payment_status === "APPROVED" && stripe;

  if (stripePaid && calc.customerRefundCents > 0) {
    await refundStripePaymentInTx(client, stripe, {
      bookingId: input.bookingId,
      refundType: calc.refundType,
      reason: `${input.reason}\n\n${calc.policyLabel}`,
      cancelledBy: "OWNER",
      cancelledByUserId: input.ownerUserId,
      refundAmountCents: calc.customerRefundCents,
    });
  }

  if (calc.ownerPenaltyCents > 0) {
    await createOwnerPenaltyInTx(client, {
      bookingId: input.bookingId,
      ownerUserId: input.ownerUserId,
      penaltyAmountCents: calc.ownerPenaltyCents,
      penaltyType: calc.refundType,
    });
  }

  const note = `${input.reason}\n\n${calc.policyLabel}`;
  const updated = await client.query(
    `update bookings
     set status = 'CANCELLED',
         decided_at = coalesce(decided_at, now()),
         decision_note = $3,
         renter_notice_code = $4,
         stripe_flow_status = null
     where id = $1::uuid and owner_user_id = $2::uuid and status = 'ACCEPTED'
     returning id, status, decided_at`,
    [input.bookingId, input.ownerUserId, note, calc.renterNoticeCode]
  );

  return { booking: updated.rows[0], refund: calc };
}
