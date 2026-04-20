/**
 * Comissão da plataforma (percentual inteiro, ex.: 15 = 15%).
 * @param {number} totalCents
 * @param {number} [percent]
 */
export function splitPlatformOwnerNet(totalCents, percent) {
  const p = Number.isFinite(percent) ? percent : Number(process.env.PLATFORM_FEE_PERCENT ?? 15);
  const pct = Math.min(100, Math.max(0, p));
  const platformFeeCents = Math.floor((totalCents * pct) / 100);
  const ownerNetCents = totalCents - platformFeeCents;
  return { platformFeeCents, ownerNetCents };
}
