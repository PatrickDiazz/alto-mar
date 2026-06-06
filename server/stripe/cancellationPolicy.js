import { estimateNonRefundableFeesCents } from "./refunds.js";

/** @typedef {'customer'|'owner'|'weather'|'boat_failure'} CancellationInitiator */

/**
 * Taxa Stripe estimada (centavos inteiros) — alinhado ao PDF v7.
 * @param {number} totalCents
 */
export function estimateStripeFeeCents(totalCents) {
  const total = Math.max(0, Math.floor(Number(totalCents || 0)));
  const stripePct = Number(
    process.env.STRIPE_CARD_FEE_PERCENT ?? process.env.STRIPE_PERCENT_FEE ?? 2.9
  );
  const stripeFixed = Number(
    process.env.STRIPE_CARD_FEE_FIXED_CENTS ?? process.env.STRIPE_FIXED_FEE_CENTS ?? 60
  );
  return Math.floor((total * stripePct) / 100) + stripeFixed;
}

/**
 * Percentual de reembolso (0–100) para cancelamento pelo banhista.
 * @param {number} hoursUntilService
 */
export function getRefundPercentage(hoursUntilService) {
  const h = Number(hoursUntilService);
  if (h >= 24 * 7) return 100;
  if (h >= 24 * 2) return 50;
  return 0;
}

/**
 * @param {string | null | undefined} status
 */
export function canCancelBooking(status) {
  return status === "PENDING" || status === "ACCEPTED";
}

/**
 * Cálculo de reembolso por cenário (inteiros em centavos) — PDF v7.
 * @param {{
 *   totalCents: number;
 *   ownerNetCents?: number | null;
 *   platformFeeCents?: number | null;
 *   hoursUntilService: number;
 *   initiatedBy: CancellationInitiator;
 * }} input
 */
export function calculateRefundAmount(input) {
  const total = Math.max(0, Math.floor(Number(input.totalCents || 0)));
  const ownerNet = Math.max(0, Math.floor(Number(input.ownerNetCents ?? total)));
  const hoursUntil = Number(input.hoursUntilService);
  const initiatedBy = input.initiatedBy;

  if (initiatedBy === "customer") {
    if (hoursUntil >= 24 * 7) {
      const nonRefundable = estimateNonRefundableFeesCents({
        totalCents: total,
        platformFeeCents: input.platformFeeCents,
      });
      return {
        customerRefundCents: Math.max(0, total - nonRefundable),
        ownerPayoutCents: 0,
        ownerPenaltyCents: 0,
        refundType: "RENTER_CANCEL_FULL_FEE_DEDUCTED",
        renterNoticeCode: "RENTER_CANCEL_FULL_FEE_DEDUCTED",
        policyLabel:
          "Política aplicada: reembolso com 7+ dias, descontadas taxas não reembolsáveis da plataforma e do gateway.",
      };
    }
    if (hoursUntil >= 24 * 2) {
      const half = Math.floor(total / 2);
      return {
        customerRefundCents: half,
        ownerPayoutCents: half,
        ownerPenaltyCents: 0,
        refundType: "RENTER_CANCEL_PARTIAL_50",
        renterNoticeCode: "RENTER_CANCEL_PARTIAL_50",
        policyLabel: "Política aplicada: cancelamento entre 6 e 2 dias, reembolso de 50% do valor do serviço.",
      };
    }
    return {
      customerRefundCents: 0,
      ownerPayoutCents: total,
      ownerPenaltyCents: 0,
      refundType: "RENTER_CANCEL_NO_REFUND_LT48H",
      renterNoticeCode: "RENTER_CANCEL_NO_REFUND_LT48H",
      policyLabel: "Política aplicada: sem reembolso (menos de 48h ou no-show).",
    };
  }

  if (initiatedBy === "owner") {
    const penalty = Math.floor(ownerNet * 0.2);
    return {
      customerRefundCents: total,
      ownerPayoutCents: 0,
      ownerPenaltyCents: penalty,
      refundType: "OWNER_CANCEL_UNJUSTIFIED",
      renterNoticeCode: "OWNER_CANCEL_REFUND",
      policyLabel: "Cancelamento pelo locador: reembolso integral ao banhista; multa de 20% aplicada ao locador.",
    };
  }

  if (initiatedBy === "weather") {
    return {
      customerRefundCents: total,
      ownerPayoutCents: 0,
      ownerPenaltyCents: 0,
      refundType: "WEATHER_CANCEL",
      renterNoticeCode: "OWNER_CANCEL_WEATHER",
      policyLabel: "Cancelamento por condições climáticas: reembolso integral; sem penalidade ao locador.",
    };
  }

  if (initiatedBy === "boat_failure") {
    const penalty = Math.floor(ownerNet * 0.2);
    return {
      customerRefundCents: total,
      ownerPayoutCents: 0,
      ownerPenaltyCents: penalty,
      refundType: "BOAT_FAILURE_CANCEL",
      renterNoticeCode: "OWNER_CANCEL_BOAT_FAILURE",
      policyLabel: "Cancelamento por falha na embarcação: reembolso integral; penalidade de 20% ao locador.",
    };
  }

  return {
    customerRefundCents: 0,
    ownerPayoutCents: 0,
    ownerPenaltyCents: 0,
    refundType: "UNKNOWN",
    renterNoticeCode: null,
    policyLabel: "",
  };
}
