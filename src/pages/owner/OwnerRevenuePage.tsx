import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck, DollarSign, Wallet, XCircle } from "lucide-react";
import { OwnerRevenueStatCard } from "@/components/owner/revenue/OwnerRevenueStatCard";
import { OwnerRevenuePeriodFilter } from "@/components/owner/revenue/OwnerRevenuePeriodFilter";
import { OwnerRevenueSourceBreakdown } from "@/components/owner/revenue/OwnerRevenueSourceBreakdown";
import { OwnerRevenuePerformanceCard } from "@/components/owner/revenue/OwnerRevenuePerformanceCard";
import { OwnerRevenuePeriodSummary } from "@/components/owner/revenue/OwnerRevenuePeriodSummary";
import { OwnerRevenuePeriodChart } from "@/components/owner/revenue/OwnerRevenuePeriodChart";
import { OwnerUpcomingPayouts } from "@/components/owner/revenue/OwnerUpcomingPayouts";
import { OwnerStripeTransactions } from "@/components/owner/revenue/OwnerStripeTransactions";
import { OwnerPanelPage } from "@/components/owner/OwnerPanelPage";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import {
  fetchOwnerRevenueDashboard,
  type OwnerRevenueDashboard,
} from "@/lib/ownerRevenueDashboardApi";
import { parseOwnerRevenueYmd } from "@/lib/ownerRevenueDates";
import {
  loadOwnerRevenuePeriod,
  saveOwnerRevenuePeriod,
  type OwnerRevenuePeriodFilter,
} from "@/lib/ownerRevenuePeriod";
import { OWNER_REVENUE_UPCOMING } from "@/lib/ownerRevenueMock";
import { toast } from "sonner";

export default function OwnerRevenuePage() {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const [period, setPeriod] = useState<OwnerRevenuePeriodFilter>(loadOwnerRevenuePeriod);
  const [data, setData] = useState<OwnerRevenueDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }),
    [locale]
  );

  const load = useCallback(async () => {
    if (period.preset === "custom" && (!period.from || !period.to)) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const dash = await fetchOwnerRevenueDashboard(period);
      setData(dash);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("ownerRevenue.loadFail")).trim();
      toast.error(m || t("ownerRevenue.loadFail"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPeriodChange = (next: OwnerRevenuePeriodFilter) => {
    setPeriod(next);
    saveOwnerRevenuePeriod(next);
  };

  const periodLabel = useMemo(() => {
    if (!data?.period) return "";
    return t("ownerRevenue.periodRangeLabel", {
      from: dateFmt.format(parseOwnerRevenueYmd(data.period.from)),
      to: dateFmt.format(parseOwnerRevenueYmd(data.period.to)),
      preset: t(`ownerRevenue.period.${period.preset}`),
    });
  }, [data?.period, dateFmt, period.preset, t]);

  const chartSubtitle = useMemo(() => {
    if (!data?.chart) return periodLabel;
    return data.chart.granularity === "day"
      ? t("ownerRevenue.chartByDay")
      : t("ownerRevenue.chartByMonth");
  }, [data?.chart, periodLabel, t]);

  return (
    <OwnerPanelPage
      subtitle={t("ownerRevenue.subtitle")}
      actions={<OwnerRevenuePeriodFilter value={period} onChange={onPeriodChange} />}
      meta={
        data?.period && !loading ? (
          <p className="inline-flex max-w-full rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            {periodLabel}
          </p>
        ) : null
      }
      bodyLayout="stack"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OwnerRevenueStatCard
          label={t("ownerRevenue.statGrossPeriod")}
          value={currency.format((data?.financial.grossCents ?? 0) / 100)}
          loading={loading}
          icon={DollarSign}
          tone="positive"
        />
        <OwnerRevenueStatCard
          label={t("ownerRevenue.statNetPeriod")}
          value={currency.format((data?.financial.netCents ?? 0) / 100)}
          loading={loading}
          icon={Wallet}
          tone="positive"
        />
        <OwnerRevenueStatCard
          label={t("ownerRevenue.statConfirmed")}
          value={t("ownerRevenue.statConfirmedValue", {
            count: data?.summary.completedBookings ?? 0,
          })}
          loading={loading}
          icon={CalendarCheck}
        />
        <OwnerRevenueStatCard
          label={t("ownerRevenue.statCancellations")}
          value={t("ownerRevenue.statCancellationsValue", {
            count: data?.stats.cancellations ?? 0,
          })}
          loading={loading}
          icon={XCircle}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerRevenuePeriodChart chart={data?.chart ?? null} periodLabel={chartSubtitle} loading={loading} />
        <OwnerRevenueSourceBreakdown
          revenueBySource={data?.revenueBySource ?? null}
          grossCents={data?.financial.grossCents ?? 0}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerRevenuePerformanceCard financial={data?.financial ?? null} loading={loading} />
        <OwnerUpcomingPayouts items={OWNER_REVENUE_UPCOMING} />
      </div>

      <OwnerRevenuePeriodSummary summary={data?.summary ?? null} loading={loading} />

      <OwnerStripeTransactions />
    </OwnerPanelPage>
  );
}
