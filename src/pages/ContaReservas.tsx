import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { RenterBookingsPanel } from "@/components/RenterBookingsPanel";
import { authFetch, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

const ContaReservas = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stripeReturnQuery = searchParams.toString();
  const user = getStoredUser();
  const [bookingsPanelKey, setBookingsPanelKey] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/conta/reservas" }, replace: true });
      return;
    }
    if (user.role !== "banhista") {
      navigate("/conta", { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    if (!user || user.role !== "banhista") return;
    const stripe = searchParams.get("stripe");
    const sessionId = searchParams.get("session_id");
    if (stripe !== "success" || !sessionId) return;

    let cancelled = false;
    void (async () => {
      try {
        const resp = await authFetch("/api/stripe/sync-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (cancelled) return;
        if (!resp.ok) {
          const err = await readResponseErrorMessage(resp, t("reservasConta.syncStripeFail"));
          toast.error(err);
          return;
        }
        toast.success(t("reservasConta.syncStripeOk"));
        setBookingsPanelKey((k) => k + 1);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("stripe");
            next.delete("session_id");
            return next;
          },
          { replace: true }
        );
      } catch {
        if (!cancelled) toast.error(t("reservasConta.syncStripeFail"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, stripeReturnQuery, setSearchParams, t]);

  if (!user || user.role !== "banhista") return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/explorar")}
              className="shrink-0 text-foreground transition-colors hover:text-primary"
              aria-label={t("common.back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-foreground">{t("reservasConta.title")}</h1>
              <p className="truncate text-xs text-muted-foreground">{t("reservasConta.liveSyncHint")}</p>
            </div>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <RenterBookingsPanel key={bookingsPanelKey} />
      </div>
    </div>
  );
};

export default ContaReservas;
