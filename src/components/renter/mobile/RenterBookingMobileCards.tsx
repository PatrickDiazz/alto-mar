import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Anchor, CalendarDays, ChevronRight, Clock, Ship, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { RenterBooking } from "@/components/renter/booking/renterBookingTypes";
import {
  RENTER_IMAGE_PLACEHOLDER,
  RENTER_TEXT_ACCENT,
  RENTER_TEXT_BODY,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_TITLE,
  financialBreakdown,
  statusBadgeClasses,
  statusLabelKey,
  bookingStatusTone,
} from "@/components/renter/booking/renterBookingUi";
import { RenterBookingStatusBadge } from "@/components/renter/booking/RenterBookingStatusBadge";
import { cn } from "@/lib/utils";

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

type Props = {
  booking: RenterBooking;
  boatImage?: string | null;
  currencyFmt: Intl.NumberFormat;
  t: (k: string, o?: Record<string, unknown>) => string;
  lang: string;
  to: string;
};

export function RenterBookingMobileListCard({
  booking: b,
  boatImage,
  currencyFmt,
  t,
  lang,
  to,
}: Props) {
  const { totalReais } = financialBreakdown(b);
  const passengers = b.passengersAdults + (b.hasKids ? b.passengersChildren : 0);
  const cap = b.boat.capacidade ?? "—";
  const dateStr = b.bookingDate
    ? format(new Date(`${b.bookingDate}T12:00:00`), "d MMM yyyy", { locale: localeForLang(lang) })
    : "—";

  return (
    <Link
      to={to}
      className="group flex items-center gap-3 py-4 transition-colors duration-200 active:opacity-80"
    >
      <div
        className={cn(
          "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl",
          RENTER_IMAGE_PLACEHOLDER
        )}
      >
        {boatImage ? (
          <img src={boatImage} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
            <Ship className="h-7 w-7" strokeWidth={1.25} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("truncate text-sm font-bold", RENTER_TEXT_TITLE)}>{b.boat.nome}</p>
            <p className={cn("mt-0.5 truncate text-xs", RENTER_TEXT_MUTED)}>{b.boat.distancia}</p>
          </div>
          <RenterBookingStatusBadge status={b.status} t={t} className="shrink-0" />
        </div>
        <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs", RENTER_TEXT_BODY)}>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {dateStr}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {passengers}/{cap}
          </span>
        </div>
        <p className={cn("mt-1.5 text-sm font-bold tabular-nums", RENTER_TEXT_ACCENT)}>
          {currencyFmt.format(totalReais)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-active:translate-x-0.5" />
    </Link>
  );
}

export function RenterBookingMobileQuickInfo({
  booking: b,
  t,
  lang,
}: {
  booking: RenterBooking;
  t: (k: string, o?: Record<string, unknown>) => string;
  lang: string;
}) {
  const passengers = b.passengersAdults + (b.hasKids ? b.passengersChildren : 0);
  const cap = b.boat.capacidade ?? "—";
  const dateStr = b.bookingDate
    ? format(new Date(`${b.bookingDate}T12:00:00`), "d MMM yyyy", { locale: localeForLang(lang) })
    : "—";
  const embark = b.embarkLocation?.trim() || t("reservar.embarkLocationPendingShort");
  const embarkTime = b.embarkTime?.trim() || t("reservar.embarkToArrangeShort");

  const items = [
    { icon: CalendarDays, value: dateStr },
    { icon: Users, value: `${passengers}/${cap}` },
    { icon: Anchor, value: embark },
    { icon: Clock, value: embarkTime },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(({ icon: Icon, value }, idx) => (
        <div key={idx} className="flex min-w-0 flex-col items-center text-center">
          <Icon className="h-7 w-7 shrink-0 text-[#2563EB] dark:text-blue-400" strokeWidth={1.75} />
          <p className={cn("mt-2 line-clamp-3 text-xs font-semibold leading-snug", RENTER_TEXT_BODY)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

export function RenterBookingMobileHero({
  booking: b,
  boatImage,
  currencyFmt,
  t,
  fullBleed = false,
}: {
  booking: RenterBooking;
  boatImage?: string | null;
  currencyFmt: Intl.NumberFormat;
  t: (k: string, o?: Record<string, unknown>) => string;
  fullBleed?: boolean;
}) {
  const { totalReais } = financialBreakdown(b);
  const tone = bookingStatusTone(b.status);

  return (
    <div className={fullBleed ? "-mx-4" : undefined}>
      <div className={cn("relative aspect-video w-full", RENTER_IMAGE_PLACEHOLDER)}>
        {boatImage ? (
          <img src={boatImage} alt={b.boat.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
            <Ship className="h-14 w-14" strokeWidth={1.25} />
          </div>
        )}
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold",
            statusBadgeClasses(tone)
          )}
        >
          {t(statusLabelKey(b.status))}
        </span>
      </div>
      <div className={cn("space-y-1", fullBleed ? "px-4 pt-4" : "pt-4")}>
        <h2 className={cn("text-lg font-bold", RENTER_TEXT_TITLE)}>{b.boat.nome}</h2>
        <p className={cn("text-sm", RENTER_TEXT_MUTED)}>{b.boat.distancia}</p>
        <p className="pt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {currencyFmt.format(totalReais)}
        </p>
      </div>
    </div>
  );
}
