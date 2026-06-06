import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";
import { ExternalLink, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import {
  MarinheiroAcceptedBookingCard,
  OwnerCompletedBookingCard,
  OwnerPendingBookingCard,
  OwnerRescheduleJustification,
} from "@/components/owner/bookings/OwnerBookingCards";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { fetchOwnerBookingDetail, ownerBookingDetailFromRow } from "@/lib/ownerBookingDetailApi";
import {
  translateOwnerPaymentStatus,
  translateOwnerStripeFlowStatus,
  translateOwnerTransferStatus,
} from "@/lib/ownerPaymentStatusLabels";
import { useOwnerBookings } from "@/hooks/useOwnerBookings";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { ownerBookingDayDiff, ownerBookingYmd, type OwnerBookingDetailResponse, type OwnerBookingRow } from "@/lib/ownerBookingTypes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function parseYmd(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

function statusTone(status: string): string {
  if (status === "ACCEPTED") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
  if (status === "PENDING") return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  if (status === "COMPLETED") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/30 py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground sm:max-w-[65%] sm:text-right">{value}</span>
    </div>
  );
}

type DetailLocationState = { booking?: OwnerBookingRow };

function resolveCachedBooking(
  id: string,
  bookings: OwnerBookingRow[],
  seeded: OwnerBookingRow | undefined
): OwnerBookingRow | null {
  const fromList = bookings.find((b) => b.id === id);
  if (fromList) return fromList;
  if (seeded?.id === id) return seeded;
  return null;
}

