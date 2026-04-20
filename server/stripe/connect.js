import { query } from "../db.js";
import { getStripe } from "./client.js";
import { ensureStripePixOnPaymentMethodConfigurations } from "./ensureStripePixPmc.js";
import { isStripePixEnabled } from "./pixEnabled.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

/**
 * Garante conta Connect Express e devolve URL do Account Link (onboarding).
 * @param {{ userId: string; email: string; name: string }} input
 */
export async function createConnectAccountLinkForOwner(input) {
  const stripe = getStripe();
  if (!stripe) {
    const e = new Error("STRIPE_SECRET_KEY não configurado.");
    e.code = "STRIPE_DISABLED";
    throw e;
  }

  const u = await query(
    `select id, email, name, role, stripe_connect_account_id from users where id = $1::uuid limit 1`,
    [input.userId]
  );
  const row = u.rows[0];
  if (!row) {
    const e = new Error("Utilizador não encontrado.");
    e.code = "NOT_FOUND";
    throw e;
  }
  if (row.role !== "locatario") {
    const e = new Error("Apenas locadores podem ativar recebimentos Stripe.");
    e.code = "FORBIDDEN";
    throw e;
  }

  let accountId = row.stripe_connect_account_id;
  if (!accountId) {
    const acct = await stripe.accounts.create({
      type: "express",
      country: "BR",
      email: input.email || row.email,
      business_profile: { name: (input.name || row.name || "Locador").slice(0, 120) },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        ...(isStripePixEnabled() ? { pix_payments: { requested: true } } : {}),
      },
      metadata: { alto_mar_user_id: row.id },
    });
    accountId = acct.id;
    await query(`update users set stripe_connect_account_id = $2 where id = $1::uuid`, [row.id, accountId]);
  }

  if (isStripePixEnabled()) {
    try {
      await stripe.accounts.update(accountId, {
        capabilities: { pix_payments: { requested: true } },
      });
    } catch {
      /* Não bloquear onboarding se a capability não se aplicar à conta. */
    }

    if (String(process.env.STRIPE_SKIP_PIX_PMC || "").trim() !== "1") {
      await ensureStripePixOnPaymentMethodConfigurations(stripe, { stripeAccount: accountId });
    }
  }

  const refreshUrl = `${FRONTEND_URL}/marinheiro?stripe_connect=refresh`;
  const returnUrl = `${FRONTEND_URL}/marinheiro?stripe_connect=return`;

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return { url: link.url, stripeConnectAccountId: accountId };
}
