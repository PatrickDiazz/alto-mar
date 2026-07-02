import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import { BookingChatEntry } from "@/components/chat/BookingChatEntry";
import type { RenterBooking } from "./renterBookingTypes";
import { RENTER_NOTICE_I18N } from "./renterBookingConstants";
import { RenterBookingHeroCard } from "./RenterBookingHeroCard";
import { RenterBookingFinancialCard } from "./RenterBookingFinancialCard";
import { RenterBookingDetailSections } from "./RenterBookingDetailSections";
import { RenterBookingTimeline } from "./RenterBookingTimeline";
import { RenterBookingHistoryList } from "./RenterBookingHistoryCard";
import { RenterBookingPanelDivider } from "./RenterBookingPanelDivider";
import { RenterBookingAlert } from "./RenterBookingAlert";
import { RENTER_CANCEL_BOX, RENTER_BTN_PRIMARY, RENTER_CARD, RENTER_CARD_COMPACT, RENTER_IMAGE_PLACEHOLDER, RENTER_TEXT_BODY, RENTER_TEXT_MUTED, RENTER_TEXT_TITLE } from "./renterBookingUi";
import { Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dispatch, SetStateAction } from "react";

export type RenterBookingDetailViewProps = {
  booking: RenterBooking;
  boatImage?: string | null;
  currencyFmt: Intl.NumberFormat;
  t: (k: string, o?: Record<string, unknown>) => string;
  lang: string;
  editing: boolean;
  editDraft: Partial<RenterBooking> | null;
  setEditDraft?: Dispatch<SetStateAction<Partial<RenterBooking> | null>>;
  onSave?: () => void;
  onCancelEdit?: () => void;
  onEdit?: () => void;
  canEdit: boolean;
  onCancelBooking?: () => void;
  cancellingId?: string | null;
  cancelDraftOpen?: boolean;
  cancelDraftReason?: string;
  onCancelDraftReasonChange?: (v: string) => void;
  onCancelDraftConfirm?: () => void;
  onCancelDraftClose?: () => void;
  stripeCheckoutDue?: boolean;
  onStripeCheckout?: () => void;
  stripePaying?: boolean;
  chatUnreadCount?: number;
  onChatUnreadChange?: (count: number) => void;
  autoOpenChat?: { peerLabel?: string; subtitle?: string };
  onRated?: () => void;
  /** History sidebar lists */
  pendingList: RenterBooking[];
  inProgressList: RenterBooking[];
  doneList: RenterBooking[];
  cancelledList: RenterBooking[];
  selectedId: string;
  boatImages: Record<string, string | undefined>;
  onSelectBooking: (id: string) => void;
};

