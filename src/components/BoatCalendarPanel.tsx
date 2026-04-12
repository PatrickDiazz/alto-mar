import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, startOfDay, isBefore, addMonths, addDays } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { DayPicker, type Matcher } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "@/lib/utils";
import { fetchBoatCalendar, type BoatCalendarResponse } from "@/lib/boatCalendarApi";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

/**
 * Caption: mês centrado na linha; nav em overlay com setas nas pontas (alinhado ao eixo vertical do texto).
 * Claro: borda + fundo como antes. Escuro: mesmo esquema “botão preenchido”, sem borda, contraste com o card.
 */
const boatCalendarCaptionNavClassNames = {
  caption: "relative flex min-h-9 items-center justify-center pt-1",
  caption_label:
    "relative z-[1] truncate px-11 text-center text-sm font-medium tabular-nums leading-none text-foreground",
  nav: "pointer-events-none absolute inset-0 z-[2] flex items-center justify-between gap-1 px-0.5",
  nav_button:
    "touch-manipulation pointer-events-auto h-7 w-7 shrink-0 rounded-md border border-border bg-background text-foreground opacity-90 hover:opacity-100 inline-flex items-center justify-center [-webkit-tap-highlight-color:transparent] dark:border-0 dark:bg-secondary dark:text-secondary-foreground dark:opacity-100 dark:hover:!border-transparent dark:hover:!bg-[hsl(210_20%_24%)] dark:hover:text-foreground dark:hover:!shadow-none dark:hover:!ring-0 dark:hover:!ring-offset-0 dark:focus-visible:!outline-none dark:focus-visible:!border-transparent dark:focus-visible:!shadow-none dark:focus-visible:!ring-0 dark:focus-visible:!ring-offset-0 dark:focus-visible:!bg-[hsl(210_20%_24%)] [@media(hover:none)_and_(pointer:coarse)]:active:!border-transparent [@media(hover:none)_and_(pointer:coarse)]:active:!bg-transparent [@media(hover:none)_and_(pointer:coarse)]:active:!shadow-none [@media(hover:none)_and_(pointer:coarse)]:focus:!border-transparent [@media(hover:none)_and_(pointer:coarse)]:focus:!bg-transparent [@media(hover:none)_and_(pointer:coarse)]:focus:!shadow-none [@media(hover:none)_and_(pointer:coarse)]:focus-visible:!border-transparent [@media(hover:none)_and_(pointer:coarse)]:focus-visible:!bg-transparent [@media(hover:none)_and_(pointer:coarse)]:focus-visible:!shadow-none [@media(hover:none)_and_(pointer:coarse)]:hover:!border-border [@media(hover:none)_and_(pointer:coarse)]:hover:!bg-background dark:[@media(hover:none)_and_(pointer:coarse)]:hover:!border-transparent dark:[@media(hover:none)_and_(pointer:coarse)]:hover:!bg-secondary dark:[@media(hover:none)_and_(pointer:coarse)]:focus-visible:!bg-transparent",
  nav_button_previous: "static translate-y-0",
  nav_button_next: "static translate-y-0",
} as const;

const boatDayPickerIcons = {
  IconLeft: ({ className, ...props }: ComponentProps<typeof ChevronLeft>) => (
    <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
  ),
  IconRight: ({ className, ...props }: ComponentProps<typeof ChevronRight>) => (
    <ChevronRight className={cn("h-4 w-4", className)} {...props} />
  ),
};

const RANGE_BACK = 6;
const RANGE_FORWARD = 18;

/** Em toque, o foco fica no botão e o contorno do RDP persiste; blur após o pointerup remove-o já no mobile. */
function useBlurRdpMonthNavAfterTouch(
  containerRef: RefObject<HTMLElement | null>,
  /** Re-liga ao mudar de ramo (owner vs picker) para o ref apontar ao contentor certo. */
  instanceKey: string
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerUpCapture = (e: PointerEvent) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      const btn = t.closest('button[name="next-month"], button[name="previous-month"]');
      if (btn instanceof HTMLButtonElement) {
        queueMicrotask(() => btn.blur());
      }
    };

    el.addEventListener("pointerup", onPointerUpCapture, true);
    return () => el.removeEventListener("pointerup", onPointerUpCapture, true);
  }, [instanceKey]);
}

function localeForLang(lang: string) {
  if (lang.startsWith("pt")) return ptBR;
  if (lang.startsWith("es")) return es;
  return enUS;
}

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

