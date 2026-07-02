import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { MapPin, Users, Clock, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenterBooking } from "./renterBookingTypes";
import {
  RENTER_BADGE_PAID,
  RENTER_BTN_PRIMARY,
  RENTER_CARD,
  RENTER_CARD_COMPACT,
  RENTER_IMAGE_PLACEHOLDER,
  RENTER_TEXT_ACCENT,
  RENTER_TEXT_BODY,
  RENTER_TEXT_LABEL,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_TITLE,
  isPaid,
} from "./renterBookingUi";
import { RenterBookingStatusBadge } from "./RenterBookingStatusBadge";
import { Button } from "@/components/ui/button";

type Props = {
  booking: RenterBooking;
  boatImage?: string | null;
  currencyFmt: Intl.NumberFormat;
  t: (k: string, o?: Record<string, unknown>) => string;
  lang: string;
  stripeCheckoutDue?: boolean;
  stripePaying?: boolean;
  onStripeCheckout?: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  compact?: boolean;
  embedded?: boolean;
  hideImage?: boolean;
};

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

export function RenterBookingHeroCard({
  booking,
  boatImage,
  currencyFmt,
  t,
  lang,
  stripeCheckoutDue,
  stripePaying,
  onStripeCheckout,
  onEdit,
  canEdit,
  compact = false,
  embedded = false,
  hideImage = false,
}: Props) {
  const dateFnsLocale = localeForLang(lang);
  const b = booking;
  const passengers = b.passengersAdults + (b.hasKids ? b.passengersChildren : 0);
  const cap = b.boat.capacidade ?? "—";
  const paid = isPaid(b);
  const showDate = b.bookingDate;
  const cardClass = compact ? RENTER_CARD_COMPACT : cn(RENTER_CARD, "overflow-hidden p-0");

  if (compact) {
    const infoContent = (
      <div className={cn("min-w-0", hideImage ? "w-full" : "flex-1")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className={cn("truncate text-base font-bold", RENTER_TEXT_TITLE)}>{b.boat.nome}</h2>
            <p className={cn("mt-0.5 flex items-center gap-1 truncate text-xs", RENTER_TEXT_MUTED)}>
              <MapPin className="h-3 w-3 shrink-0" />
              {b.boat.distancia}
            </p>
          </div>
          <RenterBookingStatusBadge status={b.status} t={t} className="shrink-0 !px-2 !py-0.5 text-[10px]" />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {showDate ? (
            <div>
              <dt className={RENTER_TEXT_LABEL}>{t("reservasConta.bookingDate")}</dt>
              <dd className={cn("font-medium", RENTER_TEXT_BODY)}>
                {format(new Date(`${showDate}T12:00:00`), "d MMM yyyy", { locale: dateFnsLocale })}
              </dd>
            </div>
          ) : null}
          <div className={!showDate ? "col-span-2" : undefined}>
            <dt className={RENTER_TEXT_LABEL}>{t("reservar.passengers")}</dt>
            <dd className={cn("font-medium tabular-nums", RENTER_TEXT_BODY)}>
              {passengers}/{cap}
            </dd>
          </div>
          {!embedded ? (
            <div>
              <dt className={RENTER_TEXT_LABEL}>{t("common.total")}</dt>
              <dd className={cn("font-bold tabular-nums", RENTER_TEXT_ACCENT)}>
                {currencyFmt.format(b.totalCents / 100)}
              </dd>
            </div>
          ) : null}
          <div className="col-span-2">
            <dt className={RENTER_TEXT_LABEL}>{t("reservar.embark")}</dt>
            <dd className={cn("truncate font-medium", RENTER_TEXT_BODY)}>
              {[b.embarkLocation, b.embarkTime].filter(Boolean).join(" · ") ||
                t("reservar.embarkToArrangeShort")}
            </dd>
          </div>
        </dl>
        {(canEdit && onEdit) || (paid && !stripeCheckoutDue && !embedded) ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {paid && !embedded ? (
              <span className={cn(RENTER_BADGE_PAID, "!px-2 !py-0.5 text-[10px]")}>
                {t("reservasConta.paymentDoneBadge")}
              </span>
            ) : null}
            {canEdit && onEdit ? (
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onEdit}>
                {t("reservasConta.edit")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );

    const content = hideImage ? (
      infoContent
    ) : (
      <div className="flex gap-3">
        <div
          className={cn(
            "h-[100px] w-[132px] shrink-0 overflow-hidden rounded-lg",
            RENTER_IMAGE_PLACEHOLDER
          )}
        >
          {boatImage ? (
            <img src={boatImage} alt={b.boat.nome} className="h-full w-full object-cover" decoding="async" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <Ship className="h-10 w-10" strokeWidth={1.25} />
            </div>
          )}
        </div>
        {infoContent}
      </div>
    );

    if (embedded) return content;

    return <article className={cardClass}>{content}</article>;
  }

  return (
    <article className={cardClass}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className={cn("relative aspect-[16/9] lg:min-h-[220px]", RENTER_IMAGE_PLACEHOLDER)}>
          {boatImage ? (
            <img
              src={boatImage}
              alt={b.boat.nome}
              className="h-full w-full object-cover"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-muted-foreground/50">
              <Ship className="h-16 w-16" strokeWidth={1.25} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6 lg:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className={cn("text-xl font-bold tracking-tight", RENTER_TEXT_TITLE)}>{b.boat.nome}</h2>
              <p className={cn("flex items-center gap-1.5 text-sm", RENTER_TEXT_MUTED)}>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {b.boat.distancia}
              </p>
            </div>
            <RenterBookingStatusBadge status={b.status} t={t} className="shrink-0" />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {showDate ? (
              <div>
                <dt className={cn("text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
                  {t("reservasConta.bookingDate")}
                </dt>
                <dd className={cn("mt-0.5 font-semibold", RENTER_TEXT_TITLE)}>
                  {format(new Date(`${showDate}T12:00:00`), "PPP", { locale: dateFnsLocale })}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className={cn("text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
                {t("common.total")}
              </dt>
              <dd className={cn("mt-0.5 text-lg font-bold tabular-nums", RENTER_TEXT_ACCENT)}>
                {currencyFmt.format(b.totalCents / 100)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className={cn("text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
                {t("reservar.passengers")}
              </dt>
              <dd className={cn("mt-0.5 flex items-center gap-1 font-medium", RENTER_TEXT_BODY)}>
                <Users className={cn("h-3.5 w-3.5", RENTER_TEXT_LABEL)} />
                {passengers} / {cap}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className={cn("text-xs font-medium uppercase tracking-wide", RENTER_TEXT_LABEL)}>
                {t("reservar.embark")}
              </dt>
              <dd className={cn("mt-0.5 flex items-center gap-1 font-medium", RENTER_TEXT_BODY)}>
                <Clock className={cn("h-3.5 w-3.5 shrink-0", RENTER_TEXT_LABEL)} />
                {[b.embarkLocation, b.embarkTime].filter(Boolean).join(" · ") ||
                  t("reservar.embarkToArrangeShort")}
              </dd>
            </div>
          </dl>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {stripeCheckoutDue && onStripeCheckout ? (
              <Button
                type="button"
                disabled={Boolean(stripePaying)}
                className={RENTER_BTN_PRIMARY}
                onClick={onStripeCheckout}
              >
                {stripePaying ? t("reservasConta.payStripeSubmitting") : t("reservasConta.payNow")}
              </Button>
            ) : paid ? (
              <span className={RENTER_BADGE_PAID}>{t("reservasConta.paymentDoneBadge")}</span>
            ) : null}
            {canEdit && onEdit ? (
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                {t("reservasConta.edit")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
