/**
 * PIX no Stripe (Checkout + PMC / Connect): desligado por defeito.
 * Defina `STRIPE_PIX_ENABLED=1` em server/.env para voltar a ativar.
 */
export function isStripePixEnabled() {
  return String(process.env.STRIPE_PIX_ENABLED || "").trim() === "1";
}
