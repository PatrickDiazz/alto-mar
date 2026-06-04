import { query } from "../db.js";
import { getStripe } from "./client.js";
import { StripeFlowStatus } from "./flowStatus.js";

/**
 * @param {import("stripe").Stripe} stripe
 * @param {{ chargeId?: string | null; paymentIntentId?: string | null }} ids
 * @returns {Promise<string | null>}
 */
async function resolveStripeReceiptUrl(stripe, { chargeId, paymentIntentId }) {
  if (chargeId) {
    try {
      const ch = await stripe.charges.retrieve(chargeId);
      if (ch.receipt_url) return ch.receipt_url;
    } catch {
      /* charge indisponível */
    }
  }
  if (paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      const ch = pi.latest_charge;
      if (ch && typeof ch === "object" && "receipt_url" in ch && ch.receipt_url) {
        return ch.receipt_url;
      }
    } catch {
      /* PI indisponível */
    }
  }
  return null;
}

/**
 * @param {string | null | undefined} paymentStatus
 * @param {string | null | undefined} stripeFlowStatus
 * @param {string} bookingStatus
 * @param {boolean} hasRefund
 */
function mapDisplayStatus(paymentStatus, stripeFlowStatus, bookingStatus, hasRefund) {
  if (hasRefund || paymentStatus === "REFUNDED") return "refunded";
  if (bookingStatus === "CANCELLED" || bookingStatus === "DECLINED") return "cancelled";
  if (stripeFlowStatus === StripeFlowStatus.TRANSFER_PAID) return "paid";
  if (paymentStatus === "APPROVED") return "pending";
  if (stripeFlowStatus === StripeFlowStatus.CHECKOUT_PENDING || !paymentStatus) return "awaiting";
  return "pending";
}

/**
 * @param {string} ownerUserId
 * @param {{ month?: string | null; boatId?: string | null }} filters
 */
export async function listOwnerStripeTransactions(ownerUserId, filters = {}) {
  const stripe = getStripe();
  const params = [ownerUserId];
  let where = `where bk.owner_user_id = $1::uuid and p.provider = 'STRIPE'`;

  if (filters.boatId) {
    params.push(filters.boatId);
    where += ` and b.id = $${params.length}::uuid`;
  }
  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    params.push(`${filters.month}-01`);
    where += ` and date_trunc('month', coalesce(p.paid_at, bk.created_at)) = $${params.length}::date`;
  }

  const rows = await query(
    `select
       bk.id as booking_id,
       bk.status as booking_status,
       bk.booking_date::text as booking_date,
       bk.total_cents,
       bk.owner_net_cents,
       bk.stripe_flow_status,
       b.id as boat_id,
       b.name as boat_name,
       u.name as renter_name,
       p.id as payment_id,
       p.status::text as payment_status,
       p.stripe_payment_intent_id,
       p.stripe_charge_id,
       p.paid_at,
       p.amount_cents as payment_amount_cents,
       exists (
         select 1 from stripe_connect_refunds r
         where r.booking_id = bk.id and lower(r.status) = 'completed'
       ) as has_refund,
       t.status as transfer_status,
       t.paid_at as transfer_paid_at
     from bookings bk
     join boats b on b.id = bk.boat_id
     join users u on u.id = bk.renter_user_id
     join payments p on p.booking_id = bk.id
     left join lateral (
       select status, paid_at
       from stripe_connect_transfers
       where booking_id = bk.id
       order by requested_at desc
       limit 1
     ) t on true
     ${where}
     order by coalesce(p.paid_at, bk.created_at) desc
     limit 80`,
    params
  );

  const boatsMap = new Map();
  const monthsSet = new Set();

  const baseRows = rows.rows.map((r) => {
    boatsMap.set(r.boat_id, { id: r.boat_id, name: r.boat_name });
    const paidAt = r.paid_at ? new Date(r.paid_at) : null;
    if (paidAt) {
      const y = paidAt.getFullYear();
      const m = String(paidAt.getMonth() + 1).padStart(2, "0");
      monthsSet.add(`${y}-${m}`);
    }
    return r;
  });

  const transactions = await Promise.all(
    baseRows.map(async (r) => {
      let receiptUrl = null;
      if (stripe) {
        receiptUrl = await resolveStripeReceiptUrl(stripe, {
          chargeId: r.stripe_charge_id,
          paymentIntentId: r.stripe_payment_intent_id,
        });
      }

      const displayStatus = mapDisplayStatus(
        r.payment_status,
        r.stripe_flow_status,
        r.booking_status,
        Boolean(r.has_refund)
      );

      return {
        id: r.payment_id || r.booking_id,
        bookingId: r.booking_id,
        client: r.renter_name,
        boat: r.boat_name,
        boatId: r.boat_id,
        date: r.booking_date,
        paidAt: r.paid_at,
        amountCents: Number(r.payment_amount_cents ?? r.total_cents ?? 0),
        ownerNetCents: r.owner_net_cents != null ? Number(r.owner_net_cents) : null,
        status: displayStatus,
        stripeFlowStatus: r.stripe_flow_status,
        paymentStatus: r.payment_status,
        transferStatus: r.transfer_status,
        receiptUrl,
      };
    })
  );

  const filterMonths = [...monthsSet].sort((a, b) => b.localeCompare(a));
  const boats = [...boatsMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    stripeEnabled: Boolean(stripe),
    transactions,
    filterMonths,
    boats,
  };
}
