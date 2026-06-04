import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import {
  formatRevenueDayLong,
  formatRevenueDayShort,
  formatRevenueMonthLong,
  formatRevenueMonthShort,
} from "@/lib/ownerRevenueApi";
import type { OwnerRevenueDashboard } from "@/lib/ownerRevenueDashboardApi";

const chartConfig = {
  revenue: { label: "Faturamento", color: "hsl(var(--primary))" },
};

export function OwnerRevenuePeriodChart({
  chart,
  periodLabel,
  loading,
}: {
  chart: OwnerRevenueDashboard["chart"] | null;
  periodLabel: string;
  loading?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const isDay = chart?.granularity === "day";

  const chartData = useMemo(() => {
    if (!chart?.points.length) return [];
    return chart.points.map((p) => ({
      pointKey: p.pointKey,
      label: isDay
        ? formatRevenueDayShort(p.pointKey, locale)
        : formatRevenueMonthShort(p.pointKey, locale),
      revenue: p.amountCents / 100,
    }));
  }, [chart, isDay, locale]);

  const xInterval = isDay && chartData.length > 20 ? Math.floor(chartData.length / 8) : 0;

  return (
    <OwnerSurface className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("ownerRevenue.chartTitle")}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {loading ? t("ownerRevenue.chartLoading") : periodLabel}
      </p>
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
              interval={xInterval}
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
                    const key = (payload?.[0]?.payload as { pointKey?: string })?.pointKey;
                    if (!key) return "";
                    return isDay
                      ? formatRevenueDayLong(key, locale)
                      : formatRevenueMonthLong(key, locale);
                  }}
                />
              }
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
              maxBarSize={isDay ? 12 : 40}
            />
          </BarChart>
        </ChartContainer>
      )}
    </OwnerSurface>
  );
}
