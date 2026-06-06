import { calculateRefundAmount } from "../../server/stripe/cancellationPolicy.js";
import type { OwnerBookingRow } from "@/lib/ownerBookingTypes";

export type OwnerCancelScenario = "owner" | "weather" | "boat_failure";

export function getOwnerCancelPenaltyHint(
  booking: Pick<OwnerBookingRow, "totalCents" | "ownerNetCents" | "paymentProvider">,
  paymentsProvider: "stripe" | "mercadopago",
  scenario: OwnerCancelScenario,
  formatMoney: (amount: number) => string,
  t: (key: string, o?: Record<string, unknown>) => string
): { rulesReady: boolean; message: string } {
  const stripeRules = paymentsProvider === "stripe";

  if (!stripeRules) {
    return { rulesReady: false, message: t("marinheiro.cancelPenaltyComingSoon") };
  }

  const ownerNet = Math.max(0, booking.ownerNetCents ?? booking.totalCents);
  const calc = calculateRefundAmount({
    totalCents: booking.totalCents,
    ownerNetCents: ownerNet,
    hoursUntilService: 168,
    initiatedBy: scenario,
  });

  if (calc.ownerPenaltyCents > 0) {
    return {
      rulesReady: true,
      message: t("marinheiro.cancelPenaltyApplies", {
        amount: formatMoney(calc.ownerPenaltyCents / 100),
      }),
    };
  }

  return {
    rulesReady: true,
    message: t("marinheiro.cancelPenaltyNone"),
  };
}
