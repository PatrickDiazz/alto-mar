import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import type { BookingChatLocationState } from "@/pages/booking/BookingChatPage";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { HeaderSettingsMenu } from "@/components/HeaderSettingsMenu";
import { RenterBookingsPanel } from "@/components/RenterBookingsPanel";
import { RenterBookingsMobileList } from "@/components/renter/mobile/RenterBookingsMobileList";
import { useRenterMobileLayout } from "@/hooks/useRenterMobileLayout";
import { authFetch, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { useMarkNotificationsReadOnVisit } from "@/hooks/useMarkNotificationsReadOnVisit";
import { parseLegacyRenterChatHash, renterBookingChatPath } from "@/lib/bookingChatRoutes";
import { RENTER_PAGE_BG, RENTER_HEADER, RENTER_TEXT_TITLE } from "@/components/renter/booking/renterBookingUi";
import { cn } from "@/lib/utils";

const ContaReservas = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const [searchParams, setSearchParams] = useSearchParams();
  useMarkNotificationsReadOnVisit(pathname);
  const stripeReturnQuery = searchParams.toString();
  const user = getStoredUser();
  const [bookingsPanelKey, setBookingsPanelKey] = useState(0);
  const isMobileLayout = useRenterMobileLayout();
  const chatNavState = (location.state as BookingChatLocationState & { selectBookingId?: string } | null) ?? null;
  const autoOpenChatBookingId = useMemo(
    () => chatNavState?.openChatBookingId ?? null,
    [chatNavState?.openChatBookingId]
  );
  const initialSelectedId = chatNavState?.selectBookingId ?? null;

  useEffect(() => {
    const legacyId = parseLegacyRenterChatHash(window.location.hash);
    if (legacyId) {
      navigate(renterBookingChatPath(legacyId), { replace: true });
    }
  }, [navigate]);

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

  if (isMobileLayout) {
    return (
      <RenterBookingsMobileList
        key={bookingsPanelKey}
        autoOpenChatBookingId={autoOpenChatBookingId}
        autoOpenChatPeerLabel={chatNavState?.peerLabel}
        autoOpenChatSubtitle={chatNavState?.subtitle}
      />
    );
  }

  return (
    <div className={`min-h-screen ${RENTER_PAGE_BG}`}>
      <header className={RENTER_HEADER}>
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/conta")}
              className={cn(
                "shrink-0 rounded-full p-1.5 text-slate-700 transition-colors duration-200",
                "hover:bg-slate-100 hover:text-[#2563EB] dark:text-foreground dark:hover:bg-muted"
              )}
              aria-label={t("common.back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className={cn("truncate text-xl font-bold tracking-tight", RENTER_TEXT_TITLE)}>
              {t("reservasConta.title")}
            </h1>
          </div>
          <HeaderSettingsMenu />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-6">
        <RenterBookingsPanel
          key={bookingsPanelKey}
          autoOpenChatBookingId={autoOpenChatBookingId}
          autoOpenChatPeerLabel={chatNavState?.peerLabel}
          autoOpenChatSubtitle={chatNavState?.subtitle}
          initialSelectedId={initialSelectedId}
        />
      </main>
    </div>
  );
};

export default ContaReservas;
