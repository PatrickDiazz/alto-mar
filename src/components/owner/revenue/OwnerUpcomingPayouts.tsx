import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import type { RevenueUpcomingPayout } from "@/lib/ownerRevenueMock";

export function OwnerUpcomingPayouts({ items }: { items: RevenueUpcomingPayout[] }) {
  const { t, i18n } = useTranslation();
  const locale = bcp47FromAppLang(i18n.language);
  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
      }),
    [locale]
  );

  return (
    <OwnerSurface className="flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Wallet className="h-4 w-4 text-primary" aria-hidden />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{t("ownerRevenue.upcomingTitle")}</h2>
      </div>
      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {items.map((item) => {
          const d = new Date(
            Number(item.date.slice(0, 4)),
            Number(item.date.slice(5, 7)) - 1,
            Number(item.date.slice(8, 10))
          );
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/35 bg-muted/10 px-3 py-2.5 transition-colors hover:bg-muted/20"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{dateFmt.format(d)}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px] font-medium",
                    item.status === "processing"
                      ? "text-amber-600 dark:text-amber-300"
                      : "text-muted-foreground"
                  )}
                >
                  {item.status === "processing"
                    ? t("ownerRevenue.upcomingProcessing")
                    : t("ownerRevenue.upcomingScheduled")}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {currency.format(item.amountCents / 100)}
              </p>
            </li>
          );
        })}
      </ul>
    </OwnerSurface>
  );
}
