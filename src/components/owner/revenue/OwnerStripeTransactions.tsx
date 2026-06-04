import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OwnerSurface } from "@/components/owner/OwnerSurface";
import { bcp47FromAppLang } from "@/lib/localeFormat";
import {
  fetchOwnerStripeTransactions,
  type OwnerStripeTransaction,
  type OwnerStripeTransactionStatus,
} from "@/lib/ownerStripeTransactionsApi";
import { toast } from "sonner";

function statusTone(status: OwnerStripeTransactionStatus): string {
  if (status === "paid") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
  if (status === "pending" || status === "awaiting") return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  return "bg-red-500/15 text-red-600 dark:text-red-300";
}

export function OwnerStripeTransactions() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = bcp47FromAppLang(i18n.language);
  const [monthFilter, setMonthFilter] = useState("all");
  const [boatFilter, setBoatFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [transactions, setTransactions] = useState<OwnerStripeTransaction[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [boats, setBoats] = useState<{ id: string; name: string }[]>([]);

  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale]
  );
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }),
    [locale]
  );

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
      new Date(y, m - 1, 1)
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOwnerStripeTransactions({
        month: monthFilter,
        boatId: boatFilter,
      });
      setStripeEnabled(data.stripeEnabled);
      setTransactions(data.transactions);
      setFilterMonths(data.filterMonths);
      setBoats(data.boats);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("ownerRevenue.stripeLoadFail")).trim();
      toast.error(m || t("ownerRevenue.stripeLoadFail"));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [monthFilter, boatFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (iso: string | null, fallback: string) => {
    const raw = iso || fallback;
    const d = new Date(
      Number(raw.slice(0, 4)),
      Number(raw.slice(5, 7)) - 1,
      Number(raw.slice(8, 10))
    );
    return dateFmt.format(d);
  };

  const openReceipt = (row: OwnerStripeTransaction) => {
    if (row.receiptUrl) {
      window.open(row.receiptUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast.message(t("ownerRevenue.stripeReceiptUnavailable"));
  };

  return (
    <OwnerSurface className="overflow-hidden p-0">
      <div className="border-b border-border/40 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("ownerRevenue.stripeTitle")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("ownerRevenue.stripeSubtitle")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={monthFilter} onValueChange={setMonthFilter} disabled={loading}>
              <SelectTrigger className="h-9 w-full min-w-[140px] sm:w-[160px]">
                <SelectValue placeholder={t("ownerRevenue.filterMonth")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ownerRevenue.allMonths")}</SelectItem>
                {filterMonths.map((ym) => (
                  <SelectItem key={ym} value={ym}>
                    {formatMonthLabel(ym)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={boatFilter} onValueChange={setBoatFilter} disabled={loading}>
              <SelectTrigger className="h-9 w-full min-w-[140px] sm:w-[180px]">
                <SelectValue placeholder={t("ownerRevenue.filterBoat")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ownerRevenue.allBoats")}</SelectItem>
                {boats.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!stripeEnabled ? (
        <div className="space-y-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("ownerRevenue.stripeDisabled")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/marinheiro/perfil")}>
            {t("ownerRevenue.stripeConnectCta")}
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{t("ownerRevenue.stripeEmpty")}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[19%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[30%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("ownerRevenue.colClient")}</th>
                  <th className="px-4 py-3 font-medium">{t("ownerRevenue.colBoat")}</th>
                  <th className="px-4 py-3 font-medium">{t("ownerRevenue.colDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("ownerRevenue.colAmount")}</th>
                  <th className="px-4 py-3 font-medium">{t("ownerRevenue.colStatus")}</th>
                  <th className="px-2 py-3 text-center font-medium">{t("ownerRevenue.colReceipt")}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/25 transition-colors last:border-0 hover:bg-muted/20"
                  >
                    <td className="truncate px-4 py-3.5 font-medium text-foreground">{row.client}</td>
                    <td className="truncate px-4 py-3.5 text-muted-foreground">{row.boat}</td>
                    <td className="px-4 py-3.5 tabular-nums text-muted-foreground">
                      {formatDate(row.paidAt, row.date)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums text-foreground">
                      {currency.format(row.amountCents / 100)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex max-w-full whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                          statusTone(row.status)
                        )}
                      >
                        {t(`ownerRevenue.stripeStatus.${row.status}`)}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => openReceipt(row)}
                        title={t("ownerRevenue.viewReceipt")}
                        aria-label={t("ownerRevenue.viewReceipt")}
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border/30 md:hidden">
            {transactions.map((row) => (
              <li key={row.id} className="space-y-2 px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.client}</p>
                    <p className="text-xs text-muted-foreground">{row.boat}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      statusTone(row.status)
                    )}
                  >
                    {t(`ownerRevenue.stripeStatus.${row.status}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatDate(row.paidAt, row.date)}</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {currency.format(row.amountCents / 100)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full gap-1.5 text-xs"
                  onClick={() => openReceipt(row)}
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  {t("ownerRevenue.viewReceipt")}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </OwnerSurface>
  );
}
