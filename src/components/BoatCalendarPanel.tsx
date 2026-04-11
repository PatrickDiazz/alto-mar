import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, startOfDay, isBefore, addMonths, addDays } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { DayPicker, type Matcher } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "@/lib/utils";
import { fetchBoatCalendar, type BoatCalendarResponse } from "@/lib/boatCalendarApi";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";

const RANGE_BACK = 6;
const RANGE_FORWARD = 18;

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

  const modifiers = useMemo(() => {
    if (!data) return {};
    return {
      ownerLockDay: (d: Date) => {
        const key = dayKey(d);
        return data.dateLocks.includes(key) || data.weekdayLocks.includes(d.getDay());
      },
      tripConfirmed: (d: Date) => {
        const key = dayKey(d);
        return data.bookings.some(
          (b) => b.date === key && (b.status === "ACCEPTED" || b.status === "COMPLETED")
        );
      },
      tripPending: (d: Date) => {
        const key = dayKey(d);
        return data.bookings.some((b) => b.date === key && b.status === "PENDING");
      },
    };
  }, [data]);

  /** Travas = vermelho preenchido (sem borda de destaque no calendário). */
  const modifiersClassNames = {
    ownerLockDay:
      "!border-2 !border-transparent !bg-red-500/22 !text-foreground dark:!bg-red-950/55",
    tripConfirmed: "!bg-emerald-600/30 !text-foreground",
    tripPending: "!bg-amber-400/30 !text-foreground",
  };

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
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <DayPicker
          mode="multiple"
          month={month}
          onMonthChange={setMonth}
          locale={loc}
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
            ownerLockDay: "!box-border !rounded-md !border-2 !border-transparent !bg-red-500/22 !text-foreground dark:!bg-red-950/55",
            ownerLockDateSaved:
              "!box-border !rounded-md !border-2 !border-transparent !bg-red-500/26 !text-foreground !font-medium dark:!bg-red-950/62",
            ownerLockDateDraft:
              "!box-border !rounded-md !border-0 !bg-transparent !text-foreground !font-medium !shadow-none !ring-1 !ring-inset !ring-red-400/40 hover:!ring-red-400/55 dark:!ring-red-500/35 dark:hover:!ring-red-500/50",
          }}
          className="min-w-[260px] rounded-xl border border-border p-2 sm:p-3"
          classNames={{
            months: "flex flex-col sm:flex-row gap-4",
            month: "space-y-3",
            caption: "flex justify-center pt-1 relative items-center",
            nav: "flex items-center gap-1",
            nav_button: "h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-background opacity-80 hover:opacity-100",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative",
            day: "h-9 w-9 rounded-md p-0 font-normal box-border border-2 border-transparent aria-selected:opacity-100 hover:bg-accent",
            day_selected:
              "!border-2 !border-transparent !bg-transparent !font-medium !shadow-none focus:!text-foreground",
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
      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <DayPicker
        mode="single"
        month={month}
        onMonthChange={setMonth}
        locale={loc}
        selected={singleSelected}
        onSelect={
          props.variant === "picker"
            ? (d) => {
                if (d) props.onSelectDate(dayKey(d));
              }
            : undefined
        }
        disabled={props.variant === "picker" ? disabledMatcher : false}
        modifiers={{ ...modifiers }}
        modifiersClassNames={modifiersClassNames}
        className="min-w-[260px] rounded-xl border border-border p-2 sm:p-3"
        classNames={{
          months: "flex flex-col sm:flex-row gap-4",
          month: "space-y-3",
          caption: "flex justify-center pt-1 relative items-center",
          nav: "flex items-center gap-1",
          nav_button: "h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-background opacity-80 hover:opacity-100",
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
