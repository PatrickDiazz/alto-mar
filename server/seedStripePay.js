import { pool } from "./db.js";
import { getStripe } from "./stripe/client.js";
import { applyApprovedStripePaymentInTx } from "./stripe/applyCheckoutPaid.js";
import { resolveStripeReceiptUrl } from "./stripe/ownerTransactions.js";
import { getConnectStatusForOwnerUser } from "./stripe/connectStatus.js";
import { createConnectAccountLinkForOwner } from "./stripe/connect.js";

/**
 * Pré-preenche conta Connect Express em modo teste (quando possível).
 * @param {string} ownerUserId
 * @param {{ email: string; name: string }} owner
 */
export async function ensureDemoOwnerStripeConnect(ownerUserId, owner) {
  const stripe = getStripe();
  if (!stripe) return { ready: false, accountId: null };

  let status = await getConnectStatusForOwnerUser(ownerUserId);
  if (status.ready && status.stripeConnectAccountId) {
    return { ready: true, accountId: status.stripeConnectAccountId };
  }

  const { stripeConnectAccountId } = await createConnectAccountLinkForOwner({
    userId: ownerUserId,
    email: owner.email,
    name: owner.name,
  });

  try {
    await stripe.accounts.update(stripeConnectAccountId, {
      business_type: "individual",
      business_profile: {
        url: "https://www.example.com",
        mcc: "7999",
        product_description: "Passeios de barco (demo Alto Mar)",
      },
      individual: {
        first_name: "Locador",
        last_name: "Demo",
        email: owner.email,
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "127.0.0.1",
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      "[seed] Aviso ao pré-preencher Stripe Connect:",
      e instanceof Error ? e.message : String(e)
    );
  }

  status = await getConnectStatusForOwnerUser(ownerUserId);
  return { ready: Boolean(status.ready), accountId: status.stripeConnectAccountId || stripeConnectAccountId };
}

/**
 * Após criar a Checkout Session (como no app), confirma pagamento em modo teste via PaymentIntent
 * e sincroniza a BD — gera charge real com receipt_url.
 *
 * @param {{ bookingId: string; renterUserId: string; sessionId: string; totalCents: number; renterEmail?: string }} input
 */
export async function payStripeCheckoutSessionInTestMode(input) {
  const stripe = getStripe();
  if (!stripe) {
    const e = new Error("STRIPE_SECRET_KEY não configurado.");
    e.code = "STRIPE_DISABLED";
    throw e;
  }

  const pi = await stripe.paymentIntents.create({
    amount: input.totalCents,
    currency: "brl",
    payment_method: "pm_card_visa",
    payment_method_types: ["card"],
    confirm: true,
    receipt_email: input.renterEmail || undefined,
    metadata: {
      booking_id: input.bookingId,
      renter_user_id: input.renterUserId,
      seed_checkout_session_id: input.sessionId,
    },
  });

  if (pi.status !== "succeeded") {
    const e = new Error(`PaymentIntent não concluído (status=${pi.status}).`);
    e.code = "NOT_PAID";
    throw e;
  }

  const piFull = await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge"] });
  const ch = piFull.latest_charge;
  const chargeId = typeof ch === "string" ? ch : ch && "id" in ch ? ch.id : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await applyApprovedStripePaymentInTx(client, {
      bookingId: input.bookingId,
      renterUserId: input.renterUserId,
      checkoutSessionId: input.sessionId,
      pi: piFull,
      ledgerEventId: `seed_pi_${pi.id}:payment_in`,
    });
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  const receiptUrl = await resolveStripeReceiptUrl(stripe, {
    chargeId,
    paymentIntentId: piFull.id,
  });

  return {
    sessionId: input.sessionId,
    chargeId,
    paymentIntentId: piFull.id,
    receiptUrl,
  };
}
