/** Traduz códigos de status financeiros (API) para rótulos localizados. */
export function translateOwnerPaymentStatus(
  status: string | null | undefined,
  t: (key: string) => string
): string {
  if (!status) return "—";
  const key = `ownerReservas.paymentStatus.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function translateOwnerTransferStatus(
  status: string | null | undefined,
  t: (key: string) => string
): string {
  if (!status) return "—";
  const key = `ownerReservas.transferStatus.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function translateOwnerStripeFlowStatus(
  status: string | null | undefined,
  t: (key: string) => string
): string {
  if (!status) return "—";
  const key = `ownerReservas.stripeFlowStatus.${status}`;
  const label = t(key);
  return label === key ? status : label;
}
