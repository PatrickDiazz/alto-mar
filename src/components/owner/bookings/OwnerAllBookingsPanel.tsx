import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { ownerBookingDayDiff, ownerBookingYmd, type OwnerBookingRow } from "@/lib/ownerBookingTypes";
import { cn } from "@/lib/utils";
import {
  MarinheiroAcceptedBookingCard,
  OwnerCompletedBookingCard,
  OwnerPendingBookingCard,
} from "./OwnerBookingCards";

import type { OwnerBookingStatusFilter } from "@/lib/ownerBookingTypes";

export type StatusFilter = OwnerBookingStatusFilter;

export type OwnerAllBookingsPanelProps = {
  bookings: OwnerBookingRow[];
  loading: boolean;
  noteById: Record<string, string>;
  setNoteById: Dispatch<SetStateAction<Record<string, string>>>;
  paymentsProvider: "stripe" | "mercadopago";
  decide: (id: string, action: "accept" | "decline") => void;
  complete: (bookingId: string) => void;
  startStripePayout: (bookingId: string) => void;
  cancelAccepted: (
    bookingId: string,
    reason: string,
    scenario: "owner" | "weather" | "boat_failure"
  ) => void;
  reload?: () => void;
  filterBookingDate?: string;
  filterStatus?: StatusFilter;
  scrollToSection?: StatusFilter | null;
  className?: string;
};

function matchesFilters(
  b: OwnerBookingRow,
  filterBookingDate?: string,
  filterStatus?: StatusFilter
): boolean {
  if (filterBookingDate && ownerBookingYmd(b) !== filterBookingDate) return false;
  if (filterStatus && filterStatus !== "ALL" && b.status !== filterStatus) return false;
  return true;
}

function ArchivedBookingRow({
  b,
  t,
  currencyFmt,
}: {
  b: OwnerBookingRow;
  t: (k: string, o?: Record<string, unknown>) => string;
  currencyFmt: Intl.NumberFormat;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-border/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-foreground">{b.boat.nome}</p>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {t(`ownerAgenda.status.${b.status}`)}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("marinheiro.client")} {b.renter.nome}
      </p>
      {b.bookingDate ? (
        <p className="text-xs text-muted-foreground">
          {t("marinheiro.bookingDateLabel")}: {ownerBookingYmd(b)}
          {b.embarkTime ? ` · ${b.embarkTime}` : ""}
        </p>
      ) : null}
      <p className="text-xs font-medium text-foreground">
        {t("marinheiro.total")} {currencyFmt.format(b.totalCents / 100)}
      </p>
    </div>
  );
}

const SECTION_IDS: Partial<Record<StatusFilter, string>> = {
  PENDING: "owner-all-bookings-pending",
  ACCEPTED: "owner-all-bookings-accepted",
  COMPLETED: "owner-all-bookings-completed",
  DECLINED: "owner-all-bookings-declined",
  CANCELLED: "owner-all-bookings-cancelled",
};

