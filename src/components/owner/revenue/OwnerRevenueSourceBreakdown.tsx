import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ship, Sparkles } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import type {
  OwnerRevenueBySource,
  RevenueSourceSegmentId,
} from "@/lib/ownerRevenueDashboardApi";
const SEGMENT_COLORS: Record<RevenueSourceSegmentId, string> = {
  boats: "hsl(var(--primary))",
  optionals: "hsl(160 55% 42%)",
};

const chartConfig = {
  value: { label: "Valor", color: "hsl(var(--primary))" },
};

type DetailView = RevenueSourceSegmentId | null;

export function OwnerRevenueSourceBreakdown({
  revenueBySource,
  grossCents,
  loading,
}: {
  revenueBySource: OwnerRevenueBySource | null;
  grossCents: number;
  loading?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const [detail, setDetail] = useState<DetailView>(null);

  useEffect(() => {
    setDetail(null);
  }, [revenueBySource, grossCents]);

  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  const segments = revenueBySource?.segments ?? [];
  const chartData = segments.map((s) => ({
    ...s,
    name: t(`ownerRevenue.source.${s.id}`),
    value: s.amountCents / 100,
  }));

  const openDetail = (id: RevenueSourceSegmentId) => setDetail(id);
  const closeDetail = () => setDetail(null);

  const detailTitle =
    detail === "boats"
      ? t("ownerRevenue.breakdownBoatsTitle")
      : detail === "optionals"
        ? t("ownerRevenue.breakdownOptionalsTitle")
        : "";

  return (
    <OwnerSurface className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {detail ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 gap-1 px-2 text-xs"
              onClick={closeDetail}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {t("ownerRevenue.breakdownBack")}
            </Button>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-foreground">
                {t("ownerRevenue.categoriesTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("ownerRevenue.categoriesTapHint")}
              </p>
            </>
          )}
          {detail ? (
            <h3 className="mt-2 text-sm font-semibold text-foreground">{detailTitle}</h3>
          ) : null}
        </div>
      </div>

      {loading ? (
        <Skeleton className="mx-auto mt-6 h-[200px] w-[200px] rounded-full" />
      ) : detail === "boats" ? (
        <BreakdownList
          empty={t("ownerRevenue.breakdownBoatsEmpty")}
          currency={currency}
          items={(revenueBySource?.boats ?? []).map((b) => ({
            key: b.id,
            name: b.name,
            amountCents: b.amountCents,
            count: b.tripCount,
            countLabel: t("ownerRevenue.breakdownTrips", { count: b.tripCount }),
            pct: b.pct,
            icon: Ship,
          }))}
        />
      ) : detail === "optionals" ? (
        <BreakdownList
          empty={t("ownerRevenue.breakdownOptionalsEmpty")}
          currency={currency}
          items={(revenueBySource?.optionals ?? []).map((o) => ({
            key: o.id,
            name: o.name,
            amountCents: o.amountCents,
            count: o.requestCount,
            countLabel: t("ownerRevenue.breakdownRequests", { count: o.requestCount }),
            pct: o.pct,
            icon: Sparkles,
          }))}
        />
      ) : chartData.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{t("ownerRevenue.chartEmpty")}</p>
      ) : (
        <>
          <p className="mt-3 text-center text-lg font-bold tabular-nums text-foreground">
            {currency.format(grossCents / 100)}
          </p>
          <p className="text-center text-[11px] text-muted-foreground">
            {t("ownerRevenue.categoriesGross")}
          </p>
          <ChartContainer config={chartConfig} className="mx-auto mt-2 h-[200px] w-full max-w-[240px]">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="88%"
                paddingAngle={2}
                strokeWidth={0}
                onClick={(_, index) => {
                  const seg = chartData[index];
                  if (seg?.id === "boats" || seg?.id === "optionals") openDetail(seg.id);
                }}
                style={{ cursor: "pointer" }}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={SEGMENT_COLORS[entry.id]} />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const row = item?.payload as (typeof chartData)[0];
                      return [
                        currency.format(Number(value)),
                        `${row?.pct ?? 0}% · ${t("ownerRevenue.categoriesTapHint")}`,
                      ];
                    }}
                  />
                }
              />
            </PieChart>
          </ChartContainer>
          <ul className="mt-4 space-y-2">
            {chartData.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => openDetail(s.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-xs transition-colors hover:bg-muted/60"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: SEGMENT_COLORS[s.id] }}
                      aria-hidden
                    />
                    <span className="truncate font-medium text-foreground">{s.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {s.pct}% · {currency.format(s.amountCents / 100)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </OwnerSurface>
  );
}

function BreakdownList({
  items,
  empty,
  currency,
}: {
  items: {
    key: string;
    name: string;
    amountCents: number;
    count: number;
    countLabel: string;
    pct: number;
    icon: typeof Ship;
  }[];
  empty: string;
  currency: Intl.NumberFormat;
}) {
  if (items.length === 0) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ol className="mt-4 max-h-[320px] space-y-2 overflow-y-auto">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <li
            key={item.key}
            className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                {item.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{item.countLabel}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {currency.format(item.amountCents / 100)}
              </p>
              <p className="text-[11px] tabular-nums text-muted-foreground">{item.pct}%</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
