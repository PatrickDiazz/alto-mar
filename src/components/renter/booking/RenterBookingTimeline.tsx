import { format, parseISO } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Check, Circle, Clock, CreditCard, Flag, Ship, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenterBooking } from "./renterBookingTypes";
import {
  RENTER_CARD,
  RENTER_TEXT_ACCENT,
  RENTER_TEXT_LABEL,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_TITLE,
  buildTimelineSteps,
  type TimelineStepId,
} from "./renterBookingUi";

type Props = {
  booking: RenterBooking;
  t: (k: string) => string;
  lang: string;
  compact?: boolean;
  /** Sem wrapper de card — só conteúdo (ex.: mobile com dividers) */
  bare?: boolean;
};

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

const stepIcons: Record<TimelineStepId, typeof Check> = {
  created: Sparkles,
  confirmation: Clock,
  payment: CreditCard,
  trip: Ship,
  done: Flag,
};

const stepLabelKey: Record<TimelineStepId, string> = {
  created: "reservasConta.timelineCreated",
  confirmation: "reservasConta.timelineConfirmation",
  payment: "reservasConta.timelinePayment",
  trip: "reservasConta.timelineTrip",
  done: "reservasConta.timelineDone",
};

function stepTitle(step: { id: TimelineStepId; completed: boolean }, t: (k: string) => string) {
  if (step.id === "payment" && !step.completed) {
    return t("reservasConta.timelinePaymentAwaiting");
  }
  return t(stepLabelKey[step.id]);
}

function formatStepDate(iso: string | null | undefined, locale: typeof ptBR) {
  if (!iso) return null;
  try {
    const d = iso.includes("T") ? parseISO(iso) : parseISO(`${iso}T12:00:00`);
    return format(d, "d MMM yyyy", { locale });
  } catch {
    return null;
  }
}

export function RenterBookingTimeline({ booking, t, lang, compact = false, bare = false }: Props) {
  const steps = buildTimelineSteps(booking);
  const locale = localeForLang(lang);
  const iconSize = compact ? "h-6 w-6" : "h-8 w-8";
  const iconInner = compact ? "h-3 w-3" : "h-4 w-4";
  const lineLeft = compact ? "left-[11px]" : "left-[15px]";
  const lineTop = compact ? "top-6" : "top-8";

  if (compact) {
    const inner = (
      <>
        {!bare ? (
          <h3 className={cn("text-sm font-semibold", RENTER_TEXT_TITLE)}>{t("reservasConta.timelineTitle")}</h3>
        ) : null}
        <ol className={cn(bare ? "space-y-0" : "mt-2.5 space-y-0")}>
          {steps.map((step, idx) => {
            const Icon = stepIcons[step.id];
            const isLast = idx === steps.length - 1;
            const muted = !step.completed && !step.active;
            const dateStr = formatStepDate(step.date, locale);
            const meta = dateStr
              ? dateStr
              : step.active
                ? t("reservasConta.timelineInProgress")
                : null;

            return (
              <li key={step.id} className="relative flex items-center gap-2.5 pb-2 last:pb-0">
                {!isLast ? (
                  <span
                    className={cn(
                      "absolute h-[calc(100%-0.25rem)] w-px",
                      lineLeft,
                      lineTop,
                      step.completed
                        ? "bg-emerald-200 dark:bg-emerald-800/60"
                        : "bg-slate-200 dark:bg-border"
                    )}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-[1] flex shrink-0 items-center justify-center rounded-full border-[1.5px]",
                    iconSize,
                    step.completed
                      ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-600 dark:bg-emerald-600"
                      : step.active
                        ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-400"
                        : "border-slate-200 bg-slate-50 text-slate-300 dark:border-border dark:bg-muted dark:text-muted-foreground/40"
                  )}
                >
                  {step.completed ? (
                    <Check className={iconInner} strokeWidth={2.5} />
                  ) : step.active ? (
                    <Icon className={iconInner} />
                  ) : (
                    <Circle className={cn(iconInner, "fill-current")} />
                  )}
                </span>
                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-between gap-2 leading-tight",
                    muted && "opacity-50"
                  )}
                >
                  <p
                    className={cn(
                      "truncate text-xs font-semibold",
                      step.active
                        ? RENTER_TEXT_ACCENT
                        : step.completed
                          ? RENTER_TEXT_TITLE
                          : RENTER_TEXT_LABEL
                    )}
                  >
                    {stepTitle(step, t)}
                  </p>
                  {meta ? (
                    <span
                      className={cn(
                        "shrink-0 text-[11px] tabular-nums",
                        step.active
                          ? "font-medium text-[#2563EB]/80 dark:text-blue-400/80"
                          : RENTER_TEXT_MUTED
                      )}
                    >
                      {meta}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </>
    );

    if (bare) return inner;

    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-border/70 dark:bg-card">
        {inner}
      </div>
    );
  }

  return (
    <div className={RENTER_CARD}>
      <h3 className={cn("text-sm font-semibold", RENTER_TEXT_TITLE)}>{t("reservasConta.timelineTitle")}</h3>
      <ol className="mt-5 space-y-0">
        {steps.map((step, idx) => {
          const Icon = stepIcons[step.id];
          const isLast = idx === steps.length - 1;
          const muted = !step.completed && !step.active;
          const dateStr = formatStepDate(step.date, locale);

          return (
            <li key={step.id} className="relative flex gap-2.5 pb-6 last:pb-0">
              {!isLast ? (
                <span
                  className={cn(
                    "absolute h-[calc(100%-0.75rem)] w-px",
                    lineLeft,
                    lineTop,
                    step.completed
                      ? "bg-emerald-200 dark:bg-emerald-800/60"
                      : "bg-slate-200 dark:bg-border"
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] flex shrink-0 items-center justify-center rounded-full border-2",
                  iconSize,
                  step.completed
                    ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-600 dark:bg-emerald-600"
                    : step.active
                      ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-400"
                      : "border-slate-200 bg-slate-50 text-slate-300 dark:border-border dark:bg-muted dark:text-muted-foreground/40"
                )}
              >
                {step.completed ? (
                  <Check className={iconInner} strokeWidth={2.5} />
                ) : step.active ? (
                  <Icon className={iconInner} />
                ) : (
                  <Circle className={cn(iconInner, "fill-current")} />
                )}
              </span>
              <div className={cn("min-w-0 flex-1 pt-0.5", muted && "opacity-50")}>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    step.active
                      ? RENTER_TEXT_ACCENT
                      : step.completed
                        ? RENTER_TEXT_TITLE
                        : RENTER_TEXT_LABEL
                  )}
                >
                  {stepTitle(step, t)}
                </p>
                {dateStr ? (
                  <p className={cn("mt-0.5 text-[11px]", RENTER_TEXT_MUTED)}>{dateStr}</p>
                ) : step.active ? (
                  <p className="mt-0.5 text-[11px] font-medium text-[#2563EB]/80 dark:text-blue-400/80">
                    {t("reservasConta.timelineInProgress")}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
