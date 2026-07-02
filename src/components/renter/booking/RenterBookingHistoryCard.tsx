import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { RenterBooking } from "./renterBookingTypes";
import {
  RENTER_HISTORY_CARD,
  RENTER_HISTORY_CARD_DEFAULT,
  RENTER_HISTORY_CARD_SELECTED,
  RENTER_IMAGE_PLACEHOLDER,
  RENTER_TEXT_BODY,
  RENTER_TEXT_LABEL,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_TITLE,
} from "./renterBookingUi";
import { RenterBookingStatusBadge } from "./RenterBookingStatusBadge";

type Props = {
  booking: RenterBooking;
  boatImage?: string | null;
  currencyFmt: Intl.NumberFormat;
  t: (k: string) => string;
  lang: string;
  selected?: boolean;
  onSelect: () => void;
};

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

export function RenterBookingHistoryCard({
  booking,
  boatImage,
  currencyFmt,
  t,
  lang,
  selected,
  onSelect,
}: Props) {
  const dateFnsLocale = localeForLang(lang);
  const showDate = booking.bookingDate;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        RENTER_HISTORY_CARD,
        selected ? RENTER_HISTORY_CARD_SELECTED : RENTER_HISTORY_CARD_DEFAULT
      )}
    >
      <div className="flex gap-3">
        <div className={cn("h-14 w-14 shrink-0 overflow-hidden rounded-xl", RENTER_IMAGE_PLACEHOLDER)}>
          {boatImage ? (
            <img src={boatImage} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className={cn("flex h-full w-full items-center justify-center text-[10px]", RENTER_TEXT_LABEL)}>
              {t("reservasConta.noPhoto")}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("truncate text-sm font-semibold", RENTER_TEXT_TITLE)}>{booking.boat.nome}</p>
          <p className={cn("truncate text-xs", RENTER_TEXT_MUTED)}>{booking.boat.distancia}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
            {showDate ? (
              <time dateTime={showDate} className={cn("text-xs tabular-nums", RENTER_TEXT_MUTED)}>
                {format(new Date(`${showDate}T12:00:00`), "d MMM yyyy", { locale: dateFnsLocale })}
              </time>
            ) : null}
            <span className={cn("text-xs font-semibold tabular-nums", RENTER_TEXT_BODY)}>
              {currencyFmt.format(booking.totalCents / 100)}
            </span>
          </div>
          <RenterBookingStatusBadge
            status={booking.status}
            t={t}
            className="!px-2 !py-0.5 text-[10px]"
          />
        </div>
      </div>
    </button>
  );
}

type HistoryListProps = {
  title: string;
  bookings: RenterBooking[];
  selectedId: string | null;
  boatImages: Record<string, string | undefined>;
  currencyFmt: Intl.NumberFormat;
  t: (k: string) => string;
  lang: string;
  onSelect: (id: string) => void;
  empty?: string;
};

export function RenterBookingHistoryList({
  title,
  bookings,
  selectedId,
  boatImages,
  currencyFmt,
  t,
  lang,
  onSelect,
  empty,
}: HistoryListProps) {
  if (bookings.length === 0 && !empty) return null;

  return (
    <div className="space-y-3">
      <h4 className={cn("text-xs font-semibold uppercase tracking-wide", RENTER_TEXT_LABEL)}>{title}</h4>
      {bookings.length === 0 ? (
        <p className={cn("text-xs", RENTER_TEXT_LABEL)}>{empty}</p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id}>
              <RenterBookingHistoryCard
                booking={b}
                boatImage={boatImages[b.boat.id]}
                currencyFmt={currencyFmt}
                t={t}
                lang={lang}
                selected={selectedId === b.id}
                onSelect={() => onSelect(b.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
