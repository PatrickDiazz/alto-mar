import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiUrl, authFetch, getStoredUser } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import {
  createStripeCheckoutSession,
  openStripeCheckoutUrl,
} from "@/lib/stripeCheckout";
import { fetchChatUnreadSummary } from "@/lib/chatApi";
import type { Boat } from "@/lib/types";
import type { RenterBooking } from "@/components/renter/booking/renterBookingTypes";

export const RENTER_BOOKINGS_POLL_MS = 5_000;
export const CHAT_UNREAD_POLL_MS = 60_000;

export type RenterBookingsTab = "active" | "done" | "cancelled";

function pickDefaultBooking(list: RenterBooking[]): string | null {
  const pending = list.find((b) => b.status === "PENDING");
  if (pending) return pending.id;
  const accepted = list.find((b) => b.status === "ACCEPTED");
  if (accepted) return accepted.id;
  return list[0]?.id ?? null;
}

export function filterBookingsByTab(list: RenterBooking[], tab: RenterBookingsTab): RenterBooking[] {
  if (tab === "active") return list.filter((b) => b.status === "PENDING" || b.status === "ACCEPTED");
  if (tab === "done") return list.filter((b) => b.status === "COMPLETED");
  return list.filter((b) => b.status === "CANCELLED" || b.status === "DECLINED");
}

type Options = {
  autoOpenChatBookingId?: string | null;
  initialSelectedId?: string | null;
};

