import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Anchor, CalendarCheck, Percent, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerRevenueStatCard } from "@/components/owner/revenue/OwnerRevenueStatCard";
import { OwnerRevenueDelta } from "@/components/owner/revenue/OwnerRevenueDelta";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import type { OwnerRevenueDashboard } from "@/lib/ownerRevenueDashboardApi";

export function OwnerRevenuePeriodSummary({
  summary,
  loading,
}: {
  summary: OwnerRevenueDashboard["summary"] | null;
  loading?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  const deltaHint = (pct: number) =>
    loading ? "…" : (
      <span className="inline-flex items-center gap-1">
        <OwnerRevenueDelta pct={pct} />
        <span className="text-muted-foreground">{t("ownerRevenue.vsPreviousPeriod")}</span>
      </span>
    );

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{t("ownerRevenue.summaryTitle")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <OwnerRevenueStatCard
          label={t("ownerRevenue.summaryBookings")}
          value={String(summary?.completedBookings ?? 0)}
          loading={loading}
          hint={deltaHint(summary?.completedBookingsDeltaPct ?? 0)}
          icon={CalendarCheck}
        />
        <OwnerRevenueStatCard
          label={t("ownerRevenue.summaryOccupancy")}
          value={`${summary?.occupancyPct ?? 0}%`}
          loading={loading}
          hint={deltaHint(summary?.occupancyDeltaPct ?? 0)}
          icon={Percent}
          tone="positive"
        />
        <OwnerRevenueStatCard
          label={t("ownerRevenue.summaryAvgTicket")}
          value={currency.format((summary?.avgTicketCents ?? 0) / 100)}
          loading={loading}
          hint={deltaHint(summary?.avgTicketDeltaPct ?? 0)}
          icon={Ticket}
        />
        <OwnerRevenueStatCard
          label={t("ownerRevenue.summaryPerBoat")}
          value={currency.format((summary?.revenuePerBoatCents ?? 0) / 100)}
          loading={loading}
          hint={deltaHint(summary?.revenuePerBoatDeltaPct ?? 0)}
          icon={Anchor}
        />
      </div>
    </div>
  );
}
