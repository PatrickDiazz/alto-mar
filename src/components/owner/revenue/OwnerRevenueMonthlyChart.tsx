import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import {
  fetchOwnerRevenueDaily,
  fetchOwnerRevenueMonthly,
  formatRevenueDayLong,
  formatRevenueDayShort,
  formatRevenueMonthLong,
  formatRevenueMonthShort,
  type RevenueChartRange,
  type RevenueDailyPoint,
  type RevenueMonthlyPoint,
} from "@/lib/ownerRevenueApi";
import {
  loadOwnerRevenueChartPrefs,
  reconcileSelectedMonth,
  saveOwnerRevenueChartPrefs,
  type OwnerRevenueChartPrefs,
} from "@/lib/ownerRevenueChartPrefs";
import { toast } from "sonner";

const chartConfig = {
  revenue: {
    label: "Faturamento",
    color: "hsl(var(--primary))",
  },
};

const RANGE_OPTIONS: RevenueChartRange[] = [3, 6, 12];

type ChartRow = {
  label: string;
  revenue: number;
  monthKey?: string;
  dayKey?: string;
};

export function OwnerRevenueMonthlyChart() {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const [prefs, setPrefs] = useState(loadOwnerRevenueChartPrefs);
  const [monthlyPoints, setMonthlyPoints] = useState<RevenueMonthlyPoint[]>([]);
  const [dailyPoints, setDailyPoints] = useState<RevenueDailyPoint[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const isDayView = prefs.chartView === "day";

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const availableKeys = useMemo(() => monthlyPoints.map((p) => p.monthKey), [monthlyPoints]);

  const selectedMonthKey = useMemo(
    () => reconcileSelectedMonth(availableKeys, prefs.selectedMonthKey),
    [availableKeys, prefs.selectedMonthKey]
  );

  const persistPrefs = useCallback((next: OwnerRevenueChartPrefs) => {
    setPrefs(next);
    saveOwnerRevenueChartPrefs(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMonthly(true);
      try {
        const data = await fetchOwnerRevenueMonthly(prefs.rangeMonths);
        if (cancelled) return;
        setMonthlyPoints(data.points);
        const keys = data.points.map((p) => p.monthKey);
        setPrefs((current) => {
          const nextMonth = reconcileSelectedMonth(keys, current.selectedMonthKey);
          const updated: OwnerRevenueChartPrefs = {
            rangeMonths: current.rangeMonths,
            selectedMonthKey: nextMonth,
            chartView: current.chartView,
          };
          saveOwnerRevenueChartPrefs(updated);
          return updated;
        });
      } catch (e) {
        if (cancelled) return;
        const m = (e instanceof Error ? e.message : t("ownerRevenue.chartLoadFail")).trim();
        toast.error(m || t("ownerRevenue.chartLoadFail"));
        setMonthlyPoints([]);
      } finally {
        if (!cancelled) setLoadingMonthly(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefs.rangeMonths, t]);

  useEffect(() => {
    if (!isDayView || !selectedMonthKey) {
      setDailyPoints([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDaily(true);
      try {
        const data = await fetchOwnerRevenueDaily(selectedMonthKey);
        if (!cancelled) setDailyPoints(data.points);
      } catch (e) {
        if (cancelled) return;
        const m = (e instanceof Error ? e.message : t("ownerRevenue.chartDailyLoadFail")).trim();
        toast.error(m || t("ownerRevenue.chartDailyLoadFail"));
        setDailyPoints([]);
      } finally {
        if (!cancelled) setLoadingDaily(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDayView, selectedMonthKey, t]);

  const chartData: ChartRow[] = useMemo(() => {
    if (isDayView) {
      return dailyPoints.map((row) => ({
        dayKey: row.dayKey,
        label: formatRevenueDayShort(row.dayKey, locale),
        revenue: row.amountCents / 100,
      }));
    }
    return monthlyPoints.map((row) => ({
      monthKey: row.monthKey,
      label: formatRevenueMonthShort(row.monthKey, locale),
      revenue: row.amountCents / 100,
    }));
  }, [isDayView, dailyPoints, monthlyPoints, locale]);

  const loading = isDayView ? loadingMonthly || loadingDaily : loadingMonthly;

  const setRange = (value: string) => {
    if (value !== "3" && value !== "6" && value !== "12") return;
    const rangeMonths = Number(value) as RevenueChartRange;
    persistPrefs({
      rangeMonths,
      selectedMonthKey: prefs.selectedMonthKey,
      chartView: "range",
    });
  };

  const selectMonth = (monthKey: string) => {
    persistPrefs({
      ...prefs,
      selectedMonthKey: monthKey,
      chartView: "day",
    });
    setMonthPickerOpen(false);
  };

  const subtitle = useMemo(() => {
    if (loading && chartData.length === 0) return t("ownerRevenue.chartLoading");
    if (isDayView && selectedMonthKey) {
      return t("ownerRevenue.chartDailySubtitle", {
        month: formatRevenueMonthLong(selectedMonthKey, locale),
      });
    }
    return t(`ownerRevenue.chartRangeSubtitle${prefs.rangeMonths}`);
  }, [loading, chartData.length, isDayView, selectedMonthKey, prefs.rangeMonths, locale, t]);

  const xTickInterval = isDayView && chartData.length > 20 ? Math.floor(chartData.length / 8) : 0;

  return (
    <OwnerSurface className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t("ownerRevenue.chartTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={isDayView ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={loadingMonthly || monthlyPoints.length === 0}
                aria-label={t("ownerRevenue.chartMonthPickerAria")}
              >
                <Calendar className="h-4 w-4" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {t("ownerRevenue.chartSelectMonth")}
              </p>
              <ul className="max-h-64 overflow-y-auto" role="listbox" aria-label={t("ownerRevenue.chartMonthsAria")}>
                {[...monthlyPoints].reverse().map((p) => {
                  const active = isDayView && p.monthKey === selectedMonthKey;
                  return (
                    <li key={p.monthKey}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => selectMonth(p.monthKey)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span>{formatRevenueMonthLong(p.monthKey, locale)}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {currency.format(p.amountCents / 100)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
          <ToggleGroup
            type="single"
            value={isDayView ? "" : String(prefs.rangeMonths)}
            onValueChange={setRange}
            className="rounded-lg border border-border/50 bg-muted/30 p-0.5"
            aria-label={t("ownerRevenue.chartRangeAria")}
          >
            {RANGE_OPTIONS.map((n) => (
              <ToggleGroupItem
                key={n}
                value={String(n)}
                className="h-8 min-w-[3.25rem] px-2.5 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                {t(`ownerRevenue.chartRange${n}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-[220px] w-full sm:h-[260px]" />
      ) : chartData.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">{t("ownerRevenue.chartEmpty")}</p>
      ) : (
        <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full sm:h-[260px]">
          <BarChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={xTickInterval}
              className="text-[10px]"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              width={52}
              tickFormatter={(v) =>
                currency.format(v).replace(/\s/g, "").replace(/,00$/, "")
              }
              className="text-[10px]"
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
              content={
                <ChartTooltipContent
                  formatter={(value) => currency.format(Number(value))}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as ChartRow | undefined;
                    if (row?.dayKey) return formatRevenueDayLong(row.dayKey, locale);
                    if (row?.monthKey) return formatRevenueMonthLong(row.monthKey, locale);
                    return "";
                  }}
                />
              }
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
              maxBarSize={isDayView ? 14 : 48}
            />
          </BarChart>
        </ChartContainer>
      )}
    </OwnerSurface>
  );
}
