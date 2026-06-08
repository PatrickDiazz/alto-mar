import { useMemo, useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationFilters } from "@/components/owner/reservations/ReservationFilters";
import { ReservationListCard } from "@/components/owner/reservations/ReservationListCard";
import { ReservationSection } from "@/components/owner/reservations/ReservationSection";
import { ReservationSummaryCard } from "@/components/owner/reservations/ReservationSummaryCard";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import {
  computeReservationMetrics,
  filterBookingsByBoat,
  reservationCompletedGridClass,
  reservationListStackClass,
  reservationListRowClass,
  reservationMainGridClass,
  reservationTopPanelMinHeightClass,
  splitReservationLists,
} from "@/components/owner/reservations/reservationUi";
import {
  ownerBookingStatusDisplayLabel,
} from "@/lib/ownerBookingTiming";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { useOwnerBookings } from "@/hooks/useOwnerBookings";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { ownerBookingYmd, type OwnerBookingRow } from "@/lib/ownerBookingTypes";
import { cn } from "@/lib/utils";

type ReservasLocationState = { editBoatId?: string; registerBoat?: boolean };

const LIST_PREVIEW = 3;

function parseYmd(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

function sortBookingsByDateAsc(a: OwnerBookingRow, b: OwnerBookingRow): number {
  return (
    ownerBookingYmd(a).localeCompare(ownerBookingYmd(b)) ||
    (a.embarkTime || "").localeCompare(b.embarkTime || "")
  );
}

function applySearchFilter(bookings: OwnerBookingRow[], searchText: string): OwnerBookingRow[] {
  const q = searchText.trim().toLowerCase();
  if (!q) return bookings;
  return bookings.filter(
    (b) =>
      b.boat.nome.toLowerCase().includes(q) ||
      b.renter.nome.toLowerCase().includes(q) ||
      b.renter.email.toLowerCase().includes(q)
  );
}

function SectionSeeAll({
  count,
  expanded,
  onToggle,
  seeAllLabel,
  seeLessLabel,
}: {
  count: number;
  expanded: boolean;
  onToggle: () => void;
  seeAllLabel: string;
  seeLessLabel: string;
}) {
  if (count <= LIST_PREVIEW) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 text-sm font-medium text-primary transition-colors hover:underline"
    >
      {expanded ? seeLessLabel : seeAllLabel}
    </button>
  );
}

function statusLabelForBooking(
  booking: OwnerBookingRow,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return ownerBookingStatusDisplayLabel(booking, t);
}

