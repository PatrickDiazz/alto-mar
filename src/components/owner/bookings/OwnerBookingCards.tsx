import { useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import {
  RESCHEDULE_REASONS,
  type RescheduleReason,
  rescheduleReasonI18nKey,
} from "@/lib/rescheduleReasons";
import type { OwnerBookingRow } from "@/lib/ownerBookingTypes";
import { formatBookingCountdown } from "@/lib/ownerBookingTiming";
import { getOwnerCancelPenaltyHint } from "@/lib/ownerCancelUi";
import { cn } from "@/lib/utils";

export function translateRescheduleReason(
  tr: (k: string) => string,
  reason: string | null | undefined
): string {
  if (!reason) return "";
  if (RESCHEDULE_REASONS.includes(reason as RescheduleReason)) {
    return tr(rescheduleReasonI18nKey(reason as RescheduleReason));
  }
  return reason;
}

export function OwnerRescheduleJustification({
  b,
  t,
}: {
  b: OwnerBookingRow;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  if (!b.rescheduleTitle) return null;
  return (
    <div className="space-y-2 break-words rounded-lg border-0 bg-muted p-3 text-xs shadow-card dark:bg-card">
      <p className="font-semibold text-foreground">{t("marinheiro.rescheduleJustificationHeading")}</p>
      {b.rescheduleReason ? (
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{t("reservasConta.rescheduleReasonLabel")}: </span>
          {translateRescheduleReason(t, b.rescheduleReason)}
        </p>
      ) : null}
      <p className="font-medium text-foreground">{b.rescheduleTitle}</p>
      {b.rescheduleNote ? <p className="whitespace-pre-wrap text-muted-foreground">{b.rescheduleNote}</p> : null}
      {(b.rescheduleAttachments ?? []).length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{t("marinheiro.rescheduleImages")}</p>
          <div className="flex flex-wrap gap-2">
            {(b.rescheduleAttachments ?? []).map((url, i) => (
              <a key={`${b.id}-att-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={url} alt="" className="h-20 w-auto max-w-[120px] rounded border object-cover" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MarinheiroAcceptedBookingCard({
  b,
  t,
  currencyFmt,
  loading,
  dayDiff,
  onComplete,
  paymentsProvider,
  onStripePayout,
  onCancelAccepted,
  variant = "panel",
}: {
  b: OwnerBookingRow;
  t: (k: string, o?: Record<string, unknown>) => string;
  currencyFmt: Intl.NumberFormat;
  loading: boolean;
  dayDiff: number | null;
  onComplete: (id: string) => void;
  paymentsProvider: "stripe" | "mercadopago";
  onStripePayout?: (id: string) => void;
  onCancelAccepted?: (id: string, reason: string, scenario: "owner" | "weather" | "boat_failure") => void;
  variant?: "panel" | "detail";
}) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelScenario, setCancelScenario] = useState<"owner" | "weather" | "boat_failure">("owner");
  const overdue = dayDiff !== null && dayDiff < 0;
  const inProgressToday = dayDiff === 0;
  const canComplete = dayDiff !== null && dayDiff <= 0;
  const stripeMode = paymentsProvider === "stripe" || b.paymentProvider === "STRIPE";
  const paidStripe = b.paymentProvider === "STRIPE" && b.paymentStatus === "APPROVED";
  const sf = b.stripeFlowStatus;
  const canStripePayout =
    stripeMode &&
    paidStripe &&
    canComplete &&
    (sf === "PAID" || sf === "TRANSFER_FAILED") &&
    Boolean(onStripePayout);
  const showStripeAwaitPayment = stripeMode && !paidStripe;
  const showStripeProcessing =
    stripeMode && paidStripe && (sf === "TRANSFER_PENDING" || sf === "TRANSFER_PROCESSING");

  const actionHints = (
    <>
      {overdue ? (
        <p className="text-pretty text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
          {t("marinheiro.acceptedOverdueHint")}
        </p>
      ) : null}
      {dayDiff !== null && dayDiff > 0 ? (
        <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
          {formatBookingCountdown(dayDiff, t)}
        </p>
      ) : null}
      {dayDiff === null && !b.bookingDate ? (
        <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
          {t("marinheiro.completeNoDateHint")}
        </p>
      ) : null}
    </>
  );

  const primaryAction = !stripeMode ? (
    <Button onClick={() => onComplete(b.id)} disabled={loading || !canComplete} className="w-full sm:w-auto">
      {t("marinheiro.completeBooking")}
    </Button>
  ) : showStripeAwaitPayment ? (
    <p className="text-pretty text-xs text-muted-foreground">{t("marinheiro.stripeAwaitPayment")}</p>
  ) : showStripeProcessing ? (
    <Button type="button" disabled className="w-full sm:w-auto" variant="secondary">
      {t("marinheiro.stripeTransferProcessing")}
    </Button>
  ) : canStripePayout ? (
    <Button
      type="button"
      onClick={() => onStripePayout?.(b.id)}
      disabled={loading}
      className="w-full sm:w-auto"
    >
      {sf === "TRANSFER_FAILED" ? t("marinheiro.stripePayoutRetry") : t("marinheiro.stripePayoutButton")}
    </Button>
  ) : (
    <Button onClick={() => onComplete(b.id)} disabled={loading || !canComplete} className="w-full sm:w-auto">
      {t("marinheiro.completeBooking")}
    </Button>
  );

  const cancelBlock = onCancelAccepted ? (
    (() => {
      const penaltyHint = getOwnerCancelPenaltyHint(
        b,
        paymentsProvider,
        showCancel ? cancelScenario : "owner",
        (amount) => currencyFmt.format(amount),
        t
      );

      return (
        <div className="space-y-3 border-t border-border/30 pt-4">
          {!showCancel ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <p
                className={cn(
                  "min-w-0 flex-1 text-xs leading-relaxed",
                  penaltyHint.rulesReady ? "text-muted-foreground" : "text-amber-800 dark:text-amber-200/90"
                )}
              >
                {penaltyHint.message}
              </p>
              <Button
                type="button"
                variant="destructive"
                className="w-full shrink-0 sm:w-auto"
                disabled={loading}
                onClick={() => setShowCancel(true)}
              >
                {t("marinheiro.cancelShort")}
              </Button>
            </div>
          ) : (
            <>
              <p
                className={cn(
                  "text-xs leading-relaxed",
                  penaltyHint.rulesReady ? "text-muted-foreground" : "text-amber-800 dark:text-amber-200/90"
                )}
              >
                {penaltyHint.message}
              </p>
              <Label className="text-xs">{t("marinheiro.cancelScenarioLabel")}</Label>
              <Select
                value={cancelScenario}
                onValueChange={(v) => setCancelScenario(v as "owner" | "weather" | "boat_failure")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t("marinheiro.cancelScenarioOwner")}</SelectItem>
                  <SelectItem value="weather">{t("marinheiro.cancelScenarioWeather")}</SelectItem>
                  <SelectItem value="boat_failure">{t("marinheiro.cancelScenarioBoatFailure")}</SelectItem>
                </SelectContent>
              </Select>
              <Label className="text-xs">{t("marinheiro.cancelReasonLabel")}</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("marinheiro.cancelReasonPh")}
                rows={2}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:flex-1"
                  disabled={loading || cancelReason.trim().length < 10}
                  onClick={() => onCancelAccepted(b.id, cancelReason.trim(), cancelScenario)}
                >
                  {t("marinheiro.cancelConfirm")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:flex-1"
                  disabled={loading}
                  onClick={() => {
                    setShowCancel(false);
                    setCancelReason("");
                  }}
                >
                  {t("marinheiro.cancelAbort")}
                </Button>
              </div>
            </>
          )}
        </div>
      );
    })()
  ) : null;

  if (variant === "detail") {
    return (
      <div className="space-y-4">
        {overdue ? (
          <Badge className="border-amber-600/60 bg-amber-500/15 text-amber-950 dark:text-amber-100">
            {t("marinheiro.acceptedOverdueBadge")}
          </Badge>
        ) : null}
        {actionHints}
        {primaryAction}
        {cancelBlock}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "surface-elevated space-y-3 rounded-xl p-3 sm:p-4",
        overdue && "ring-2 ring-amber-500/45 dark:ring-amber-400/35",
        inProgressToday && "ring-2 ring-emerald-500/40 dark:ring-emerald-400/30"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{b.boat.nome}</p>
          {inProgressToday ? (
            <Badge className="shrink-0 border-emerald-600/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-100">
              {t("ownerBooking.statusInProgress")}
            </Badge>
          ) : overdue ? (
            <Badge className="shrink-0 border-amber-600/60 bg-amber-500/15 text-amber-950 dark:text-amber-100">
              {t("marinheiro.acceptedOverdueBadge")}
            </Badge>
          ) : dayDiff !== null && dayDiff > 0 ? (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {formatBookingCountdown(dayDiff, t)}
            </Badge>
          ) : null}
        </div>
        <p className="break-words text-xs text-muted-foreground">
          {t("marinheiro.client")} {b.renter.nome}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("marinheiro.total")} {currencyFmt.format(b.totalCents / 100)}
        </p>
        {b.bookingDate ? (
          <p className="text-xs font-medium text-foreground">
            {t("marinheiro.bookingDateLabel")}: {b.bookingDate}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t("marinheiro.embark")}{" "}
          {[b.embarkLocation, b.embarkTime].filter(Boolean).join(" · ") ||
            t("reservar.embarkToArrangeShort")}
        </p>
        {b.routeIslands && b.routeIslands.length > 0 ? (
          <p className="break-words text-xs text-muted-foreground">
            {t("marinheiro.bookingRoute")}: {b.routeIslands.join(", ")}
          </p>
        ) : null}
      </div>
      <OwnerRescheduleJustification b={b} t={t} />
      {overdue ? (
        <p className="text-pretty text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
          {t("marinheiro.acceptedOverdueHint")}
        </p>
      ) : null}
      {dayDiff !== null && dayDiff > 0 ? (
        <p className="text-pretty text-[11px] leading-relaxed text-muted-foreground">
          {t("marinheiro.completeAvailableOnDay")}
        </p>
      ) : null}
      {dayDiff === null && !b.bookingDate ? (
        <p className="text-pretty text-[11px] leading-relaxed text-muted-foreground">
          {t("marinheiro.completeNoDateHint")}
        </p>
      ) : null}
      {primaryAction}
      {cancelBlock}
    </div>
  );
}

export function RateRenterForm({
  bookingId,
  t,
  onDone,
  embedded = false,
}: {
  bookingId: string;
  t: (k: string, o?: Record<string, unknown>) => string;
  onDone: (rating: { stars: number; comment: string | null }) => void;
  embedded?: boolean;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (stars < 1) {
      toast.error(t("marinheiro.rateRenterPickStars"));
      return;
    }
    setSubmitting(true);
    try {
      const resp = await authFetch(`/api/owner/bookings/${bookingId}/rate-renter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment: comment.trim() || undefined }),
      });
      if (resp.status === 401) return;
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("marinheiro.rateRenterFail")));
      toast.success(t("marinheiro.rateRenterOk"));
      onDone({ stars, comment: comment.trim() || null });
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.rateRenterFail")).trim();
      toast.error(m || t("marinheiro.rateRenterFail"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-3", !embedded && "border-t border-border pt-1")}>
      <p className="text-xs font-medium text-foreground">{t("marinheiro.rateRenterTitle")}</p>
      <p className="text-[11px] text-muted-foreground">{t("marinheiro.rateRenterHint")}</p>
      <div className="flex items-center gap-1" role="group" aria-label={t("marinheiro.rateRenterTitle")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="rounded p-0.5 hover:bg-secondary disabled:opacity-50"
            disabled={submitting}
            onClick={() => setStars(n)}
            aria-pressed={stars >= n}
          >
            <Star
              className={`h-7 w-7 ${n <= stars ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
      <div className="min-w-0">
        <Label className="text-xs">{t("marinheiro.rateRenterComment")}</Label>
        <Input
          className="mt-1 h-9 min-w-0 text-sm"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          disabled={submitting}
        />
      </div>
      <Button size="sm" onClick={() => void submit()} disabled={submitting}>
        {submitting ? t("marinheiro.rateRenterSubmitting") : t("marinheiro.rateRenterSubmit")}
      </Button>
    </div>
  );
}

export function OwnerPendingBookingCard({
  b,
  t,
  currencyFmt,
  loading,
  noteById,
  setNoteById,
  decide,
  paymentsProvider,
  expanded,
  onToggleExpand,
  variant = "panel",
}: {
  b: OwnerBookingRow;
  t: (k: string, o?: Record<string, unknown>) => string;
  currencyFmt: Intl.NumberFormat;
  loading: boolean;
  noteById: Record<string, string>;
  setNoteById: Dispatch<SetStateAction<Record<string, string>>>;
  decide: (id: string, action: "accept" | "decline") => void;
  paymentsProvider: "stripe" | "mercadopago";
  expanded: boolean;
  onToggleExpand: () => void;
  variant?: "panel" | "detail";
}) {
  const stripeMode = paymentsProvider === "stripe" || b.paymentProvider === "STRIPE";
  const stripePaidForAccept = b.paymentProvider === "STRIPE" && b.paymentStatus === "APPROVED";
  const acceptBlockedStripe = stripeMode && !stripePaidForAccept;

  const actionBody = (
    <>
      <div className="space-y-1">
        <Label className="text-xs">{t("marinheiro.noteLabel")}</Label>
        <Textarea
          value={noteById[b.id] || ""}
          onChange={(e) => setNoteById((p) => ({ ...p, [b.id]: e.target.value }))}
          placeholder={t("marinheiro.notePh")}
          rows={2}
        />
      </div>

      {acceptBlockedStripe ? (
        <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
          {t("marinheiro.stripeAcceptRequiresPayment")}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full sm:flex-1"
          onClick={() => decide(b.id, "accept")}
          disabled={loading || acceptBlockedStripe}
        >
          {t("marinheiro.accept")}
        </Button>
        <Button
          className="w-full sm:flex-1"
          variant="destructive"
          onClick={() => decide(b.id, "decline")}
          disabled={loading}
        >
          {t("marinheiro.decline")}
        </Button>
      </div>
    </>
  );

  if (variant === "detail") {
    return <div className="space-y-4">{actionBody}</div>;
  }

  return (
    <div className="surface-elevated overflow-hidden rounded-xl">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/45 active:bg-muted/60 md:hidden"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-controls={`marinheiro-pend-body-${b.id}`}
        id={`marinheiro-pend-trigger-${b.id}`}
        aria-label={t("marinheiro.mobilePendingToggleAria", { boat: b.boat.nome })}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{b.boat.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{b.renter.nome}</p>
          <p className="text-xs text-muted-foreground">
            {t("marinheiro.total")} {currencyFmt.format(b.totalCents / 100)}
          </p>
        </div>
        <Badge className="shrink-0 bg-accent text-accent-foreground">{t("marinheiro.pendingBadge")}</Badge>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      <div
        id={`marinheiro-pend-body-${b.id}`}
        role="region"
        aria-labelledby={`marinheiro-pend-trigger-${b.id}`}
        className={cn(
          "space-y-3 border-border p-3 md:p-4",
          expanded ? "block border-t md:border-t-0" : "hidden",
          "md:block"
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{b.boat.nome}</p>
            <p className="break-words text-xs text-muted-foreground">
              {t("marinheiro.client")} {b.renter.nome} ({b.renter.email})
            </p>
            <p className="text-xs text-muted-foreground">
              {t("marinheiro.embark")}{" "}
              {[b.embarkLocation, b.embarkTime].filter(Boolean).join(" · ") ||
                t("reservar.embarkToArrangeShort")}{" "}
              • {t("marinheiro.total")} {currencyFmt.format(b.totalCents / 100)}
            </p>
            {b.bookingDate ? (
              <p className="text-xs font-medium text-foreground">
                {t("marinheiro.bookingDateLabel")}: {b.bookingDate}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t("marinheiro.passengers")} {b.passengersAdults} {t("marinheiro.adults")}
              {b.hasKids ? ` + ${b.passengersChildren} ${t("marinheiro.kids")}` : ""}
              {b.bbqKit ? ` • ${t("marinheiro.bbq")}` : ""}
              {b.jetSki ? ` • ${t("marinheiro.jetSkiShort")}` : ""}
            </p>
            {b.routeIslands && b.routeIslands.length > 0 ? (
              <p className="break-words text-xs text-muted-foreground">
                {t("marinheiro.bookingRoute")}: {b.routeIslands.join(", ")}
              </p>
            ) : null}
          </div>
          <Badge className="hidden w-fit shrink-0 bg-accent text-accent-foreground md:flex">
            {t("marinheiro.pendingBadge")}
          </Badge>
        </div>

        <OwnerRescheduleJustification b={b} t={t} />

        {actionBody}
      </div>
    </div>
  );
}

export function OwnerCompletedBookingCard({
  b,
  t,
  currencyFmt,
  onRated,
  variant = "panel",
}: {
  b: OwnerBookingRow;
  t: (k: string, o?: Record<string, unknown>) => string;
  currencyFmt: Intl.NumberFormat;
  onRated: (rating?: { stars: number; comment: string | null }) => void;
  variant?: "panel" | "detail";
}) {
  const ratingBlock = b.ratingRenter ? (
    <p className="flex items-center gap-1.5 text-sm text-foreground">
      <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
      {t("marinheiro.rateRenterRecorded", { n: b.ratingRenter.stars })}
    </p>
  ) : (
    <RateRenterForm bookingId={b.id} t={t} onDone={(rating) => onRated(rating)} embedded={variant === "detail"} />
  );

  if (variant === "detail") {
    return <div className="space-y-3">{ratingBlock}</div>;
  }

  return (
    <div className="surface-elevated space-y-3 rounded-xl p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{b.boat.nome}</p>
          <p className="break-words text-xs text-muted-foreground">
            {t("marinheiro.client")} {b.renter.nome} ({b.renter.email})
          </p>
          <p className="text-xs text-muted-foreground">
            {t("marinheiro.total")} {currencyFmt.format(b.totalCents / 100)}
          </p>
          {b.bookingDate ? (
            <p className="text-xs font-medium text-foreground">
              {t("marinheiro.bookingDateLabel")}: {b.bookingDate}
            </p>
          ) : null}
        </div>
        <Badge className="w-fit shrink-0" variant="secondary">
          {t("marinheiro.completedBadge")}
        </Badge>
      </div>
      {ratingBlock}
    </div>
  );
}