type BaseProps = {
  boatId: string;
  className?: string;
};

type PickerProps = BaseProps & {
  variant: "picker";
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
  excludeBookingId?: string;
  /** Primeira data seleccionável = hoje + N dias corridos (ex.: 2 = não hoje nem amanhã). */
  bookingLeadDays?: number;
};

type ReadonlyProps = BaseProps & {
  variant: "readonly";
};

type OwnerProps = BaseProps & {
  variant: "owner";
  onSaved?: () => void;
};

export type BoatCalendarPanelProps = PickerProps | ReadonlyProps | OwnerProps;

export function BoatCalendarPanel(props: BoatCalendarPanelProps) {
  const { boatId, className } = props;
  const { i18n, t } = useTranslation();
  const loc = localeForLang(i18n.language);
  const [month, setMonth] = useState(() => new Date());
  const monthNavHostRef = useRef<HTMLDivElement>(null);
  useBlurRdpMonthNavAfterTouch(monthNavHostRef, props.variant);
  const [data, setData] = useState<BoatCalendarResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => {
    const start = startOfDay(addMonths(new Date(), -RANGE_BACK));
    const end = startOfDay(addMonths(new Date(), RANGE_FORWARD));
    return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
  }, []);

  const load = useCallback(async () => {
    if (!boatId) return;
    setLoadErr(null);
    try {
      const d = await fetchBoatCalendar(boatId, range.from, range.to);
      setData(d);
    } catch {
      setLoadErr(t("calendar.loadFail"));
      setData(null);
    }
  }, [boatId, range.from, range.to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const excludeId = props.variant === "picker" ? props.excludeBookingId : undefined;
  const pickerLeadDays = props.variant === "picker" ? (props.bookingLeadDays ?? 0) : 0;

  const isDayBlockedForPicker = useCallback(
    (date: Date): boolean => {
      if (!data) return true;
      const key = dayKey(date);
      if (data.dateLocks.includes(key)) return true;
      if (data.weekdayLocks.includes(date.getDay())) return true;
      const hit = data.bookings.find(
        (b) =>
          b.date === key &&
          (b.status === "ACCEPTED" || b.status === "COMPLETED") &&
          b.id !== excludeId
      );
      return Boolean(hit);
    },
    [data, excludeId]
  );

  const disabledMatcher: Matcher = useCallback(
    (date: Date) => {
      const today = startOfDay(new Date());
      const minSelectable = addDays(today, pickerLeadDays);
      if (isBefore(startOfDay(date), minSelectable)) return true;
      if (props.variant === "picker") return isDayBlockedForPicker(date);
      return false;
    },
    [isDayBlockedForPicker, props.variant, pickerLeadDays]
  );

  const pickerSelectedKey =
    props.variant === "picker" && props.selectedDate ? props.selectedDate : null;

  const modifiers = useMemo(() => {
    if (!data) return {};
    return {
      ownerLockDay: (d: Date) => {
        const key = dayKey(d);
        return data.dateLocks.includes(key) || data.weekdayLocks.includes(d.getDay());
      },
      tripConfirmed: (d: Date) => {
        const key = dayKey(d);
        if (pickerSelectedKey && key === pickerSelectedKey) return false;
        return data.bookings.some(
          (b) => b.date === key && (b.status === "ACCEPTED" || b.status === "COMPLETED")
        );
      },
      tripPending: (d: Date) => {
        const key = dayKey(d);
        if (pickerSelectedKey && key === pickerSelectedKey) return false;
        return data.bookings.some((b) => b.date === key && b.status === "PENDING");
      },
    };
  }, [data, pickerSelectedKey]);

  /** Travas = vermelho preenchido (picker/readonly; sem borda). */
  const modifiersClassNames = {
    ownerLockDay:
      "!border-2 !border-transparent !bg-red-500/40 !text-foreground !font-medium dark:!bg-red-950/75",
    tripConfirmed: "!bg-emerald-600/30 !text-foreground",
    tripPending: "!bg-amber-400/30 !text-foreground",
  };

  /** No picker, dia escolhido deve manter destaque (primary) mesmo com foco noutro sítio — `!` dos outros modificadores não pode ganhar. */
  const modifiersClassNamesPicker =
    props.variant === "picker"
      ? {
          ...modifiersClassNames,
          selected:
            "!z-[1] !bg-primary !text-primary-foreground !opacity-100 shadow-sm hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground focus-visible:!ring-2 focus-visible:!ring-ring focus-visible:!ring-offset-2 focus-visible:!ring-offset-background",
        }
      : modifiersClassNames;

  const [locksLocal, setLocksLocal] = useState<{ dateLocks: string[]; weekdayLocks: number[] } | null>(null);

  useEffect(() => {
    setLocksLocal(null);
  }, [boatId]);

  useEffect(() => {
    if (!data || props.variant !== "owner") return;
    setLocksLocal({ dateLocks: [...data.dateLocks], weekdayLocks: [...data.weekdayLocks] });
  }, [data, props.variant, boatId]);

  if (props.variant === "owner") {
    const { onSaved } = props;
    const value = locksLocal ?? { dateLocks: [], weekdayLocks: [] };
    const selectedMulti = value.dateLocks.map((s) => parseISO(`${s}T12:00:00`));

    const toggleWeekday = (dow: number) => {
      const has = value.weekdayLocks.includes(dow);
      const weekdayLocks = has ? value.weekdayLocks.filter((w) => w !== dow) : [...value.weekdayLocks, dow].sort((a, b) => a - b);
      setLocksLocal({ ...value, weekdayLocks });
    };

    const saveLocks = async () => {
      setSaving(true);
      try {
        const resp = await authFetch(`/api/owner/boats/${boatId}/calendar-locks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dateLocks: value.dateLocks,
            weekdayLocks: value.weekdayLocks,
          }),
        });
        if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("calendar.saveFail")));
        await load();
        onSaved?.();
      } catch (e) {
        const m = (e instanceof Error ? e.message : t("calendar.saveFail")).trim();
        setLoadErr(m || t("calendar.saveFail"));
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-red-500/35 dark:bg-red-950/65" />
            {t("calendar.legendLock")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-600/35" />
            {t("calendar.legendConfirmed")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-400/35" />
            {t("calendar.legendPending")}
          </span>
        </div>
        {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
        <div
          ref={monthNavHostRef}
          className="w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        >
        <DayPicker
          mode="multiple"
          month={month}
          onMonthChange={setMonth}
          locale={loc}
          components={boatDayPickerIcons}
          selected={selectedMulti}
          onSelect={(dates) => {
            const next = (dates || []).map((d) => dayKey(d));
            const sorted = [...new Set(next)].sort();
            setLocksLocal({ ...value, dateLocks: sorted });
          }}
          modifiers={{
            ...modifiers,
            /** Bloqueio por dia da semana (sem contar datas clicadas no calendário). */
            ownerLockDay: (d: Date) => {
              const key = dayKey(d);
              if (value.dateLocks.includes(key)) return false;
              const hasTrip = data?.bookings.some(
                (b) =>
                  b.date === key &&
                  (b.status === "ACCEPTED" || b.status === "COMPLETED" || b.status === "PENDING")
              );
              if (hasTrip) return false;
              return value.weekdayLocks.includes(d.getDay());
            },
            /** Data já gravada como trava: só preenchimento. */
            ownerLockDateSaved: (d: Date) => {
              const key = dayKey(d);
              if (!value.dateLocks.includes(key)) return false;
              const hasTrip = data?.bookings.some(
                (b) =>
                  b.date === key &&
                  (b.status === "ACCEPTED" || b.status === "COMPLETED" || b.status === "PENDING")
              );
              if (hasTrip) return false;
              const saved = data?.dateLocks ?? [];
              return saved.includes(key);
            },
            /** Data escolhida ainda não gravada: só borda suave. */
            ownerLockDateDraft: (d: Date) => {
              const key = dayKey(d);
              if (!value.dateLocks.includes(key)) return false;
              const hasTrip = data?.bookings.some(
                (b) =>
                  b.date === key &&
                  (b.status === "ACCEPTED" || b.status === "COMPLETED" || b.status === "PENDING")
              );
              if (hasTrip) return false;
              if (!data) return true;
              return !(data.dateLocks ?? []).includes(key);
            },
          }}
          modifiersClassNames={{
            ...modifiersClassNames,
            /** Evita fundo “selected” padrão do RDP a sobrepor travas (multiple). */
            selected: "!shadow-none !ring-0",
            /** Dia coberto só por trava de semana (não está em dateLocks): mesmo preenchimento que trava gravada, sem borda. */
            ownerLockDay:
              "!z-[1] !box-border !rounded-md !border-2 !border-transparent !bg-red-500/40 !text-foreground !font-medium dark:!bg-red-950/75",
            /** Trava por data já gravada: só preenchimento, sem borda. */
            ownerLockDateSaved:
              "!z-[1] !box-border !rounded-md !border-2 !border-transparent !bg-red-500/40 !text-foreground !font-medium dark:!bg-red-950/75",
            /** Selecionado ainda não gravado: só borda vermelha clara, sem preenchimento. */
            ownerLockDateDraft:
              "!z-[1] !box-border !rounded-md !border-2 !border-red-300 !bg-transparent !text-foreground !font-medium !shadow-none !ring-0 dark:!border-red-500/55",
          }}
          className="min-w-[260px] rounded-xl border-0 bg-muted p-2 shadow-card sm:p-3 dark:bg-card"
          classNames={{
            ...boatCalendarCaptionNavClassNames,
            months: "flex flex-col sm:flex-row gap-4",
            month: "space-y-3",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative",
            day: "h-9 w-9 rounded-md p-0 font-normal box-border border-2 border-transparent aria-selected:opacity-100 hover:bg-accent",
            /** Não forçar fundo transparente: senão esconde ownerLockDateSaved / rascunho ao estar em `selected`. */
            day_selected: "!font-medium !shadow-none focus:!text-foreground aria-selected:opacity-100",
            day_today: "ring-1 ring-primary/50",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-40",
          }}
        />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">{t("calendar.weekdayLocks")}</p>
          <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            {(
              [
                [0, t("calendar.weekdays.sun")],
                [1, t("calendar.weekdays.mon")],
                [2, t("calendar.weekdays.tue")],
                [3, t("calendar.weekdays.wed")],
                [4, t("calendar.weekdays.thu")],
                [5, t("calendar.weekdays.fri")],
                [6, t("calendar.weekdays.sat")],
              ] as const
            ).map(([dow, label]) => (
              <Button
                key={dow}
                type="button"
                size="sm"
                variant={value.weekdayLocks.includes(dow) ? "default" : "outline"}
                className={cn(
                  "h-9 w-full px-1 text-[10px] leading-tight sm:h-9 sm:w-auto sm:px-3 sm:text-xs",
                  value.weekdayLocks.includes(dow) &&
                    "!border-red-700 !bg-red-600 text-white hover:!bg-red-700 dark:!border-red-500 dark:!bg-red-700 dark:hover:!bg-red-600"
                )}
                onClick={() => toggleWeekday(dow)}
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("calendar.ownerHint")}</p>
        </div>
        <Button type="button" size="sm" className="w-full sm:w-auto" onClick={() => void saveLocks()} disabled={saving}>
          {saving ? t("common.loading") : t("calendar.saveLocks")}
        </Button>
      </div>
    );
  }

  const singleSelected =
    props.variant === "picker" && props.selectedDate ? parseISO(`${props.selectedDate}T12:00:00`) : undefined;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-500/35 dark:bg-red-950/65" />
          {t("calendar.legendLock")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-600/35" />
          {t("calendar.legendConfirmed")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-400/35" />
          {t("calendar.legendPending")}
        </span>
      </div>
      {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
      <div
        ref={monthNavHostRef}
        className="w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
      >
      <DayPicker
        mode="single"
        month={month}
        onMonthChange={setMonth}
        locale={loc}
        components={boatDayPickerIcons}
        selected={singleSelected}
        onSelect={
          props.variant === "picker"
            ? (d) => {
                props.onSelectDate(d ? dayKey(d) : null);
              }
            : undefined
        }
        disabled={props.variant === "picker" ? disabledMatcher : false}
        modifiers={{ ...modifiers }}
        modifiersClassNames={modifiersClassNamesPicker}
        className="min-w-[260px] rounded-xl border-0 bg-muted p-2 shadow-card sm:p-3 dark:bg-card"
        classNames={{
          ...boatCalendarCaptionNavClassNames,
          months: "flex flex-col sm:flex-row gap-4",
          month: "space-y-3",
          table: "w-full border-collapse",
          head_row: "flex",
          head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative",
          day: "h-9 w-9 rounded-md p-0 font-normal aria-selected:opacity-100 hover:bg-accent",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "ring-1 ring-primary/50",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-40 line-through",
        }}
      />
      </div>
      {props.variant === "picker" ? (
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p>{t("calendar.pickerHint")}</p>
          {props.variant === "picker" && pickerLeadDays > 0 ? (
            <p>{t("calendar.banhistaMinLeadHint", { days: pickerLeadDays })}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
