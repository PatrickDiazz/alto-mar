import { useEffect, useMemo, useState, useCallback, type ComponentProps } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";
import { enUS, es, ptBR } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { addDays, format } from "date-fns";
import { AlertCircle, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Plus, Search, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerBookingPreviewStrip } from "@/components/owner/bookings/OwnerBookingCompactRow";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { cn } from "@/lib/utils";
import { useOwnerPanel } from "@/contexts/OwnerPanelContext";
import { useMatchMediaLgUp } from "@/hooks/useMatchMediaLgUp";
import { ownerBookingYmd, type OwnerBookingRow, type OwnerBookingStatusFilter } from "@/lib/ownerBookingTypes";
import {
  ownerBookingPreviewSurfaceClass,
  ownerBookingStatusDisplayLabel,
  ownerBookingStatusVariant,
} from "@/lib/ownerBookingTiming";
import { OwnerBookingWhenAmountLine } from "@/components/owner/bookings/BookingCountdownBadge";
import { reservationStatusTone } from "@/components/owner/reservations/reservationUi";

const agendaDayPickerIcons = {
  IconLeft: ({ className, ...props }: ComponentProps<typeof ChevronLeft>) => (
    <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
  ),
  IconRight: ({ className, ...props }: ComponentProps<typeof ChevronRight>) => (
    <ChevronRight className={cn("h-4 w-4", className)} {...props} />
  ),
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

const UPCOMING_SIDEBAR_DAYS = 3;

function isActiveBookingStatus(status: string): boolean {
  return status === "PENDING" || status === "ACCEPTED";
}

function priorityScore(status: string): number {
  if (status === "PENDING") return 5;
  if (status === "ACCEPTED") return 4;
  if (status === "COMPLETED") return 3;
  if (status === "DECLINED") return 2;
  if (status === "CANCELLED") return 1;
  return 0;
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function monthPrefix(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function OwnerAgendaPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDate = searchParams.get("date");
  const selectedStatus = (searchParams.get("status") as OwnerBookingStatusFilter | null) ?? "ALL";
  const searchText = searchParams.get("q") ?? "";
  const { boats, bookings: allBookings, loading } = useOwnerPanel();
  const bookings = useMemo(
    () => allBookings.filter((b) => Boolean(b.bookingDate)),
    [allBookings]
  );

  const [month, setMonth] = useState(() => new Date());
  const [filterTransition, setFilterTransition] = useState(false);
  const [withoutBookingsExpanded, setWithoutBookingsExpanded] = useState(false);

  const lgUp = useMatchMediaLgUp();
  const locale = bcp47FromAppLang(i18n.language);
  const dayPickerLocale = localeForLang(i18n.language);
  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  useEffect(() => {
    setFilterTransition(true);
    const timer = window.setTimeout(() => setFilterTransition(false), 260);
    return () => window.clearTimeout(timer);
  }, [selectedDate, selectedStatus, searchText]);

  useEffect(() => {
    if (selectedDate) setWithoutBookingsExpanded(false);
  }, [selectedDate]);

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const key = String(b.bookingDate || "").slice(0, 10);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  const highlightedDays = useMemo(() => {
    return [...countByDate.keys()].map(parseYmd);
  }, [countByDate]);

  const todayYmd = useMemo(() => ymd(new Date()), []);

  const monthStats = useMemo(() => {
    const prefix = monthPrefix(month);
    const dates = new Set<string>();
    let reservationCount = 0;
    for (const b of bookings) {
      const key = ownerBookingYmd(b);
      if (!key.startsWith(prefix)) continue;
      dates.add(key);
      reservationCount += 1;
    }
    return {
      reservationCount,
      daysWithBookings: dates.size,
      daysInMonth: daysInMonth(month),
    };
  }, [bookings, month]);

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return bookings
      .filter((b) => ownerBookingYmd(b) === selectedDate)
      .sort((a, b) => priorityScore(b.status) - priorityScore(a.status));
  }, [bookings, selectedDate]);

  const selectedDayStats = useMemo(() => {
    const pending = selectedDayBookings.filter((b) => b.status === "PENDING").length;
    const accepted = selectedDayBookings.filter((b) => b.status === "ACCEPTED").length;
    const completed = selectedDayBookings.filter((b) => b.status === "COMPLETED").length;
    const revenueCents = selectedDayBookings
      .filter((b) => b.status === "PENDING" || b.status === "ACCEPTED" || b.status === "COMPLETED")
      .reduce((sum, b) => sum + b.totalCents, 0);
    return {
      pending,
      accepted,
      completed,
      total: selectedDayBookings.length,
      revenueCents,
    };
  }, [selectedDayBookings]);

  const upcomingBookings = useMemo(() => {
    const end = ymd(addDays(new Date(), UPCOMING_SIDEBAR_DAYS));
    return bookings
      .filter((b) => {
        const d = ownerBookingYmd(b);
        return (
          d >= todayYmd &&
          d <= end &&
          b.status !== "CANCELLED" &&
          b.status !== "DECLINED"
        );
      })
      .sort((a, b) => {
        const cmp = ownerBookingYmd(a).localeCompare(ownerBookingYmd(b));
        if (cmp !== 0) return cmp;
        return (a.embarkTime || "").localeCompare(b.embarkTime || "");
      })
      .slice(0, 4);
  }, [bookings, todayYmd]);

  const actionAlerts = useMemo(() => {
    const end = ymd(addDays(new Date(), 7));
    const pending = bookings.filter((b) => b.status === "PENDING").length;
    const inProgressToday = bookings.filter(
      (b) => b.status === "ACCEPTED" && ownerBookingYmd(b) === todayYmd
    ).length;
    const acceptedSoon = bookings.filter((b) => {
      const d = ownerBookingYmd(b);
      return b.status === "ACCEPTED" && d > todayYmd && d <= end;
    }).length;
    return { pending, inProgressToday, acceptedSoon };
  }, [bookings, todayYmd]);

  const bookedBoatIdsOnSelectedDay = useMemo(() => {
    if (!selectedDate) return null;
    const set = new Set<string>();
    bookings.forEach((b) => {
      if (String(b.bookingDate).slice(0, 10) === selectedDate) set.add(b.boat.id);
    });
    return set;
  }, [bookings, selectedDate]);

  const bookingsByBoat = useMemo(() => {
    const map = new Map<string, OwnerBookingRow[]>();
    bookings.forEach((b) => {
      const key = b.boat.id;
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    });
    return map;
  }, [bookings]);

  const filteredBoats = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return boats.filter((boat) => {
      if (bookedBoatIdsOnSelectedDay && !bookedBoatIdsOnSelectedDay.has(boat.id)) return false;
      const list = bookingsByBoat.get(boat.id) ?? [];
      const matchesSearch =
        !q ||
        boat.nome.toLowerCase().includes(q) ||
        boat.descricao.toLowerCase().includes(q) ||
        list.some((b) => b.renter.nome.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (selectedStatus === "ALL") return true;
      return list.some((b) => b.status === selectedStatus);
    });
  }, [boats, bookedBoatIdsOnSelectedDay, bookingsByBoat, searchText, selectedStatus]);

  const bookingsVisibleForBoat = useCallback(
    (boatId: string) => {
      const list = bookingsByBoat.get(boatId) ?? [];
      return list
        .filter((b) => {
          if (selectedDate && ownerBookingYmd(b) !== selectedDate) return false;
          if (selectedStatus !== "ALL" && b.status !== selectedStatus) return false;
          if (selectedStatus === "ALL" && !isActiveBookingStatus(b.status)) return false;
          return true;
        })
        .sort((a, b) => priorityScore(b.status) - priorityScore(a.status));
    },
    [bookingsByBoat, selectedDate, selectedStatus]
  );

  const groupedBoats = useMemo(() => {
    const withBookings: typeof filteredBoats = [];
    const withoutBookings: typeof filteredBoats = [];

    filteredBoats.forEach((boat) => {
      const visible = bookingsVisibleForBoat(boat.id);
      if (visible.length > 0) withBookings.push(boat);
      else withoutBookings.push(boat);
    });

    withBookings.sort((a, b) => {
      const aList = bookingsVisibleForBoat(a.id);
      const bList = bookingsVisibleForBoat(b.id);
      const aTop = Math.max(0, ...aList.map((x) => priorityScore(x.status)));
      const bTop = Math.max(0, ...bList.map((x) => priorityScore(x.status)));
      if (aTop !== bTop) return bTop - aTop;
      return (bList.length || 0) - (aList.length || 0);
    });

    return { withBookings, withoutBookings };
  }, [filteredBoats, bookingsVisibleForBoat]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value == null || value === "" || value === "ALL") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const openReservas = (opts?: {
    boat?: string;
    status?: OwnerBookingStatusFilter;
    bookingId?: string;
    booking?: OwnerBookingRow;
  }) => {
    if (opts?.bookingId) {
      navigate(`/marinheiro/reservas/${encodeURIComponent(opts.bookingId)}`, {
        state: opts.booking ? { booking: opts.booking } : undefined,
      });
      return;
    }
    const params = new URLSearchParams();
    if (opts?.boat) params.set("boat", opts.boat);
    if (opts?.status && opts.status !== "ALL") params.set("status", opts.status);
    const q = params.toString();
    navigate(q ? `/marinheiro/reservas?${q}` : "/marinheiro/reservas");
  };

  const formatBookingWhen = (b: OwnerBookingRow, showDate: boolean) => {
    const parts: string[] = [];
    if (showDate) {
      parts.push(format(parseYmd(ownerBookingYmd(b)), "d MMM", { locale: dayPickerLocale }));
    }
    if (b.embarkTime) parts.push(b.embarkTime);
    return parts.join(" · ") || "—";
  };

  const renderBoatCard = (boatId: string) => {
    const boat = boats.find((x) => x.id === boatId);
    if (!boat) return null;
    const list = bookingsVisibleForBoat(boat.id);
    const activeCount = list.length;

    return (
      <article
        id={`owner-boat-${boat.id}`}
        key={boat.id}
        className={cn(
          "overflow-hidden rounded-xl border border-border/45 bg-transparent transition-all duration-300",
          "hover:border-primary/30"
        )}
      >
        <button
          type="button"
          onClick={() => openReservas({ boat: boat.id })}
          className="flex w-full items-start gap-3 p-3 text-left md:p-4"
        >
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted md:h-20 md:w-24">
            {boat.imagens[0] ? (
              <img src={boat.imagens[0]} alt={boat.nome} className="h-full w-full object-cover" loading="lazy" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground md:text-base">{boat.nome}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{boat.descricao}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {activeCount > 0
                  ? t("ownerAgenda.boatReservationsN", { count: activeCount })
                  : t("ownerAgenda.noReservationsShort")}
              </Badge>
              <span className={cn("text-[10px] font-medium", boat.ativo ? "text-emerald-500" : "text-muted-foreground")}>
                {boat.ativo ? t("ownerPanel.boatActive") : t("ownerPanel.boatInactive")}
              </span>
            </div>
          </div>
        </button>
        {list.length > 0 ? (
          <div className="space-y-1.5 border-t border-border/25 px-3 pb-3 md:px-4">
            {list.map((booking) => (
              <OwnerBookingPreviewStrip
                key={booking.id}
                booking={booking}
                whenLabel={formatBookingWhen(booking, true)}
                statusLabel={ownerBookingStatusDisplayLabel(booking, t)}
                amountLabel={currency.format(booking.totalCents / 100)}
                onClick={() => openReservas({ bookingId: booking.id, booking })}
              />
            ))}
          </div>
        ) : null}
      </article>
    );
  };

  const renderSidebarBooking = (booking: OwnerBookingRow, showDate: boolean) => {
    const statusVariant = ownerBookingStatusVariant(booking);
    const whenBase = formatBookingWhen(booking, showDate);
    return (
      <button
        key={booking.id}
        type="button"
        onClick={() => openReservas({ bookingId: booking.id, booking })}
        className={cn(
          "w-full rounded-lg border p-2 text-left transition-colors",
          ownerBookingPreviewSurfaceClass(booking)
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs font-medium text-foreground">{booking.boat.nome}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
              reservationStatusTone(statusVariant)
            )}
          >
            {ownerBookingStatusDisplayLabel(booking, t)}
          </span>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{booking.renter.nome}</p>
        <OwnerBookingWhenAmountLine
          className="mt-0.5 text-[10px] leading-tight"
          whenLabel={whenBase}
          amountLabel={currency.format(booking.totalCents / 100)}
          booking={booking}
        />
      </button>
    );
  };

  const DayContent = ({ date }: { date: Date }) => {
    const key = ymd(date);
    const count = countByDate.get(key) ?? 0;
    return (
      <div className="relative flex h-7 w-7 items-center justify-center text-xs">
        <span>{date.getDate()}</span>
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[14px] rounded-full bg-primary px-0.5 text-center text-[9px] font-bold leading-tight text-primary-foreground">
            {count}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <OwnerPanelPage
      toolbar={
        <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder={t("ownerAgenda.searchPlaceholder")}
              className="pl-8"
            />
          </div>
          <Select value={selectedStatus} onValueChange={(v) => setParam("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("ownerAgenda.filterAll")}</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="ACCEPTED">ACCEPTED</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
              <SelectItem value="DECLINED">DECLINED</SelectItem>
              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      bodyLayout="grid-agenda"
    >
      <section className="order-2 space-y-3 lg:order-1">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : groupedBoats.withBookings.length === 0 && groupedBoats.withoutBookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-transparent p-8 text-center">
            <p className="text-sm font-medium text-foreground">{t("ownerAgenda.emptyTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("ownerAgenda.emptyDesc")}</p>
          </div>
        ) : (
          <div className={cn("space-y-3 transition-opacity duration-300", filterTransition && "opacity-60")}>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{t("ownerAgenda.withReservations")}</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openReservas()}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("ownerAgenda.seeAllBookings")}
                  </button>
                  <Badge variant="secondary">{groupedBoats.withBookings.length}</Badge>
                </div>
              </div>
              <div className="space-y-2">{groupedBoats.withBookings.map((b) => renderBoatCard(b.id))}</div>
            </div>

            {selectedDate ? null : groupedBoats.withoutBookings.length > 0 ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setWithoutBookingsExpanded((open) => !open)}
                  aria-expanded={withoutBookingsExpanded}
                  aria-controls="owner-agenda-without-bookings"
                  className="mb-2 flex w-full items-center justify-between gap-2 rounded-lg border border-border/35 px-3 py-2.5 text-left transition-colors hover:bg-muted/20"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        withoutBookingsExpanded && "rotate-180"
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-muted-foreground">
                        {t("ownerAgenda.withoutReservations")}
                      </span>
                      {!withoutBookingsExpanded ? (
                        <span className="block text-[11px] text-muted-foreground/80">
                          {t("ownerAgenda.withoutReservationsHint", {
                            count: groupedBoats.withoutBookings.length,
                          })}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {groupedBoats.withoutBookings.length}
                  </Badge>
                </button>
                {withoutBookingsExpanded ? (
                  <div id="owner-agenda-without-bookings" className="space-y-2">
                    {groupedBoats.withoutBookings.map((b) => renderBoatCard(b.id))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <aside className="order-1 lg:order-2">
        <div className="sticky top-20 rounded-xl border border-border/40 bg-transparent p-2 md:p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">{t("ownerAgenda.calendarTitle")}</h2>
            {selectedDate ? (
              <button
                type="button"
                onClick={() => setParam("date", null)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("ownerAgenda.clearDay")}
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(240px,auto)_minmax(0,1fr)] sm:items-start">
            <div className="mx-auto w-fit shrink-0 sm:mx-0 sm:border-r sm:border-border/25 sm:pr-4 lg:max-w-none">
              {loading ? (
                <Skeleton
                  className={cn(
                    "w-[240px] rounded-xl",
                    lgUp ? "h-[460px]" : "h-[220px]"
                  )}
                />
              ) : (
                <DayPicker
                  locale={dayPickerLocale}
                  mode="single"
                  numberOfMonths={lgUp ? 2 : 1}
                  month={month}
                  onMonthChange={setMonth}
                  selected={selectedDate ? parseYmd(selectedDate) : undefined}
                  onSelect={(d) => setParam("date", d ? ymd(d) : null)}
                  modifiers={{ highlighted: highlightedDays }}
                  modifiersClassNames={{
                    highlighted:
                      "bg-primary/10 text-foreground font-semibold ring-1 ring-primary/30 hover:bg-primary/15",
                  }}
                  className={cn("owner-agenda-calendar p-0", lgUp && "owner-calendar-outer-nav")}
                  classNames={{
                    months: cn("flex flex-col", lgUp && "gap-3"),
                    month: cn(
                      "space-y-2",
                      lgUp && "border-b border-border/30 pb-3 last:border-b-0 last:pb-0"
                    ),
                    caption: "relative mb-1 flex min-h-8 items-center justify-between gap-2",
                    caption_label: "min-w-0 flex-1 text-left text-sm font-semibold text-foreground",
                    nav: "ml-auto flex shrink-0 items-center justify-end gap-1",
                    nav_button:
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-foreground hover:bg-muted dark:border-0 dark:bg-secondary",
                    table: "w-auto border-collapse",
                    head_row: "",
                    head_cell: "h-8 w-9 text-center text-[10px] font-medium text-muted-foreground/55",
                    row: "mt-0.5",
                    cell: "relative h-9 w-9 p-0 text-center text-sm",
                    day: "h-9 w-9 rounded-lg p-0 transition-colors hover:bg-muted",
                    day_selected:
                      "!bg-primary !text-primary-foreground hover:!bg-primary/90",
                    day_today: "ring-1 ring-primary/50",
                  }}
                  components={{ ...agendaDayPickerIcons, DayContent }}
                />
              )}
            </div>

            <div className="min-w-0 space-y-4 sm:pl-1">
              {!loading ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex h-2.5 w-2.5 rounded-sm bg-primary/20 ring-1 ring-primary/40" />
                    <span>{t("ownerAgenda.legendHighlighted")}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/80">
                    {t("ownerAgenda.monthOccupancy", {
                      booked: monthStats.daysWithBookings,
                      total: monthStats.daysInMonth,
                    })}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80">
                    {t("ownerAgenda.monthReservationsN", { count: monthStats.reservationCount })}
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </>
            ) : selectedDate ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-foreground">
                  {t("ownerAgenda.daySummaryTitle")}
                </h3>
                {selectedDayStats.total === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("ownerAgenda.daySummaryEmpty")}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDayStats.pending > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t("ownerAgenda.status.PENDING")} · {selectedDayStats.pending}
                        </Badge>
                      ) : null}
                      {selectedDayStats.accepted > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t("ownerAgenda.status.ACCEPTED")} · {selectedDayStats.accepted}
                        </Badge>
                      ) : null}
                      {selectedDayStats.completed > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t("ownerAgenda.status.COMPLETED")} · {selectedDayStats.completed}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[11px] font-medium text-foreground">
                      {t("ownerAgenda.dayRevenue", {
                        amount: currency.format(selectedDayStats.revenueCents / 100),
                      })}
                    </p>
                    <div className="space-y-1.5">
                      {selectedDayBookings.slice(0, 4).map((b) => renderSidebarBooking(b, false))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    {t("ownerAgenda.upcomingTitle")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => openReservas()}
                    className="text-[10px] font-medium text-primary hover:underline"
                  >
                    {t("ownerAgenda.seeAllBookings")}
                  </button>
                </div>
                {upcomingBookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("ownerAgenda.upcomingEmpty")}</p>
                ) : (
                  <div className="space-y-1.5">
                    {upcomingBookings.map((b) => renderSidebarBooking(b, true))}
                  </div>
                )}
              </div>
            )}

            {!loading &&
            (actionAlerts.pending > 0 ||
              actionAlerts.inProgressToday > 0 ||
              actionAlerts.acceptedSoon > 0) ? (
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  {t("ownerAgenda.alertsTitle")}
                </h3>
                <div className="space-y-1.5">
                  {actionAlerts.pending > 0 ? (
                    <button
                      type="button"
                      onClick={() => openReservas({ status: "PENDING" })}
                      className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-left text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-200"
                    >
                      {t("ownerAgenda.alertPending", { count: actionAlerts.pending })}
                    </button>
                  ) : null}
                  {actionAlerts.inProgressToday > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setParam("date", todayYmd);
                      }}
                      className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-left text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-200"
                    >
                      {t("ownerAgenda.alertInProgressToday", { count: actionAlerts.inProgressToday })}
                    </button>
                  ) : null}
                  {actionAlerts.acceptedSoon > 0 ? (
                    <button
                      type="button"
                      onClick={() => openReservas({ status: "ACCEPTED" })}
                      className="w-full rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-2 text-left text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      {t("ownerAgenda.alertAcceptedSoon", { count: actionAlerts.acceptedSoon })}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!loading ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-foreground">{t("ownerAgenda.shortcutsTitle")}</h3>
                <div className="flex flex-col gap-1.5">
                  {actionAlerts.pending > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 justify-start text-xs"
                      onClick={() => openReservas({ status: "PENDING" })}
                    >
                      {t("ownerAgenda.shortcutPending")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    onClick={() => navigate("/marinheiro/embarcacoes/novo")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("ownerAgenda.shortcutRegisterBoat")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    onClick={() => navigate("/marinheiro/embarcacoes")}
                  >
                    <Ship className="h-3.5 w-3.5" />
                    {t("ownerAgenda.shortcutBoats")}
                  </Button>
                </div>
              </div>
            ) : null}
              </div>

              <p className="text-[10px] text-muted-foreground/70">{t("ownerAgenda.calendarHint")}</p>
            </div>
          </div>
        </div>
      </aside>
    </OwnerPanelPage>
  );
}