export function OwnerAllBookingsPanel({
  bookings,
  loading,
  noteById,
  setNoteById,
  paymentsProvider,
  decide,
  complete,
  startStripePayout,
  cancelAccepted,
  reload,
  filterBookingDate,
  filterStatus,
  scrollToSection,
  className,
}: OwnerAllBookingsPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const currencyFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  const [mobileExpandedPendingId, setMobileExpandedPendingId] = useState<string | null>(null);

  const filteredBookings = useMemo(
    () => bookings.filter((b) => matchesFilters(b, filterBookingDate, filterStatus)),
    [bookings, filterBookingDate, filterStatus]
  );

  const pendentes = useMemo(
    () => filteredBookings.filter((b) => b.status === "PENDING"),
    [filteredBookings]
  );
  const aceitas = useMemo(
    () => filteredBookings.filter((b) => b.status === "ACCEPTED"),
    [filteredBookings]
  );
  const aceitasAtraso = useMemo(
    () =>
      aceitas.filter((b) => {
        const d = ownerBookingDayDiff(b.bookingDate);
        return d !== null && d < 0;
      }),
    [aceitas]
  );
  const aceitasEmCurso = useMemo(
    () =>
      aceitas.filter((b) => {
        const d = ownerBookingDayDiff(b.bookingDate);
        return d === null || d >= 0;
      }),
    [aceitas]
  );
  const concluidas = useMemo(
    () => filteredBookings.filter((b) => b.status === "COMPLETED"),
    [filteredBookings]
  );
  const recusadas = useMemo(
    () => filteredBookings.filter((b) => b.status === "DECLINED"),
    [filteredBookings]
  );
  const canceladas = useMemo(
    () => filteredBookings.filter((b) => b.status === "CANCELLED"),
    [filteredBookings]
  );

  useEffect(() => {
    if (mobileExpandedPendingId && !pendentes.some((b) => b.id === mobileExpandedPendingId)) {
      setMobileExpandedPendingId(null);
    }
  }, [pendentes, mobileExpandedPendingId]);

  useEffect(() => {
    if (!scrollToSection || scrollToSection === "ALL") return;
    const id = SECTION_IDS[scrollToSection];
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [scrollToSection]);

  const onRated = () => {
    reload?.();
  };

  const showSection = (status: StatusFilter, count: number) =>
    !filterStatus || filterStatus === "ALL" || filterStatus === status || count > 0;

  return (
    <div className={cn("space-y-5", className)}>
      {showSection("PENDING", pendentes.length) ? (
        <div id="owner-all-bookings-pending" className="scroll-mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">{t("marinheiro.pendingTitle")}</h3>
            <Badge variant="outline">{pendentes.length}</Badge>
          </div>
          {pendentes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("marinheiro.noPending")}</p>
          ) : (
            <div className="space-y-3">
              {pendentes.map((b) => (
                <OwnerPendingBookingCard
                  key={b.id}
                  b={b}
                  t={t}
                  currencyFmt={currencyFmt}
                  loading={loading}
                  noteById={noteById}
                  setNoteById={setNoteById}
                  decide={decide}
                  paymentsProvider={paymentsProvider}
                  expanded={mobileExpandedPendingId === b.id}
                  onToggleExpand={() =>
                    setMobileExpandedPendingId((id) => (id === b.id ? null : b.id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {aceitasAtraso.length > 0 && showSection("ACCEPTED", aceitas.length) ? (
        <div id="owner-all-bookings-accepted-overdue" className="scroll-mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">{t("marinheiro.acceptedOverdueTitle")}</h3>
            <Badge variant="outline" className="border-amber-600/60 text-amber-950 dark:text-amber-100">
              {aceitasAtraso.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {aceitasAtraso.map((b) => (
              <MarinheiroAcceptedBookingCard
                key={b.id}
                b={b}
                t={t}
                currencyFmt={currencyFmt}
                loading={loading}
                dayDiff={ownerBookingDayDiff(b.bookingDate)}
                onComplete={complete}
                paymentsProvider={paymentsProvider}
                onStripePayout={startStripePayout}
                onCancelAccepted={cancelAccepted}
              />
            ))}
          </div>
        </div>
      ) : null}

      {showSection("ACCEPTED", aceitas.length) ? (
        <div id="owner-all-bookings-accepted" className="scroll-mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">{t("marinheiro.acceptedTitle")}</h3>
            <Badge variant="outline">{aceitasEmCurso.length}</Badge>
          </div>
          {aceitas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("marinheiro.noAccepted")}</p>
          ) : aceitasEmCurso.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("marinheiro.noUpcomingAccepted")}</p>
          ) : (
            <div className="space-y-3">
              {aceitasEmCurso.map((b) => (
                <MarinheiroAcceptedBookingCard
                  key={b.id}
                  b={b}
                  t={t}
                  currencyFmt={currencyFmt}
                  loading={loading}
                  dayDiff={ownerBookingDayDiff(b.bookingDate)}
                  onComplete={complete}
                  paymentsProvider={paymentsProvider}
                  onStripePayout={startStripePayout}
                  onCancelAccepted={cancelAccepted}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {showSection("COMPLETED", concluidas.length) ? (
        <div id="owner-all-bookings-completed" className="scroll-mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">{t("marinheiro.completedTitle")}</h3>
            <Badge variant="outline">{concluidas.length}</Badge>
          </div>
          {concluidas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("marinheiro.noCompleted")}</p>
          ) : (
            <div className="space-y-3">
              {concluidas.map((b) => (
                <OwnerCompletedBookingCard
                  key={b.id}
                  b={b}
                  t={t}
                  currencyFmt={currencyFmt}
                  onRated={onRated}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {showSection("DECLINED", recusadas.length) ? (
        <div id="owner-all-bookings-declined" className="scroll-mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">{t("ownerAgenda.declinedTitle")}</h3>
            <Badge variant="outline">{recusadas.length}</Badge>
          </div>
          {recusadas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("ownerAgenda.declinedEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {recusadas.map((b) => (
                <ArchivedBookingRow key={b.id} b={b} t={t} currencyFmt={currencyFmt} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {showSection("CANCELLED", canceladas.length) ? (
        <div id="owner-all-bookings-cancelled" className="scroll-mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">{t("ownerAgenda.cancelledTitle")}</h3>
            <Badge variant="outline">{canceladas.length}</Badge>
          </div>
          {canceladas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("ownerAgenda.cancelledEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {canceladas.map((b) => (
                <ArchivedBookingRow key={b.id} b={b} t={t} currencyFmt={currencyFmt} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
