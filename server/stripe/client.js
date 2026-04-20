import Stripe from "stripe";

/** @type {Stripe | null} */
let cached = null;

/**
 * Cliente Stripe (lazy). Sem STRIPE_SECRET_KEY devolve null.
 * @returns {Stripe | null}
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY && String(process.env.STRIPE_SECRET_KEY).trim();
  if (!key) return null;
  if (!cached) {
    cached = new Stripe(key);
  }
  return cached;
}
