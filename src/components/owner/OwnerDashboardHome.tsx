import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";
import { CalendarCheck, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { cn } from "@/lib/utils";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import { topRatedBoats, parseOwnerBoatRating, type OwnerBoatRecord } from "@/lib/ownerBoats";
import { buildOwnerOptionalsCatalogFromApi } from "@/lib/ownerOptionalsCatalog";
import type { OwnerOptionalRecord } from "@/lib/ownerOptionalsApi";
import type { OwnerDashboardStats } from "@/lib/ownerDashboardApi";
import {
  ownerBookingYmd,
  ownerUpcomingActiveBookings,
  type OwnerBookingRow,
} from "@/lib/ownerBookingTypes";

const DASHBOARD_UPCOMING_LIMIT = 3;

function parseBookingYmd(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function bookingStatusTone(status: string) {
  if (status === "ACCEPTED") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
  if (status === "PENDING") return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

export function OwnerDashboardHome({
  stats,
  boats,
  ownerOptionals,
  bookings,
  bookingsLoading,
  loading,
  onOpenAgenda,
  onOpenBoats,
  onOpenOptional,
  onOpenBoat,
  onOpenRevenue,
}: {
  stats: OwnerDashboardStats | null;
  boats: OwnerBoatRecord[];
  ownerOptionals: OwnerOptionalRecord[];
  bookings: OwnerBookingRow[];
  bookingsLoading?: boolean;
  loading?: boolean;
  onOpenAgenda: () => void;
  onOpenBoats: () => void;
  onOpenOptional: (key?: string) => void;
  onOpenBoat: (boatId: string) => void;
  onOpenRevenue: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const dayPickerLocale = i18n.language.startsWith("pt")
    ? ptBR
    : i18n.language.startsWith("es")
      ? es
      : enUS;
  const currencyFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  const tripsMonth = stats?.tripsMonth ?? 0;
  const revenueMonth = currencyFmt.format((stats?.revenueMonthCents ?? 0) / 100);
  const topBoats = useMemo(() => topRatedBoats(boats, 3), [boats]);
  const optionals = useMemo(
    () => buildOwnerOptionalsCatalogFromApi(ownerOptionals),
    [ownerOptionals]
  );
  const upcomingBookings = useMemo(
    () => ownerUpcomingActiveBookings(bookings, DASHBOARD_UPCOMING_LIMIT),
    [bookings]
  );

  const formatBookingWhen = (b: OwnerBookingRow) => {
    const parts: string[] = [];
    const ymd = ownerBookingYmd(b);
    if (ymd) {
      parts.push(format(parseBookingYmd(ymd), "d MMM", { locale: dayPickerLocale }));
    }
    if (b.embarkTime) parts.push(b.embarkTime);
    return parts.join(" · ") || "—";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <OwnerSurface className="p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">{t("ownerPanel.tripsMonth")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {loading ? "—" : tripsMonth}
          </p>
        </OwnerSurface>
        <button
          type="button"
          onClick={onOpenRevenue}
          className="text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <OwnerSurface className="p-3.5 transition-all duration-300 hover:border-primary/25 hover:shadow-md hover:shadow-primary/5">
            <p className="text-[11px] font-medium text-muted-foreground">{t("ownerPanel.revenueMonth")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-xl">
              {loading ? "—" : revenueMonth}
            </p>
          </OwnerSurface>
        </button>
      </div>

      <OwnerSurface className="p-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">{t("ownerPanel.agendaTitle")}</h2>
        </div>

        <div className="mt-3 space-y-2">
          {bookingsLoading ? (
            <>
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </>
          ) : upcomingBookings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/50 bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
              {t("ownerPanel.agendaNoUpcoming")}
            </p>
          ) : (
            upcomingBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={onOpenAgenda}
                className="w-full rounded-lg border border-border/35 p-3 text-left transition-colors hover:bg-muted/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{booking.boat.nome}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      bookingStatusTone(booking.status)
                    )}
                  >
                    {t(`ownerAgenda.status.${booking.status}`)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{booking.renter.nome}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/90">
                  {formatBookingWhen(booking)} · {currencyFmt.format(booking.totalCents / 100)}
                </p>
              </button>
            ))
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full border-primary/40 text-primary hover:bg-primary/10"
          onClick={onOpenAgenda}
        >
          {t("ownerPanel.agendaFull")}
        </Button>
      </OwnerSurface>

      <section>
        <button
          type="button"
          className="mb-2 flex w-full items-center justify-between gap-2 text-left"
          onClick={onOpenBoats}
        >
          <h2 className="text-sm font-semibold text-foreground">{t("ownerPanel.myBoatsTitle")}</h2>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        {topBoats.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("ownerPanel.noBoatsYet")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {topBoats.map((b) => {
              const rating = parseOwnerBoatRating(b);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onOpenBoat(b.id)}
                className={cn("overflow-hidden rounded-xl border border-border/45 bg-transparent text-left transition-colors hover:border-primary/40")}
                >
                  <div className="aspect-[4/3] w-full bg-muted">
                    {b.imagens[0] ? (
                      <img
                        src={b.imagens[0]}
                        alt={b.nome}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-0.5 p-2">
                    <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-foreground sm:text-xs">
                      {b.nome}
                    </p>
                    {rating > 0 ? (
                      <p className="flex items-center gap-0.5 text-[10px] text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500" aria-hidden />
                        {rating.toFixed(1).replace(".", ",")}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1 text-[9px] font-medium text-emerald-500">
                      <span className="h-1 w-1 rounded-full bg-emerald-500" aria-hidden />
                      {t("ownerPanel.boatActive")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("ownerPanel.topBoatsHint")}</p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t("ownerPanel.myOptionalsTitle")}</h2>
          <button
            type="button"
            className="text-xs font-medium text-primary"
            onClick={() => onOpenOptional()}
          >
            {optionals.length > 0 ? t("ownerPanel.seeAllOptionals") : t("ownerPanel.optionalAdd")}
          </button>
        </div>
        {optionals.length > 0 ? (
          <div className="space-y-3">
            {optionals.slice(0, 2).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onOpenOptional(opt.key)}
                className={cn(
                  "flex w-full overflow-hidden rounded-xl border border-border/45 bg-transparent text-left transition-colors",
                  "hover:border-primary/30"
                )}
              >
                <div className="h-20 w-24 shrink-0 bg-muted sm:h-24 sm:w-28">
                  <img src={opt.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1 p-3">
                  <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpenOptional()}
            className="w-full rounded-xl border border-dashed border-border/50 px-4 py-6 text-center text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground"
          >
            {t("ownerPanel.optionalsEmpty")}
          </button>
        )}
      </section>
    </div>
  );
}
