import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { OwnerRevenueDelta } from "@/components/owner/revenue/OwnerRevenueDelta";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import type { OwnerRevenueDashboard } from "@/lib/ownerRevenueDashboardApi";

function MetricRow({
  label,
  value,
  deltaPct,
  loading,
}: {
  label: string;
  value: string;
  deltaPct: number;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        {loading ? (
          <Skeleton className="ml-auto h-5 w-24" />
        ) : (
          <>
            <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
            <OwnerRevenueDelta pct={deltaPct} className="mt-0.5 block" />
          </>
        )}
      </div>
    </div>
  );
}

export function OwnerRevenuePerformanceCard({
  financial,
  loading,
}: {
  financial: OwnerRevenueDashboard["financial"] | null;
  loading?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );
  const fmt = (cents: number) => currency.format(cents / 100);

  return (
    <OwnerSurface className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("ownerRevenue.performanceTitle")}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("ownerRevenue.performanceSubtitle")}</p>
      <div className="mt-2">
        <MetricRow
          label={t("ownerRevenue.performanceGross")}
          value={fmt(financial?.grossCents ?? 0)}
          deltaPct={financial?.grossDeltaPct ?? 0}
          loading={loading}
        />
        <MetricRow
          label={t("ownerRevenue.performanceDiscounts")}
          value={fmt(financial?.discountsCents ?? 0)}
          deltaPct={financial?.discountsDeltaPct ?? 0}
          loading={loading}
        />
        <MetricRow
          label={t("ownerRevenue.performancePlatformFees")}
          value={fmt(financial?.platformFeesCents ?? 0)}
          deltaPct={financial?.platformFeesDeltaPct ?? 0}
          loading={loading}
        />
        <MetricRow
          label={t("ownerRevenue.performanceNet")}
          value={fmt(financial?.netCents ?? 0)}
          deltaPct={financial?.netDeltaPct ?? 0}
          loading={loading}
        />
      </div>
    </OwnerSurface>
  );
}