export function useRenterBookings({ autoOpenChatBookingId = null, initialSelectedId = null }: Options = {}) {
  const { t, i18n } = useTranslation();
  const user = getStoredUser();
  const locale = bcp47FromAppLang(i18n.language);
  const currencyFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  const [list, setList] = useState<RenterBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentsProvider, setPaymentsProvider] = useState<"stripe" | "mercadopago">("mercadopago");
  const [stripePayingId, setStripePayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<RenterBooking> | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelDraftBookingId, setCancelDraftBookingId] = useState<string | null>(null);
  const [cancelDraftReason, setCancelDraftReason] = useState("");
  const [chatUnreadByBooking, setChatUnreadByBooking] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boatImages, setBoatImages] = useState<Record<string, string | undefined>>({});

  const load = useCallback(
    async (opts?: { silent?: boolean; manual?: boolean }) => {
      const silent = Boolean(opts?.silent);
      const manual = Boolean(opts?.manual);
      if (manual) setRefreshing(true);
      else if (!silent) setLoading(true);
      try {
        const resp = await authFetch("/api/renter/bookings");
        if (resp.status === 401) return;
        if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.loadFail")));
        const data = (await resp.json()) as { bookings: RenterBooking[] };
        const bookings = data.bookings || [];
        setList(bookings);
        setSelectedId((prev) => {
          if (prev && bookings.some((b) => b.id === prev)) return prev;
          if (initialSelectedId && bookings.some((b) => b.id === initialSelectedId)) {
            return initialSelectedId;
          }
          if (autoOpenChatBookingId && bookings.some((b) => b.id === autoOpenChatBookingId)) {
            return autoOpenChatBookingId;
          }
          return pickDefaultBooking(bookings);
        });
      } catch (e) {
        if (!silent && !manual) {
          const m = (e instanceof Error ? e.message : t("reservasConta.loadFail")).trim();
          toast.error(m || t("reservasConta.loadFail"));
        }
      } finally {
        if (manual) setRefreshing(false);
        else if (!silent) setLoading(false);
      }
    },
    [t, autoOpenChatBookingId, initialSelectedId]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await fetch(apiUrl("/api/public/app-config"));
        if (!resp.ok) return;
        const cfg = (await resp.json()) as { paymentsProvider?: string };
        if (cancelled) return;
        setPaymentsProvider(cfg.paymentsProvider === "stripe" ? "stripe" : "mercadopago");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || user.role !== "banhista") return;
    void load();
  }, [user?.id, user?.role, load]);

  useEffect(() => {
    if (!user || user.role !== "banhista") return;
    const onStripeSynced = () => void load({ silent: true });
    window.addEventListener("alto-mar-stripe-synced", onStripeSynced);
    return () => window.removeEventListener("alto-mar-stripe-synced", onStripeSynced);
  }, [user?.id, user?.role, load]);

  const refreshChatUnread = useCallback(async () => {
    try {
      const summary = await fetchChatUnreadSummary();
      const map: Record<string, number> = {};
      for (const row of summary.byBooking) {
        map[row.bookingId] = row.count;
      }
      setChatUnreadByBooking(map);
    } catch {
      /* ignore */
    }
  }, []);

  const handleChatUnreadChange = useCallback((bookingId: string, count: number) => {
    setChatUnreadByBooking((prev) => {
      if (prev[bookingId] === count) return prev;
      return { ...prev, [bookingId]: count };
    });
  }, []);

  useEffect(() => {
    if (!user || user.role !== "banhista") return;
    void refreshChatUnread();
    const interval = window.setInterval(() => void refreshChatUnread(), CHAT_UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [user?.id, user?.role, refreshChatUnread]);

  useEffect(() => {
    if (!user || user.role !== "banhista") return;
    const tick = () => void load({ silent: true });
    const interval = window.setInterval(tick, RENTER_BOOKINGS_POLL_MS);
    const onVisibleOrFocus = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibleOrFocus);
    window.addEventListener("focus", onVisibleOrFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibleOrFocus);
      window.removeEventListener("focus", onVisibleOrFocus);
    };
  }, [user?.id, user?.role, load]);

  useEffect(() => {
    const ids = [...new Set(list.map((b) => b.boat.id))];
    let cancelled = false;
    void (async () => {
      const next: Record<string, string | undefined> = {};
      await Promise.all(
        ids.map(async (id) => {
          if (boatImages[id]) {
            next[id] = boatImages[id];
            return;
          }
          try {
            const resp = await fetch(apiUrl(`/api/boats/${id}`));
            if (!resp.ok) return;
            const data = (await resp.json()) as { boat?: Boat };
            const img = data.boat?.imagens?.[0];
            if (img) next[id] = img;
          } catch {
            /* ignore */
          }
        })
      );
      if (!cancelled) setBoatImages((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [list.map((b) => b.boat.id).join(",")]);

  const pending = useMemo(() => list.filter((b) => b.status === "PENDING"), [list]);
  const inProgress = useMemo(() => list.filter((b) => b.status === "ACCEPTED"), [list]);
  const done = useMemo(() => list.filter((b) => b.status === "COMPLETED"), [list]);
  const cancelled = useMemo(
    () => list.filter((b) => ["CANCELLED", "DECLINED"].includes(b.status)),
    [list]
  );

  const selectedBooking = useMemo(() => {
    if (selectedId) {
      const found = list.find((b) => b.id === selectedId);
      if (found) return found;
    }
    return pickDefaultBooking(list) ? list.find((b) => b.id === pickDefaultBooking(list)) ?? null : null;
  }, [list, selectedId]);

  const getBookingById = useCallback(
    (id: string) => list.find((b) => b.id === id) ?? null,
    [list]
  );

  const startEdit = (b: RenterBooking) => {
    if (b.status === "DECLINED" || b.status === "CANCELLED" || b.status === "COMPLETED") return;
    setEditingId(b.id);
    setEditDraft({ ...b });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (opts?: { onSuccess?: () => void }) => {
    if (!editingId || !editDraft) return false;
    const original = list.find((x) => x.id === editingId);
    if (!original) return false;
    const cap = original.boat.capacidade ?? 99;
    const adults = editDraft.passengersAdults ?? original.passengersAdults;
    const children = editDraft.passengersChildren ?? original.passengersChildren;
    if (adults + children > cap) {
      toast.error(t("reservar.toastCapacity", { n: cap }));
      return false;
    }
    if (!editDraft.bookingDate?.trim()) {
      toast.error(t("reservar.toastDate"));
      return false;
    }
    const origDate = original.bookingDate ?? "";
    const newDate = editDraft.bookingDate ?? "";
    const isRescheduling = newDate !== origDate && original.status === "ACCEPTED";
    if (isRescheduling) {
      if (!editDraft.rescheduleReason) {
        toast.error(t("reservasConta.reschedulePickReason"));
        return false;
      }
      const title = (editDraft.rescheduleTitle ?? "").trim();
      const note = (editDraft.rescheduleNote ?? "").trim();
      if (title.length < 3) {
        toast.error(t("reservasConta.rescheduleNeedTitle"));
        return false;
      }
      if (note.length < 10) {
        toast.error(t("reservasConta.rescheduleNeedNote"));
        return false;
      }
    }
    try {
      const payload: Record<string, unknown> = {
        passengersAdults: editDraft.passengersAdults,
        passengersChildren: editDraft.passengersChildren,
        hasKids: editDraft.hasKids,
        bookingDate: editDraft.bookingDate,
      };
      if (isRescheduling && editDraft.rescheduleReason) {
        payload.rescheduleReason = editDraft.rescheduleReason;
        payload.rescheduleTitle = (editDraft.rescheduleTitle ?? "").trim();
        payload.rescheduleNote = (editDraft.rescheduleNote ?? "").trim();
        payload.rescheduleAttachments = editDraft.rescheduleAttachments ?? [];
      }
      const resp = await authFetch(`/api/renter/bookings/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.status === 401) return false;
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.saveFail")));
      toast.success(t("reservasConta.saveOk"));
      setEditingId(null);
      setEditDraft(null);
      await load({ silent: true });
      opts?.onSuccess?.();
      return true;
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("reservasConta.saveFail")).trim();
      toast.error(m || t("reservasConta.saveFail"));
      return false;
    }
  };

  const submitCancelBooking = (booking: RenterBooking, reason?: string) => {
    const note = String(reason || "").trim();
    void (async () => {
      setCancellingId(booking.id);
      try {
        const resp = await authFetch(`/api/renter/bookings/${booking.id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: note || undefined }),
        });
        if (resp.status === 401) return;
        if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.cancelFail")));
        toast.success(t("reservasConta.cancelOk"));
        setCancelDraftBookingId(null);
        setCancelDraftReason("");
        if (editingId === booking.id) {
          setEditingId(null);
          setEditDraft(null);
        }
        await load({ silent: true });
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("reservasConta.cancelFail")).trim();
        toast.error(m || t("reservasConta.cancelFail"));
      } finally {
        setCancellingId(null);
      }
    })();
  };

  const requestCancelBooking = (booking: RenterBooking) => {
    if (booking.bookingGroupId) {
      const doCancelAll = window.confirm(
        "Esta reserva faz parte de um passeio com vários dias. Clique em OK para cancelar o passeio todo, ou Cancelar para seguir com cancelamento apenas deste dia."
      );
      if (doCancelAll) {
        const sameGroup = list.filter(
          (x) =>
            x.bookingGroupId === booking.bookingGroupId &&
            (x.status === "PENDING" || x.status === "ACCEPTED")
        );
        if (sameGroup.length <= 1) {
          submitCancelBooking(booking);
          return;
        }
        if (!window.confirm(`Confirma cancelar todos os ${sameGroup.length} dias deste passeio?`)) return;
        for (const item of sameGroup) {
          submitCancelBooking(item);
        }
        return;
      }
    }

    const isInProgress = booking.status === "ACCEPTED";
    if (!isInProgress) {
      if (!window.confirm(t("reservasConta.cancelConfirm"))) return;
      submitCancelBooking(booking);
      return;
    }

    setEditingId(null);
    setEditDraft(null);
    setCancelDraftBookingId(booking.id);
    setCancelDraftReason("");
  };

  const payStripeCheckout = async (bookingId: string) => {
    setStripePayingId(bookingId);
    try {
      const data = await createStripeCheckoutSession(bookingId);
      if (!data.url) throw new Error(t("reservasConta.payStripeFail"));
      await openStripeCheckoutUrl(data.url, data.sessionId);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("reservasConta.payStripeFail")).trim();
      toast.error(m || t("reservasConta.payStripeFail"));
    } finally {
      setStripePayingId(null);
    }
  };

  const stripeCheckoutDueFor = useCallback(
    (b: RenterBooking) => {
      const stripeUnpaid = !(b.paymentProvider === "STRIPE" && b.paymentStatus === "APPROVED");
      return (
        paymentsProvider === "stripe" &&
        stripeUnpaid &&
        (b.status === "PENDING" || b.status === "ACCEPTED")
      );
    },
    [paymentsProvider]
  );

  const canEditBooking = (b: RenterBooking) =>
    b.status !== "COMPLETED" && b.status !== "DECLINED" && b.status !== "CANCELLED";

  return {
    t,
    i18n,
    user,
    currencyFmt,
    list,
    loading,
    refreshing,
    paymentsProvider,
    stripePayingId,
    editingId,
    editDraft,
    setEditDraft,
    cancellingId,
    cancelDraftBookingId,
    cancelDraftReason,
    setCancelDraftReason,
    chatUnreadByBooking,
    selectedId,
    setSelectedId,
    boatImages,
    pending,
    inProgress,
    done,
    cancelled,
    selectedBooking,
    getBookingById,
    load,
    startEdit,
    cancelEdit,
    saveEdit,
    submitCancelBooking,
    requestCancelBooking,
    payStripeCheckout,
    stripeCheckoutDueFor,
    canEditBooking,
    handleChatUnreadChange,
    setCancelDraftBookingId,
  };
}
