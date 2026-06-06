import { getStripe } from "./client.js";

/**
 * @param {import("stripe").Stripe} stripe
 * @param {string} accountId
 */
export async function fetchOwnerConnectStatus(stripe, accountId) {
  const acct = await stripe.accounts.retrieve(accountId);
  return {
    stripeConnectAccountId: accountId,
    chargesEnabled: Boolean(acct.charges_enabled),
    payoutsEnabled: Boolean(acct.payouts_enabled),
    detailsSubmitted: Boolean(acct.details_submitted),
    currentlyDue: acct.requirements?.currently_due ?? [],
    disabledReason: acct.requirements?.disabled_reason ?? null,
    ready: Boolean(acct.charges_enabled && acct.payouts_enabled && acct.details_submitted),
  };
}

/**
 * Valida conta Connect activa antes de checkout/transfer.
 * @param {import("stripe").Stripe} stripe
 * @param {string | null | undefined} accountId
 */
export async function assertOwnerConnectReady(stripe, accountId) {
  if (!accountId) {
    const e = new Error("Conta Stripe Connect do locador não configurada.");
    e.code = "NO_CONNECT_ACCOUNT";
    throw e;
  }
  const status = await fetchOwnerConnectStatus(stripe, accountId);
  if (!status.ready) {
    const e = new Error(
      "Conta Stripe Connect do locador incompleta ou inactiva. Complete o onboarding antes de receber pagamentos."
    );
    e.code = "CONNECT_ACCOUNT_INACTIVE";
    e.connectStatus = status;
    throw e;
  }
  return status;
}

/** @param {string} userId */
export async function getConnectStatusForOwnerUser(userId) {
  const stripe = getStripe();
  if (!stripe) {
    return { configured: false, ready: false, stripeConnectAccountId: null };
  }
  const { query } = await import("../db.js");
  const u = await query(
    `select stripe_connect_account_id from users where id = $1::uuid limit 1`,
    [userId]
  );
  const accountId = u.rows[0]?.stripe_connect_account_id;
  if (!accountId) {
    return { configured: false, ready: false, stripeConnectAccountId: null };
  }
  const status = await fetchOwnerConnectStatus(stripe, accountId);
  return { configured: true, ...status };
}
