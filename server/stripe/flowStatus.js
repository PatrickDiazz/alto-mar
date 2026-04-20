/**
 * Estados financeiros Stripe na reserva — nomes canónicos (v7 doc: um só “TRANSFER_PENDING”).
 * @typedef {'CHECKOUT_PENDING'|'PAID'|'TRANSFER_PENDING'|'TRANSFER_PROCESSING'|'TRANSFER_PAID'|'TRANSFER_FAILED'} StripeFlowStatus
 */

export const StripeFlowStatus = {
  CHECKOUT_PENDING: "CHECKOUT_PENDING",
  PAID: "PAID",
  TRANSFER_PENDING: "TRANSFER_PENDING",
  TRANSFER_PROCESSING: "TRANSFER_PROCESSING",
  TRANSFER_PAID: "TRANSFER_PAID",
  TRANSFER_FAILED: "TRANSFER_FAILED",
};

/** @param {string | null | undefined} s */
export function isStripeFlowTerminal(s) {
  return s === StripeFlowStatus.TRANSFER_PAID || s === StripeFlowStatus.TRANSFER_FAILED;
}
