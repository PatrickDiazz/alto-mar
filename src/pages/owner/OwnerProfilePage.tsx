import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OwnerProfileTab } from "@/components/owner/OwnerProfileTab";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { authFetch, clearSession, apiUrl } from "@/lib/auth";
import { openStripeCheckoutUrl } from "@/lib/stripeCheckout";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { readResponseErrorMessage } from "@/lib/responseError";

export default function OwnerProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading } = useOwnerPanel();
  const [paymentsProvider, setPaymentsProvider] = useState<"stripe" | "mercadopago">("mercadopago");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(apiUrl("/api/public/app-config"));
        if (!r.ok) return;
        const d = (await r.json()) as { paymentsProvider?: string };
        if (!cancelled) setPaymentsProvider(d.paymentsProvider === "stripe" ? "stripe" : "mercadopago");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    const goHome = window.confirm(t("marinheiro.logoutConfirm"));
    navigate(goHome ? "/" : "/explorar", { replace: true });
  };

  const abrirStripeConnect = async () => {
    try {
      const resp = await authFetch("/api/stripe/connect/account-link", { method: "POST" });
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastStripeConnectFail")));
      }
      const data = (await resp.json()) as { url?: string };
      if (!data.url) throw new Error(t("marinheiro.toastStripeConnectFail"));
      await openStripeCheckoutUrl(data.url);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastStripeConnectFail")).trim();
      toast.error(m || t("marinheiro.toastStripeConnectFail"));
    }
  };

  return (
    <OwnerPanelPage bodyLayout="stack-tight">
      <OwnerProfileTab
        paymentsStripe={paymentsProvider === "stripe"}
        onStripeConnect={() => void abrirStripeConnect()}
        onLogout={handleLogout}
        loading={loading}
      />
    </OwnerPanelPage>
  );
}