export function RenterBookingDetailView({
  booking,
  boatImage,
  currencyFmt,
  t,
  lang,
  editing,
  editDraft,
  setEditDraft,
  onSave,
  onCancelEdit,
  onEdit,
  canEdit,
  onCancelBooking,
  cancellingId,
  cancelDraftOpen,
  cancelDraftReason,
  onCancelDraftReasonChange,
  onCancelDraftConfirm,
  onCancelDraftClose,
  stripeCheckoutDue,
  onStripeCheckout,
  stripePaying,
  chatUnreadCount = 0,
  onChatUnreadChange,
  autoOpenChat,
  onRated,
  pendingList,
  inProgressList,
  doneList,
  cancelledList,
  selectedId,
  boatImages,
  onSelectBooking,
}: RenterBookingDetailViewProps) {
  const b = booking;
  const showChat = !editing && b.status === "ACCEPTED";
  const canCancelBooking =
    Boolean(onCancelBooking) &&
    !editing &&
    (b.status === "PENDING" || b.status === "ACCEPTED");

  const cardClass = RENTER_CARD_COMPACT;
  const showAcceptedAlert = b.status === "ACCEPTED";
  const showNoticeAlert =
    Boolean(b.renterNoticeCode) &&
    Boolean(RENTER_NOTICE_I18N[b.renterNoticeCode!]) &&
    (b.status === "CANCELLED" || b.status === "DECLINED");
  const showEditActions =
    !editing && (canCancelBooking || cancelDraftOpen || (canEdit && onEdit));
  const showSaveActions = editing && onSave && onCancelEdit;
  const showRatingRecorded = b.status === "COMPLETED" && Boolean(b.ratingBoat);
  const showRatingForm = b.status === "COMPLETED" && !b.ratingBoat && Boolean(onRated);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-0">
      {/* Main: booking details */}
      <div className="order-1 min-w-0 flex-1 lg:pr-2">
        <div className="pb-4">
          <div className="overflow-hidden rounded-2xl">
            <div className={cn("relative w-full", RENTER_IMAGE_PLACEHOLDER)}>
              <div className="aspect-[2.5/1] max-h-[220px] min-h-[140px] w-full">
                {boatImage ? (
                  <img
                    src={boatImage}
                    alt={b.boat.nome}
                    className="h-full w-full object-cover"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                    <Ship className="h-16 w-16" strokeWidth={1.25} />
                  </div>
                )}
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#F7F9FC] from-10% via-[#F7F9FC]/70 via-55% to-transparent dark:from-background dark:via-background/70"
                aria-hidden
              />
            </div>

            <div className="relative -mt-12 lg:-mt-14">
              <div className="flex flex-col gap-4 px-1 pt-2 lg:flex-row lg:items-start lg:gap-5">
                <div className="min-w-0 flex-1">
                  <RenterBookingHeroCard
                    booking={b}
                    boatImage={boatImage}
                    currencyFmt={currencyFmt}
                    t={t}
                    lang={lang}
                    stripeCheckoutDue={stripeCheckoutDue}
                    stripePaying={stripePaying}
                    onStripeCheckout={onStripeCheckout}
                    onEdit={onEdit}
                    canEdit={canEdit && !editing}
                    compact
                    embedded
                    hideImage
                  />
                </div>
                <div
                  className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-slate-200/90 to-transparent dark:via-border/80 lg:h-auto lg:w-px lg:self-stretch lg:bg-gradient-to-b"
                  aria-hidden
                />
                <RenterBookingFinancialCard
                  booking={b}
                  currencyFmt={currencyFmt}
                  t={t}
                  lang={lang}
                  stripeCheckoutDue={stripeCheckoutDue}
                  stripePaying={stripePaying}
                  onStripeCheckout={onStripeCheckout}
                  compact
                  embedded
                />
              </div>
            </div>
          </div>
        </div>

        {(showAcceptedAlert || showNoticeAlert) ? (
          <>
            <RenterBookingPanelDivider orientation="horizontal" />
            <div className="space-y-3 py-4">
              {showAcceptedAlert ? (
                <RenterBookingAlert variant="success" icon={Info}>
                  {t("reservasConta.arriveEarlyNotice")}
                </RenterBookingAlert>
              ) : null}
              {showNoticeAlert ? (
                <RenterBookingAlert variant="warning" icon={Info}>
                  {t(RENTER_NOTICE_I18N[b.renterNoticeCode!])}
                </RenterBookingAlert>
              ) : null}
              {showChat ? (
                <BookingChatEntry
                  bookingId={b.id}
                  audience="renter"
                  peerLabel={autoOpenChat?.peerLabel ?? t("bookingChat.owner")}
                  subtitle={autoOpenChat?.subtitle ?? b.boat.nome}
                  unreadCount={chatUnreadCount}
                  onUnreadChange={onChatUnreadChange}
                  autoOpen={Boolean(autoOpenChat)}
                />
              ) : null}
            </div>
          </>
        ) : null}

        <RenterBookingPanelDivider orientation="horizontal" />

        <div className="py-4">
          <RenterBookingDetailSections
            booking={b}
            editing={editing}
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            currencyFmt={currencyFmt}
            t={t}
            lang={lang}
            compact={!editing}
          />
        </div>

        {showSaveActions ? (
          <>
            <RenterBookingPanelDivider orientation="horizontal" />
            <div className="flex flex-wrap items-center gap-2 py-4">
              <Button type="button" size="sm" className={RENTER_BTN_PRIMARY} onClick={onSave}>
                {t("reservasConta.save")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>
                {t("common.cancel")}
              </Button>
            </div>
          </>
        ) : null}

        {showEditActions ? (
          <>
            <RenterBookingPanelDivider orientation="horizontal" />
            <div className="flex flex-wrap items-center gap-2 py-4">
            {canEdit && onEdit ? (
              <Button type="button" size="sm" className={RENTER_BTN_PRIMARY} onClick={onEdit}>
                {t("reservasConta.edit")}
              </Button>
            ) : null}
            {canCancelBooking ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                disabled={cancellingId === b.id}
                onClick={onCancelBooking}
              >
                {cancellingId === b.id
                  ? t("reservasConta.cancelSubmitting")
                  : t("reservasConta.cancelBooking")}
              </Button>
            ) : null}
            {cancelDraftOpen ? (
              <div className={RENTER_CANCEL_BOX}>
                <Label htmlFor={`cancel-reason-${b.id}`}>{t("reservasConta.cancelReasonLabel")}</Label>
                <Textarea
                  id={`cancel-reason-${b.id}`}
                  className="rounded-xl bg-background"
                  value={cancelDraftReason || ""}
                  maxLength={1000}
                  rows={3}
                  placeholder={t("reservasConta.cancelReasonPh")}
                  onChange={(e) => onCancelDraftReasonChange?.(e.target.value)}
                />
                <p className={cn("text-xs", RENTER_TEXT_MUTED)}>{t("reservasConta.cancelPolicyHint")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={
                      Boolean(cancellingId) || String(cancelDraftReason || "").trim().length < 10
                    }
                    onClick={onCancelDraftConfirm}
                  >
                    {cancellingId === b.id
                      ? t("reservasConta.cancelSubmitting")
                      : t("reservasConta.cancelConfirmAction")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={Boolean(cancellingId)}
                    onClick={onCancelDraftClose}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : null}
            </div>
          </>
        ) : null}

        {showRatingRecorded ? (
          <>
            <RenterBookingPanelDivider orientation="horizontal" />
            <div className="py-4">
              <p className={cn("flex items-center gap-1.5 text-xs", RENTER_TEXT_BODY)}>
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {t("reservasConta.rateBoatRecorded", { n: b.ratingBoat!.stars })}
              </p>
            </div>
          </>
        ) : null}
        {showRatingForm ? (
          <>
            <RenterBookingPanelDivider orientation="horizontal" />
            <div className="py-4">
              <RateBoatForm bookingId={b.id} t={t} onDone={onRated!} bare />
            </div>
          </>
        ) : null}

      </div>

      <RenterBookingPanelDivider orientation="horizontal" className="order-2 lg:hidden" />
      <RenterBookingPanelDivider orientation="vertical" className="order-3 hidden lg:order-2 lg:flex" />

      {/* Right: timeline + other bookings */}
      <aside className="order-3 w-full shrink-0 space-y-4 lg:order-3 lg:w-[min(100%,380px)] lg:pl-2">
        <div className="lg:sticky lg:top-24 lg:space-y-4">
          <RenterBookingTimeline booking={b} t={t} lang={lang} compact />

          <div className={cardClass}>
            <h3 className={cn("text-xs font-semibold", RENTER_TEXT_TITLE)}>{t("reservasConta.historyTitle")}</h3>
            <div className="mt-3 space-y-4">
              <RenterBookingHistoryList
                title={t("reservasConta.sectionPending")}
                bookings={pendingList}
                selectedId={selectedId}
                boatImages={boatImages}
                currencyFmt={currencyFmt}
                t={t}
                lang={lang}
                onSelect={onSelectBooking}
                empty={t("reservasConta.emptyPending")}
              />
              <RenterBookingHistoryList
                title={t("reservasConta.sectionProgress")}
                bookings={inProgressList}
                selectedId={selectedId}
                boatImages={boatImages}
                currencyFmt={currencyFmt}
                t={t}
                lang={lang}
                onSelect={onSelectBooking}
                empty={t("reservasConta.emptyProgress")}
              />
              <RenterBookingHistoryList
                title={t("reservasConta.sectionDone")}
                bookings={doneList}
                selectedId={selectedId}
                boatImages={boatImages}
                currencyFmt={currencyFmt}
                t={t}
                lang={lang}
                onSelect={onSelectBooking}
                empty={t("reservasConta.emptyDone")}
              />
              <RenterBookingHistoryList
                title={t("reservasConta.sectionCancelled")}
                bookings={cancelledList}
                selectedId={selectedId}
                boatImages={boatImages}
                currencyFmt={currencyFmt}
                t={t}
                lang={lang}
                onSelect={onSelectBooking}
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function RateBoatForm({
  bookingId,
  t,
  onDone,
  bare = false,
}: {
  bookingId: string;
  t: (k: string, o?: Record<string, unknown>) => string;
  onDone: () => void;
  bare?: boolean;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (stars < 1) {
      toast.error(t("reservasConta.rateBoatPickStars"));
      return;
    }
    setSubmitting(true);
    try {
      const resp = await authFetch(`/api/renter/bookings/${bookingId}/rate-boat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment: comment.trim() || undefined }),
      });
      if (resp.status === 401) return;
      if (!resp.ok) throw new Error(await readResponseErrorMessage(resp, t("reservasConta.rateBoatFail")));
      toast.success(t("reservasConta.rateBoatOk"));
      onDone();
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("reservasConta.rateBoatFail")).trim();
      toast.error(m || t("reservasConta.rateBoatFail"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={bare ? undefined : RENTER_CARD}>
      <p className={cn("text-xs font-semibold", RENTER_TEXT_TITLE)}>{t("reservasConta.rateBoatTitle")}</p>
      <p className={cn("mt-1 text-xs", RENTER_TEXT_MUTED)}>{t("reservasConta.rateBoatHint")}</p>
      <div className="mt-2 flex items-center gap-1" role="group" aria-label={t("reservasConta.rateBoatTitle")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="rounded p-0.5 transition-colors hover:bg-muted disabled:opacity-50"
            disabled={submitting}
            onClick={() => setStars(n)}
            aria-pressed={stars >= n}
          >
            <Star
              className={`${bare ? "h-5 w-5" : "h-7 w-7"} ${n <= stars ? "fill-amber-500 text-amber-500" : "text-slate-300 dark:text-muted-foreground/50"}`}
            />
          </button>
        ))}
      </div>
      <div className="mt-2">
        <Label className="text-xs">{t("reservasConta.rateBoatComment")}</Label>
        <Input
          className="mt-1 rounded-xl"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          disabled={submitting}
        />
      </div>
      <Button
        type="button"
        size="sm"
        className={cn("mt-2", RENTER_BTN_PRIMARY)}
        onClick={() => void submit()}
        disabled={submitting}
      >
        {submitting ? t("reservasConta.rateBoatSubmitting") : t("reservasConta.rateBoatSubmit")}
      </Button>
    </div>
  );
}
