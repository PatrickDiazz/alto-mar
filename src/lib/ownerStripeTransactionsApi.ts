import { authFetch } from "@/lib/auth";

export type OwnerStripeTransactionStatus = "paid" | "pending" | "awaiting" | "cancelled" | "refunded";

export type OwnerStripeTransaction = {
  id: string;
  bookingId: string;
  client: string;
  boat: string;
  boatId: string;
  date: string;
  paidAt: string | null;
  amountCents: number;
  ownerNetCents: number | null;
  status: OwnerStripeTransactionStatus;
  stripeFlowStatus: string | null;
  paymentStatus: string | null;
  transferStatus: string | null;
  receiptUrl: string | null;
};

export type OwnerStripeTransactionsResponse = {
  stripeEnabled: boolean;
  transactions: OwnerStripeTransaction[];
  filterMonths: string[];
  boats: { id: string; name: string }[];
};

export async function fetchOwnerStripeTransactions(params?: {
  month?: string;
  boatId?: string;
}): Promise<OwnerStripeTransactionsResponse> {
  const qs = new URLSearchParams();
  if (params?.month && params.month !== "all") qs.set("month", params.month);
  if (params?.boatId && params.boatId !== "all") qs.set("boatId", params.boatId);
  const suffix = qs.toString() ? `?${qs}` : "";
  const resp = await authFetch(`/api/owner/stripe/transactions${suffix}`);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || "stripe-transactions");
  }
  return (await resp.json()) as OwnerStripeTransactionsResponse;
}
