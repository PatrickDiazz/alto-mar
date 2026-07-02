import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { RenterBooking } from "./renterBookingTypes";
import {
  RENTER_BORDER_DIVIDER,
  RENTER_BTN_PRIMARY,
  RENTER_CARD,
  RENTER_CARD_COMPACT,
  RENTER_SURFACE,
  RENTER_TEXT_ACCENT,
  RENTER_TEXT_BODY,
  RENTER_TEXT_LABEL,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_TITLE,
  financialBreakdown,
  isPaid,
  paymentMethodLabel,
} from "./renterBookingUi";
import { RenterBookingStatusBadge } from "./RenterBookingStatusBadge";
import {
  buildReceiptLabels,
  downloadRenterBookingReceiptPdf,
  receiptPaymentMethodLabel,
} from "@/lib/renterBookingReceiptPdf";

type Props = {
  booking: RenterBooking;
  currencyFmt: Intl.NumberFormat;
  t: (k: string) => string;
  lang: string;
  stripeCheckoutDue?: boolean;
  stripePaying?: boolean;
  onStripeCheckout?: () => void;
  className?: string;
  compact?: boolean;
  embedded?: boolean;
};

export function RenterBookingFinancialCard({
  booking,
  currencyFmt,
  t,
  lang,
  stripeCheckoutDue,
  stripePaying,
  onStripeCheckout,
  className,
  compact = false,
  embedded = false,
}: Props) {
  const { tripReais, extrasReais, totalReais } = financialBreakdown(booking);
  const paid = isPaid(booking);
  const cardClass = compact ? RENTER_CARD_COMPACT : RENTER_CARD;
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  const handleReceiptDownload = async () => {
    if (!paid || generatingReceipt) return;
    setGeneratingReceipt(true);
    try {
      await downloadRenterBookingReceiptPdf({
        booking,
        currencyFmt,
        lang,
        labels: buildReceiptLabels(t),
        paymentMethod: receiptPaymentMethodLabel(booking, t),
      });
    } catch {
      toast.error(t("reservasConta.receiptFail"));
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const content = (
    <>
      <h3 className={cn(compact ? "text-xs font-semibold" : "text-sm font-semibold", RENTER_TEXT_TITLE)}>
        {t("reservasConta.financialSummary")}
      </h3>

      <dl className={cn(compact ? "mt-3 space-y-2 text-xs" : "mt-5 space-y-3 text-sm")}>
        <div className="flex items-center justify-between gap-2">
          <dt className={RENTER_TEXT_MUTED}>{t("reservasConta.tripValue")}</dt>
          <dd className={cn("font-medium tabular-nums", RENTER_TEXT_TITLE)}>
            {currencyFmt.format(tripReais + extrasReais)}
          </dd>
        </div>
        {extrasReais > 0 ? (
          <div className={cn("flex items-center justify-between gap-2", RENTER_TEXT_LABEL)}>
            <dt>{t("reservasConta.extrasIncluded")}</dt>
            <dd className="tabular-nums">{currencyFmt.format(extrasReais)}</dd>
          </div>
        ) : null}
        <div className={cn("border-t pt-2", RENTER_BORDER_DIVIDER)}>
          <div className="flex items-center justify-between gap-2">
            <dt className={cn("font-semibold", RENTER_TEXT_TITLE)}>{t("common.total")}</dt>
            <dd className={cn(compact ? "text-base font-bold" : "text-lg font-bold", "tabular-nums", RENTER_TEXT_ACCENT)}>
              {currencyFmt.format(totalReais)}
            </dd>
          </div>
        </div>
      </dl>

      <div className={cn("rounded-lg px-3 py-2", compact ? "mt-3 space-y-1.5 text-xs" : "mt-5 space-y-2 text-sm rounded-xl px-4 py-3", RENTER_SURFACE)}>
        <div className="flex items-center justify-between gap-2">
          <span className={RENTER_TEXT_MUTED}>{t("reservasConta.paymentStatus")}</span>
          {paid ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {t("reservasConta.paymentApproved")}
            </span>
          ) : (
            <RenterBookingStatusBadge status="PENDING" t={t} showDot={false} className="!px-2 !py-0.5 text-[10px]" />
          )}
        </div>
        {!compact ? (
          <div className="flex items-center justify-between gap-2">
            <span className={RENTER_TEXT_MUTED}>{t("reservasConta.paymentMethod")}</span>
            <span className={cn("font-medium", RENTER_TEXT_BODY)}>{paymentMethodLabel(booking, t)}</span>
          </div>
        ) : null}
      </div>

      {stripeCheckoutDue && onStripeCheckout ? (
        <Button
          type="button"
          disabled={Boolean(stripePaying)}
          className={cn(compact ? "mt-3 h-8 w-full text-xs" : "mt-5 w-full", RENTER_BTN_PRIMARY)}
          onClick={onStripeCheckout}
        >
          {stripePaying ? t("reservasConta.payStripeSubmitting") : t("reservasConta.payNow")}
        </Button>
      ) : null}

      {paid ? (
        <Button
          type="button"
          variant="outline"
          disabled={generatingReceipt}
          className={cn(
            compact ? "mt-3 h-8 w-full text-xs" : "mt-4 w-full",
            "border-slate-200/80 bg-white hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/40"
          )}
          onClick={() => void handleReceiptDownload()}
        >
          <FileDown className={cn("shrink-0", compact ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4")} />
          {generatingReceipt ? t("reservasConta.receiptGenerating") : t("reservasConta.receiptDownload")}
        </Button>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className={cn("min-w-0", compact ? "lg:w-[220px] lg:shrink-0" : "", className)}>{content}</div>;
  }

  return (
    <aside className={cn(!compact && "lg:sticky lg:top-24 lg:self-start", className)}>
      <div className={cardClass}>{content}</div>
    </aside>
  );
}
