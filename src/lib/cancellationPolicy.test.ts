import { describe, expect, it } from "vitest";
import { calculateRefundAmount, getRefundPercentage, canCancelBooking } from "../../server/stripe/cancellationPolicy.js";

describe("cancellationPolicy", () => {
  it("getRefundPercentage follows 7 / 2-6 / <2 days rule", () => {
    expect(getRefundPercentage(200)).toBe(100);
    expect(getRefundPercentage(168)).toBe(100);
    expect(getRefundPercentage(100)).toBe(50);
    expect(getRefundPercentage(48)).toBe(50);
    expect(getRefundPercentage(47)).toBe(0);
  });

  it("customer 50% split uses integer half", () => {
    const r = calculateRefundAmount({
      totalCents: 10001,
      hoursUntilService: 72,
      initiatedBy: "customer",
    });
    expect(r.customerRefundCents).toBe(5000);
    expect(r.ownerPayoutCents).toBe(5000);
  });

  it("owner cancel applies 20% penalty on owner net", () => {
    const r = calculateRefundAmount({
      totalCents: 100_000,
      ownerNetCents: 85_000,
      hoursUntilService: 100,
      initiatedBy: "owner",
    });
    expect(r.customerRefundCents).toBe(100_000);
    expect(r.ownerPenaltyCents).toBe(17_000);
  });

  it("weather cancel has no penalty", () => {
    const r = calculateRefundAmount({
      totalCents: 50_000,
      ownerNetCents: 42_500,
      hoursUntilService: 10,
      initiatedBy: "weather",
    });
    expect(r.customerRefundCents).toBe(50_000);
    expect(r.ownerPenaltyCents).toBe(0);
  });

  it("canCancelBooking allows PENDING and ACCEPTED", () => {
    expect(canCancelBooking("PENDING")).toBe(true);
    expect(canCancelBooking("ACCEPTED")).toBe(true);
    expect(canCancelBooking("COMPLETED")).toBe(false);
  });
});