export default function OwnerReservasListPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const boatFilter = searchParams.get("boat");
  const searchText = searchParams.get("q") ?? "";
  const isSearching = searchText.trim().length > 0;
  const { boats } = useOwnerPanel();
  const { bookings: allBookings, loading } = useOwnerBookings();

  const [expandedCompleted, setExpandedCompleted] = useState(false);
  const [expandedArchived, setExpandedArchived] = useState(false);

  const locale = bcp47FromAppLang(i18n.language);
  const dayPickerLocale = localeForLang(i18n.language);
  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  const boatImageById = useMemo(() => {
    const map = new Map<string, string>();
    boats.forEach((b) => {
      if (b.imagens[0]) map.set(b.id, b.imagens[0]);
    });
    return map;
  }, [boats]);

  const baseBookings = useMemo(
    () => filterBookingsByBoat(allBookings, boatFilter),
    [allBookings, boatFilter]
  );

  const metrics = useMemo(() => computeReservationMetrics(baseBookings), [baseBookings]);

  const { inCourse, upcoming, completed, archived } = useMemo(
    () => splitReservationLists(baseBookings),
    [baseBookings]
  );

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return applySearchFilter(baseBookings, searchText).sort(sortBookingsByDateAsc);
  }, [baseBookings, searchText, isSearching]);

  const boatName = boatFilter ? boats.find((b) => b.id === boatFilter)?.nome : null;

  const formatWhen = (b: OwnerBookingRow) => {
    const ymd = ownerBookingYmd(b);
    if (!ymd) return "—";
    return format(parseYmd(ymd), "d MMM yyyy", { locale: dayPickerLocale });
  };

  const bookingDetailPath = (id: string) => `/marinheiro/reservas/${encodeURIComponent(id)}`;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const renderList = (
    items: OwnerBookingRow[],
    expanded: boolean,
    emptyMessage: string,
    layout: "row" | "grid" | "stack" = "row"
  ) => {
    if (items.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      );
    }
    const visible = layout === "stack" ? items : expanded ? items : items.slice(0, LIST_PREVIEW);
    const cardVariant = layout === "row" ? "tile" : "inline";
    const listClass =
      layout === "grid"
        ? reservationCompletedGridClass
        : layout === "stack"
          ? reservationListStackClass
          : reservationListRowClass;
    return (
      <div className={listClass}>
        {visible.map((b) => (
          <ReservationListCard
            key={b.id}
            variant={cardVariant}
            booking={b}
            boatImageUrl={boatImageById.get(b.boat.id)}
            dateLabel={formatWhen(b)}
            amountLabel={currency.format(b.totalCents / 100)}
            statusLabel={statusLabelForBooking(b, t)}
            to={bookingDetailPath(b.id)}
          />
        ))}
      </div>
    );
  };

  const routeState = (location.state as ReservasLocationState | null) ?? null;
  if (routeState?.registerBoat) {
    return <Navigate to="/marinheiro/embarcacoes/novo" replace state={null} />;
  }
  if (routeState?.editBoatId) {
    return <Navigate to={`/marinheiro/embarcacoes/${routeState.editBoatId}`} replace state={null} />;
  }

  return (
    <OwnerPanelPage
      subtitle={t("ownerReservas.subtitle")}
      meta={
        boatName ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{boatName}</Badge>
            <button
              type="button"
              onClick={() => setParam("boat", null)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("ownerReservas.clearBoatFilter")}
            </button>
          </div>
        ) : null
      }
      toolbar={
        <ReservationFilters
          searchValue={searchText}
          onSearchChange={(v) => setParam("q", v)}
          searchPlaceholder={t("ownerReservas.searchPlaceholderShort")}
        />
      }
      bodyLayout="none"
    >
      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(240px,260px)]">
            <Skeleton className="h-[18.25rem] rounded-xl" />
            <Skeleton className="h-[18.25rem] rounded-xl" />
            <Skeleton className="h-[18.25rem] rounded-xl" />
          </div>
          <div className={reservationCompletedGridClass}>
            <Skeleton className="h-[88px] rounded-lg" />
            <Skeleton className="h-[88px] rounded-lg" />
          </div>
        </div>
      ) : !isSearching && baseBookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 px-4 py-16 text-center">
          <p className="text-sm font-medium text-foreground">{t("ownerReservas.emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("ownerReservas.emptyDesc")}</p>
        </div>
      ) : (
        <div className={cn(reservationMainGridClass)}>
          {isSearching ? (
            <ReservationSection
              title={t("ownerReservas.searchResultsTitle")}
              className={cn("flex flex-col lg:col-span-2", reservationTopPanelMinHeightClass)}
            >
              {searchResults.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("ownerReservas.searchNoResults")}
                </p>
              ) : (
                renderList(searchResults, false, t("ownerReservas.searchNoResults"), "stack")
              )}
            </ReservationSection>
          ) : (
            <>
              <ReservationSection
                title={t("ownerReservas.columnInCourse")}
                titleBadge={
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                }
                className={cn("flex flex-col", reservationTopPanelMinHeightClass)}
              >
                {renderList(inCourse, false, t("ownerReservas.emptyInCourse"), "stack")}
              </ReservationSection>

              <ReservationSection
                title={t("ownerReservas.columnUpcoming")}
                titleBadge={<span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                className={cn("flex flex-col", reservationTopPanelMinHeightClass)}
              >
                {renderList(upcoming, false, t("ownerReservas.emptyUpcoming"), "stack")}
              </ReservationSection>
            </>
          )}

          <ReservationSummaryCard
            title={t("ownerReservas.summaryTitle")}
            periodLabel={t("ownerReservas.periodThisMonth")}
            metrics={metrics}
            className={cn("h-full", reservationTopPanelMinHeightClass)}
            labels={{
              inCourse: t("ownerReservas.metricInCourse"),
              inCourseHint: t("ownerReservas.metricNow"),
              upcoming: t("ownerReservas.metricUpcoming"),
              upcomingHint: t("ownerReservas.metricNext7Days"),
              completed: t("ownerReservas.metricCompleted"),
              completedHint: t("ownerReservas.metricThisMonth"),
              cancelled: t("ownerReservas.metricCancelled"),
              cancelledHint: t("ownerReservas.metricThisMonth"),
            }}
          />

          <ReservationSection
            title={t("ownerReservas.columnCompletedRecent")}
            className="lg:col-span-2"
            action={
              <SectionSeeAll
                count={completed.length}
                expanded={expandedCompleted}
                onToggle={() => setExpandedCompleted((v) => !v)}
                seeAllLabel={t("ownerReservas.seeAllCount", { count: completed.length })}
                seeLessLabel={t("ownerReservas.seeLess")}
              />
            }
          >
            {renderList(completed, expandedCompleted, t("ownerReservas.emptyCompleted"), "grid")}
          </ReservationSection>

          {archived.length > 0 ? (
            <ReservationSection
              title={t("ownerReservas.sectionArchived")}
              className="lg:col-span-3"
              collapsible
              expanded={expandedArchived}
              onExpandedChange={setExpandedArchived}
            >
              <div className={cn(reservationCompletedGridClass, "opacity-90")}>
                {archived.map((b) => (
                  <ReservationListCard
                    key={b.id}
                    booking={b}
                    boatImageUrl={boatImageById.get(b.boat.id)}
                    dateLabel={formatWhen(b)}
                    amountLabel={currency.format(b.totalCents / 100)}
                    statusLabel={t(`ownerAgenda.status.${b.status}`)}
                    to={bookingDetailPath(b.id)}
                  />
                ))}
              </div>
            </ReservationSection>
          ) : null}
        </div>
      )}
    </OwnerPanelPage>
  );
}
