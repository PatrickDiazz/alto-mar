import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import i18n from "@/i18n";
import { authFetch } from "@/lib/auth";

const PENDING_SESSION_KEY = "alto_mar_stripe_pending_session";

let resumeListenersRegistered = false;

/** Origem de retorno do Checkout no app nativo (`https://localhost`). */
export function stripeCheckoutReturnBaseUrl(): string | undefined {
  if (!Capacitor.isNativePlatform()) return undefined;
  if (typeof window === "undefined") return undefined;
  return window.location.origin.replace(/\/$/, "");
}

export function stashPendingStripeSession(sessionId: string) {
  if (!sessionId) return;
  try {
    sessionStorage.setItem(PENDING_SESSION_KEY, sessionId);
  } catch {
    /* ignore */
  }
}

export function clearPendingStripeSession() {
  try {
    sessionStorage.removeItem(PENDING_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function readPendingStripeSession(): string | null {
  try {
    return sessionStorage.getItem(PENDING_SESSION_KEY);
  } catch {
    return null;
  }
}

/** Sincroniza pagamento após fechar Custom Tab / voltar ao app. */
export async function syncPendingStripeCheckoutIfAny(): Promise<"synced" | "none" | "failed"> {
  const sessionId = readPendingStripeSession();
  if (!sessionId) return "none";

  try {
    const resp = await authFetch("/api/stripe/sync-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (resp.ok) {
      clearPendingStripeSession();
      const { toast } = await import("sonner");
      toast.success(i18n.t("reservasConta.syncStripeOk"));
      return "synced";
    }
    if (resp.status === 400) {
      const text = (await resp.text().catch(() => "")).trim();
      if (/ainda não foi concluído|not_paid/i.test(text)) {
        return "none";
      }
    }
    return "failed";
  } catch {
    return "failed";
  }
}

/**
 * Abre Stripe Checkout (Custom Tab / browser externo no Android).
 * Na WebView interna o Stripe falha ou bloqueia o fluxo.
 */
export async function openStripeCheckoutUrl(url: string, sessionId?: string) {
  if (sessionId) stashPendingStripeSession(sessionId);

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }

  window.location.assign(url);
}

/** Regista listeners para sincronizar pagamento quando o utilizador volta ao app. */
export function registerStripeCheckoutResumeListeners(onSynced?: () => void) {
  if (resumeListenersRegistered || !Capacitor.isNativePlatform()) return;
  resumeListenersRegistered = true;

  const trySync = () => {
    void syncPendingStripeCheckoutIfAny().then((r) => {
      if (r === "synced") onSynced?.();
    });
  };

  void Browser.addListener("browserFinished", trySync);
  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) trySync();
  });
}

export async function createStripeCheckoutSession(bookingId: string): Promise<{ url?: string; sessionId?: string }> {
  const returnBaseUrl = stripeCheckoutReturnBaseUrl();
  const resp = await authFetch("/api/stripe/checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId,
      ...(returnBaseUrl ? { returnBaseUrl } : {}),
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || i18n.t("reservar.payFail"));
  }
  return (await resp.json()) as { url?: string; sessionId?: string };
}
