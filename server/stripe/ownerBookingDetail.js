import { query } from "../db.js";
import { getStripe } from "./client.js";
import { resolveStripeReceiptUrl } from "./ownerTransactions.js";

/**
 * Detalhe de uma reserva do locador — mesma base do GET /api/owner/bookings (lista).
 * @param {string} ownerUserId
 * @param {string} rawBookingId
 */
export async function getOwnerBookingDetail(ownerUserId, rawBookingId) {
  const bookingId = String(rawBookingId || "").trim();
  if (!bookingId) return null;

  const rows = await query(
    `select
       bk.id,
       bk.status,
       bk.created_at,
       bk.decided_at,
       bk.decision_note,
       bk.passengers_adults,
       bk.passengers_children,
       bk.has_kids,
       bk.bbq_kit,
       bk.jet_ski_selected,
       bk.embark_location,
       to_char(bk.embark_time, 'HH24:MI') as embark_time,
       bk.total_cents,
       bk.owner_net_cents,
       bk.booking_date::text as booking_date,
       coalesce(bk.route_islands, '{}'::text[]) as route_islands,
       bk.stripe_flow_status,
       b.id as boat_id,
       b.name as boat_name,
       coalesce(b.jet_ski_offered, false) as boat_jet_ski_offered,
       coalesce(b.jet_ski_price_cents, 0) as boat_jet_ski_price_cents,
       u.id as renter_id,
       u.name as renter_name,
       u.email as renter_email,
       br.renter_stars,
       br.renter_comment,
       br.renter_rated_at,
       bk.reschedule_reason,
       bk.reschedule_title,
       bk.reschedule_note,
       coalesce(bk.reschedule_attachments, '{}'::text[]) as reschedule_attachments,
       p.id as payment_id,
       p.provider::text as payment_provider,
       p.status::text as payment_status,
       p.stripe_payment_intent_id,
       p.stripe_charge_id,
       p.paid_at,
       p.amount_cents as payment_amount_cents,
       (
         select t.status
         from stripe_connect_transfers t
         where t.booking_id = bk.id
         order by t.requested_at desc
         limit 1
       ) as transfer_status,
       (
         select t.paid_at
         from stripe_connect_transfers t
         where t.booking_id = bk.id
         order by t.requested_at desc
         limit 1
       ) as transfer_paid_at
     from bookings bk
     join boats b on b.id = bk.boat_id
     join users u on u.id = bk.renter_user_id
     left join booking_ratings br on br.booking_id = bk.id
     left join payments p on p.booking_id = bk.id
     where bk.owner_user_id = $1 and bk.id = $2::uuid
     limit 1`,
    [ownerUserId, bookingId]
  );

  const r = rows.rows[0];
  if (!r) return null;

  const stripe = getStripe();
  let receiptUrl = null;
  if (stripe && r.payment_provider === "STRIPE") {
    receiptUrl = await resolveStripeReceiptUrl(stripe, {
      chargeId: r.stripe_charge_id,
      paymentIntentId: r.stripe_payment_intent_id,
    });
  }

  return {
    booking: {
      id: r.id,
      status: r.status,
      createdAt: r.created_at,
      decidedAt: r.decided_at,
      decisionNote: r.decision_note,
      passengersAdults: r.passengers_adults,
      passengersChildren: r.passengers_children,
      hasKids: r.has_kids,
      bbqKit: r.bbq_kit,
      jetSki: r.jet_ski_selected,
      embarkLocation: r.embark_location,
      embarkTime: r.embark_time,
      totalCents: r.total_cents,
      ownerNetCents: r.owner_net_cents != null ? Number(r.owner_net_cents) : null,
      bookingDate: r.booking_date,
      routeIslands: Array.isArray(r.route_islands) ? r.route_islands : [],
      boat: {
        id: r.boat_id,
        nome: r.boat_name,
        jetSkiOffered: Boolean(r.boat_jet_ski_offered),
        jetSkiPriceCents: Number(r.boat_jet_ski_price_cents ?? 0),
      },
      renter: { id: r.renter_id, nome: r.renter_name, email: r.renter_email },
      rescheduleReason: r.reschedule_reason ?? null,
      rescheduleTitle: r.reschedule_title ?? null,
      rescheduleNote: r.reschedule_note ?? null,
      rescheduleAttachments: Array.isArray(r.reschedule_attachments) ? r.reschedule_attachments : [],
      stripeFlowStatus: r.stripe_flow_status ?? null,
      paymentProvider: r.payment_provider ?? null,
      paymentStatus: r.payment_status ?? null,
      ratingRenter:
        r.renter_stars != null
          ? {
              stars: r.renter_stars,
              comment: r.renter_comment,
              ratedAt: r.renter_rated_at,
            }
          : null,
    },
    payment: r.payment_id
      ? {
          id: r.payment_id,
          provider: r.payment_provider,
          status: r.payment_status,
          amountCents: Number(r.payment_amount_cents ?? r.total_cents ?? 0),
          paidAt: r.paid_at,
          stripePaymentIntentId: r.stripe_payment_intent_id,
          stripeChargeId: r.stripe_charge_id,
          receiptUrl,
          transferStatus: r.transfer_status ?? null,
          transferPaidAt: r.transfer_paid_at ?? null,
        }
      : null,
    stripeEnabled: Boolean(stripe),
  };
}
