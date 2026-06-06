import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { authFetch, apiUrl } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import type { OwnerBookingRow } from "@/lib/ownerBookingTypes";

const OWNER_BOOKINGS_POLL_MS = 5_000;

export function useOwnerBookings(opts?: { enabled?: boolean }) {
  const { t } = useTranslation();
  const enabled = opts?.enabled !== false;
  const [bookings, setBookings] = useState<OwnerBookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [paymentsProvider, setPaymentsProvider] = useState<"stripe" | "mercadopago">("mercadopago");

  const reload = useCallback(
    async (silent = false) => {
      if (!enabled) return;
      if (!silent) setLoading(true);
      try {
        const resp = await authFetch("/api/owner/bookings");
        if (resp.status === 401) return;
        if (!resp.ok) {
          throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastBookings")));
        }
        const data = (await resp.json()) as { bookings: OwnerBookingRow[] };
        setBookings(data.bookings || []);
      } catch (e) {
        if (!silent) {
          const m = (e instanceof Error ? e.message : t("marinheiro.toastBookings")).trim();
          toast.error(m || t("marinheiro.toastBookings"), { id: "owner-bookings" });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled, t]
  );

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => void reload(true), OWNER_BOOKINGS_POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, reload]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(apiUrl("/api/public/app-config"));
        if (!r.ok) return;
        const d = (await r.json()) as { paymentsProvider?: string };
        if (cancelled) return;
        setPaymentsProvider(d.paymentsProvider === "stripe" ? "stripe" : "mercadopago");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const decide = useCallback(
    async (id: string, action: "accept" | "decline") => {
      setLoading(true);
      try {
        const resp = await authFetch(`/api/owner/bookings/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: noteById[id] || "" }),
        });
        if (resp.status === 401) return;
        if (!resp.ok) {
          throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastBookingUpdate")));
        }
        toast.success(action === "accept" ? t("marinheiro.toastAccept") : t("marinheiro.toastDecline"));
        await reload(true);
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("marinheiro.toastBookingUpdate")).trim();
        toast.error(m || t("marinheiro.toastBookingUpdate"));
      } finally {
        setLoading(false);
      }
    },
    [noteById, reload, t]
  );

  const complete = useCallback(
    async (bookingId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const resp = await authFetch(`/api/owner/bookings/${bookingId}/complete`, { method: "POST" });
        if (resp.status === 401) return false;
        if (!resp.ok) {
          throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastCompleteFail")));
        }
        toast.success(t("marinheiro.toastCompleteOk"));
        await reload(true);
        return true;
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("marinheiro.toastCompleteFail")).trim();
        toast.error(m || t("marinheiro.toastCompleteFail"));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [reload, t]
  );

  const startStripePayout = useCallback(
    async (bookingId: string) => {
      setLoading(true);
      try {
        const resp = await authFetch(`/api/owner/bookings/${bookingId}/stripe/start-payout`, {
          method: "POST",
        });
        if (resp.status === 401) return;
        if (!resp.ok) {
          throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastStripePayoutFail")));
        }
        toast.success(t("marinheiro.toastStripePayoutQueued"));
        await reload(true);
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("marinheiro.toastStripePayoutFail")).trim();
        toast.error(m || t("marinheiro.toastStripePayoutFail"));
      } finally {
        setLoading(false);
      }
    },
    [reload, t]
  );

  const cancelAccepted = useCallback(
    async (bookingId: string, reason: string, scenario: "owner" | "weather" | "boat_failure") => {
      setLoading(true);
      try {
        const resp = await authFetch(`/api/owner/bookings/${bookingId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, scenario }),
        });
        if (resp.status === 401) return;
        if (!resp.ok) {
          throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastCancelAcceptedFail")));
        }
        toast.success(t("marinheiro.toastCancelAcceptedOk"));
        await reload(true);
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("marinheiro.toastCancelAcceptedFail")).trim();
        toast.error(m || t("marinheiro.toastCancelAcceptedFail"));
      } finally {
        setLoading(false);
      }
    },
    [reload, t]
  );

  return {
    bookings,
    loading,
    noteById,
    setNoteById,
    paymentsProvider,
    reload,
    decide,
    complete,
    startStripePayout,
    cancelAccepted,
  };
}
