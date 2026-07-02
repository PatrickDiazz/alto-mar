import { apiUrl, authFetch, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

export type OwnerConnectStatus = {
  configured: boolean;
  ready: boolean;
  stripeConnectAccountId: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

export async function fetchPaymentsProvider(): Promise<"stripe" | "mercadopago"> {
  try {
    const resp = await fetch(apiUrl("/api/public/app-config"));
    if (!resp.ok) return "mercadopago";
    const data = (await resp.json()) as { paymentsProvider?: string };
    return data.paymentsProvider === "stripe" ? "stripe" : "mercadopago";
  } catch {
    return "mercadopago";
  }
}

export async function fetchOwnerConnectStatus(): Promise<OwnerConnectStatus | null> {
  const resp = await authFetch("/api/owner/stripe/connect-status");
  if (resp.status === 401) return null;
  if (!resp.ok) {
    return { configured: false, ready: false, stripeConnectAccountId: null };
  }
  return (await resp.json()) as OwnerConnectStatus;
}

/** Stripe Connect completo é obrigatório para locadores quando PAYMENTS_PROVIDER=stripe. */
export async function ownerRequiresStripeOnboarding(): Promise<boolean> {
  const user = getStoredUser();
  if (!user || user.role !== "locatario") return false;
  const provider = await fetchPaymentsProvider();
  if (provider !== "stripe") return false;
  const status = await fetchOwnerConnectStatus();
  if (!status) return true;
  return !status.ready;
}

export async function resolveOwnerEntryPath(from?: string): Promise<string> {
  if (await ownerRequiresStripeOnboarding()) return "/marinheiro/stripe";
  const fallback = "/marinheiro";
  if (!from || from === "/" || from === "/login" || from === "/signup" || from === "/signup/locador") return fallback;
  if (from.startsWith("/marinheiro/stripe")) return fallback;
  if (from.startsWith("/marinheiro")) return from;
  return fallback;
}

export async function startOwnerStripeConnect(): Promise<string> {
  const resp = await authFetch("/api/stripe/connect/account-link", { method: "POST" });
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Stripe Connect"));
  }
  const data = (await resp.json()) as { url?: string };
  if (!data.url) throw new Error("Stripe Connect");
  return data.url;
}