export default function OwnerBookingDetailPage() {
  const { bookingId: rawBookingId } = useParams<{ bookingId: string }>();
  const bookingId = rawBookingId ? decodeURIComponent(rawBookingId).trim() : "";
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<OwnerBookingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const bookingActions = useOwnerBookings();
  const { reloadBookings } = useOwnerPanel();
  const {
    bookings,
    noteById,
    setNoteById,
    paymentsProvider,
    decide,
    complete,
    startStripePayout,
    cancelAccepted,
    reload,
  } = bookingActions;

  const seededBooking = (location.state as DetailLocationState | null)?.booking;

  const bookingsRef = useRef(bookings);
  const seededBookingRef = useRef(seededBooking);
  const dataRef = useRef(data);
  bookingsRef.current = bookings;
  seededBookingRef.current = seededBooking;
  dataRef.current = data;

  const locale = bcp47FromAppLang(i18n.language);
  const dayPickerLocale = localeForLang(i18n.language);
  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );
  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale]
  );

  const load = useCallback(
    async (silent = false) => {
      if (!bookingId) {
        setLoading(false);
        setNotFound(true);
        return;
      }
      if (!silent) {
        setLoading(true);
        setNotFound(false);
        setLoadError(false);
      }
      try {
        const detail = await fetchOwnerBookingDetail(bookingId);
        setData(detail);
      } catch (e) {
        if (silent && dataRef.current?.booking) {
          return;
        }
        const cached = resolveCachedBooking(
          bookingId,
          bookingsRef.current,
          seededBookingRef.current ?? undefined
        );
        if (cached) {
          setData(ownerBookingDetailFromRow(cached, paymentsProvider === "stripe"));
          return;
        }
        if (e instanceof Error && e.message === "NOT_FOUND") {
          setNotFound(true);
          setData(null);
        } else if (!silent) {
          setLoadError(true);
          setData(null);
          const m = (e instanceof Error ? e.message : t("ownerReservas.detailLoadFail")).trim();
          toast.error(m || t("ownerReservas.detailLoadFail"));
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [bookingId, paymentsProvider, t]
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void loadRef.current(false);
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const pollId = window.setInterval(() => void loadRef.current(true), 5_000);
    return () => window.clearInterval(pollId);
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const fromList = bookings.find((b) => b.id === bookingId);
    if (!fromList) return;
    setData((prev) => {
      if (!prev || prev.booking.id !== bookingId) return prev;
      const prevRating = prev.booking.ratingRenter?.stars ?? null;
      const nextRating = fromList.ratingRenter?.stars ?? null;
      if (prev.booking.status === fromList.status && prevRating === nextRating) return prev;
      return { ...prev, booking: { ...prev.booking, ...fromList } };
    });
  }, [bookings, bookingId]);

  const b = data?.booking;
  const payment = data?.payment;
  const showActionsSection =
    b?.status === "PENDING" ||
    b?.status === "ACCEPTED" ||
    (b?.status === "COMPLETED" && !b.ratingRenter);

  const formatBookingDate = (ymd: string | undefined) => {
    if (!ymd) return "—";
    return format(parseYmd(ownerBookingYmd({ bookingDate: ymd })), "d MMMM yyyy", {
      locale: dayPickerLocale,
    });
  };

  const openReceipt = () => {
    if (payment?.receiptUrl) {
      window.open(payment.receiptUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast.message(t("ownerReservas.receiptUnavailable"));
  };

  if (loading) {
    return (
      <OwnerPanelPage bodyLayout="stack-tight">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </OwnerPanelPage>
    );
  }

  if (notFound) {
    return (
      <OwnerPanelPage bodyLayout="stack-tight">
        <div className="rounded-xl border border-dashed border-border/50 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">{t("ownerReservas.notFound")}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => navigate("/marinheiro/reservas")}>
            {t("ownerReservas.backToList")}
          </Button>
        </div>
      </OwnerPanelPage>
    );
  }

  if (loadError || !b) {
    return (
      <OwnerPanelPage bodyLayout="stack-tight">
        <div className="rounded-xl border border-dashed border-border/50 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">{t("ownerReservas.detailLoadFail")}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => navigate("/marinheiro/reservas")}>
            {t("ownerReservas.backToList")}
          </Button>
        </div>
      </OwnerPanelPage>
    );
  }

  const passengers = b.passengersAdults + b.passengersChildren;
  const opcionais: string[] = [];
  if (b.bbqKit) opcionais.push(t("ownerPanel.optionalBbqTitle"));
  if (b.jetSki) opcionais.push(t("ownerPanel.optionalJetTitle"));

  return (
    <OwnerPanelPage
      subtitle={b.boat.nome}
      meta={
        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", statusTone(b.status))}>
          {t(`ownerAgenda.status.${b.status}`)}
        </span>
      }
      bodyLayout="stack"
    >
      <OwnerSurface className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">{t("ownerReservas.detailTrip")}</h2>
        <div className="mt-2">
          <DetailRow label={t("ownerReservas.fieldDate")} value={formatBookingDate(b.bookingDate)} />
          <DetailRow
            label={t("ownerReservas.fieldTime")}
            value={b.embarkTime || t("reservar.embarkToArrangeShort")}
          />
          <DetailRow
            label={t("ownerReservas.fieldEmbark")}
            value={b.embarkLocation || t("reservar.embarkToArrangeShort")}
          />
          <DetailRow label={t("ownerReservas.fieldPassengers")} value={String(passengers)} />
          {opcionais.length > 0 ? (
            <DetailRow label={t("ownerReservas.fieldOptionals")} value={opcionais.join(", ")} />
          ) : null}
          {(b.routeIslands?.length ?? 0) > 0 ? (
            <DetailRow label={t("marinheiro.bookingRoute")} value={b.routeIslands!.join(", ")} />
          ) : null}
          <DetailRow label={t("ownerReservas.fieldTotal")} value={currency.format(b.totalCents / 100)} />
          {b.ownerNetCents != null ? (
            <DetailRow
              label={t("ownerReservas.fieldOwnerNet")}
              value={currency.format(b.ownerNetCents / 100)}
            />
          ) : null}
        </div>
      </OwnerSurface>

      <OwnerSurface className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">{t("ownerReservas.detailRenter")}</h2>
        <div className="mt-2">
          <DetailRow label={t("marinheiro.client")} value={b.renter.nome} />
          <DetailRow label={t("ownerReservas.fieldEmail")} value={b.renter.email} />
        </div>
        {b.ratingRenter ? (
          <div className="mt-3 rounded-lg border border-border/35 bg-muted/15 p-3">
            <p className="flex items-center gap-1 text-sm font-medium text-foreground">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
              {b.ratingRenter.stars}/5
            </p>
            {b.ratingRenter.comment ? (
              <p className="mt-1 text-sm text-muted-foreground">{b.ratingRenter.comment}</p>
            ) : null}
          </div>
        ) : null}
      </OwnerSurface>

      {b.rescheduleTitle ? (
        <OwnerSurface className="p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">{t("marinheiro.rescheduleJustificationHeading")}</h2>
          <OwnerRescheduleJustification b={b} t={t} />
        </OwnerSurface>
      ) : null}

      {b.decisionNote ? (
        <OwnerSurface className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">{t("ownerReservas.detailDecisionNote")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{b.decisionNote}</p>
        </OwnerSurface>
      ) : null}

      <OwnerSurface className="p-4 sm:p-5">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">{t("ownerReservas.detailPayment")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("ownerReservas.detailPaymentHint")}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {payment ? (
            <>
              <DetailRow
                label={t("ownerReservas.fieldProvider")}
                value={payment.provider === "STRIPE" ? "Stripe" : payment.provider || "—"}
              />
              <DetailRow
                label={t("ownerReservas.fieldPaymentStatus")}
                value={translateOwnerPaymentStatus(payment.status, t)}
              />
              {payment.paidAt ? (
                <DetailRow
                  label={t("ownerReservas.fieldPaidAt")}
                  value={dateTimeFmt.format(new Date(payment.paidAt))}
                />
              ) : null}
              {b.stripeFlowStatus ? (
                <DetailRow
                  label={t("ownerReservas.fieldStripeFlow")}
                  value={translateOwnerStripeFlowStatus(b.stripeFlowStatus, t)}
                />
              ) : null}
              {payment.transferStatus ? (
                <DetailRow
                  label={t("ownerReservas.fieldTransfer")}
                  value={translateOwnerTransferStatus(payment.transferStatus, t)}
                />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("ownerReservas.noPayment")}</p>
          )}
          {payment?.provider === "STRIPE" ? (
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full gap-2 sm:w-auto"
              onClick={openReceipt}
              disabled={!payment.receiptUrl}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              {payment.receiptUrl ? t("ownerReservas.openReceipt") : t("ownerReservas.receiptUnavailable")}
            </Button>
          ) : null}
        </div>
      </OwnerSurface>

      {showActionsSection ? (
        <OwnerSurface className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">{t("ownerReservas.detailActions")}</h2>
          <div className="mt-4">
            {b!.status === "PENDING" ? (
              <OwnerPendingBookingCard
                b={b}
                t={t}
                currencyFmt={currency}
                loading={bookingActions.loading}
                noteById={noteById}
                setNoteById={setNoteById}
                decide={async (id, action) => {
                  await decide(id, action);
                  await load(true);
                  void reload();
                }}
                paymentsProvider={paymentsProvider}
                expanded
                onToggleExpand={() => undefined}
                variant="detail"
              />
            ) : null}
            {b!.status === "ACCEPTED" ? (
              <MarinheiroAcceptedBookingCard
                b={b}
                t={t}
                currencyFmt={currency}
                loading={bookingActions.loading}
                dayDiff={ownerBookingDayDiff(b.bookingDate)}
                onComplete={async (id) => {
                  const ok = await complete(id);
                  if (ok) {
                    setData((prev) =>
                      prev?.booking.id === id
                        ? { ...prev, booking: { ...prev.booking, status: "COMPLETED" } }
                        : prev
                    );
                  }
                  await load(true);
                  void reload();
                  void reloadBookings();
                }}
                paymentsProvider={paymentsProvider}
                onStripePayout={async (id) => {
                  await startStripePayout(id);
                  await load(true);
                  void reload();
                }}
                onCancelAccepted={async (id, reason, scenario) => {
                  await cancelAccepted(id, reason, scenario);
                  await load(true);
                  void reload();
                }}
                variant="detail"
              />
            ) : null}
            {b!.status === "COMPLETED" && !b!.ratingRenter ? (
              <OwnerCompletedBookingCard
                b={b!}
                t={t}
                currencyFmt={currency}
                onRated={(rating) => {
                  if (rating) {
                    setData((prev) =>
                      prev?.booking.id === b!.id
                        ? {
                            ...prev,
                            booking: {
                              ...prev.booking,
                              ratingRenter: {
                                stars: rating.stars,
                                comment: rating.comment,
                                ratedAt: new Date().toISOString(),
                              },
                            },
                          }
                        : prev
                    );
                  }
                  void load(true);
                  void reload();
                  void reloadBookings();
                }}
                variant="detail"
              />
            ) : null}
          </div>
        </OwnerSurface>
      ) : null}
    </OwnerPanelPage>
  );
}
