import { useEffect, useMemo, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Info, Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useRenterBookings } from "@/hooks/useRenterBookings";
import { RenterBookingMobileHeader } from "@/components/renter/mobile/RenterBookingMobileHeader";
import {
  RenterBookingMobileHero,
  RenterBookingMobileQuickInfo,
} from "@/components/renter/mobile/RenterBookingMobileCards";
import {
  RenterBookingMobileActionBar,
  RenterBookingMobileEditBar,
  RenterBookingMobilePayBar,
} from "@/components/renter/mobile/RenterBookingMobileBottomBar";
import { RenterBookingTimeline } from "@/components/renter/booking/RenterBookingTimeline";
import { RenterBookingFinancialCard } from "@/components/renter/booking/RenterBookingFinancialCard";
import { RenterBookingDetailSections } from "@/components/renter/booking/RenterBookingDetailSections";
import { RenterBookingAlert } from "@/components/renter/booking/RenterBookingAlert";
import { RenterBookingPanelDivider } from "@/components/renter/booking/RenterBookingPanelDivider";
import { BookingChatEntry } from "@/components/chat/BookingChatEntry";
import {
  RENTER_CANCEL_BOX,
  RENTER_PAGE_BG,
  RENTER_TEXT_BODY,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_TITLE,
  financialBreakdown,
} from "@/components/renter/booking/renterBookingUi";
import { RENTER_NOTICE_I18N } from "@/components/renter/booking/renterBookingConstants";
import { cn } from "@/lib/utils";

const MOBILE_ACCORDION_ITEM =
  "border-0 border-b border-slate-200/80 bg-transparent px-0 shadow-none last:border-b-0 dark:border-border/60";
const MOBILE_ACCORDION_TRIGGER = "py-4 text-sm font-semibold hover:no-underline";

type Props = {
  bookingId: string;
  autoOpenChat?: boolean;
  autoOpenChatPeerLabel?: string;
  autoOpenChatSubtitle?: string;
};

function MobileSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("py-4", className)}>{children}</section>;
}

export function RenterBookingMobileDetail({
  bookingId,
  autoOpenChat = false,
  autoOpenChatPeerLabel,
  autoOpenChatSubtitle,
}: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editMode = searchParams.get("edit") === "1";

  const bookings = useRenterBookings({ autoOpenChatBookingId: autoOpenChat ? bookingId : null });
  const {
    currencyFmt,
    boatImages,
    getBookingById,
    loading,
    editingId,
    editDraft,
    setEditDraft,
    startEdit,
    cancelEdit,
    saveEdit,
    cancellingId,
    cancelDraftBookingId,
    cancelDraftReason,
    setCancelDraftReason,
    setCancelDraftBookingId,
    submitCancelBooking,
    requestCancelBooking,
    payStripeCheckout,
    stripeCheckoutDueFor,
    canEditBooking,
    stripePayingId,
    chatUnreadByBooking,
    handleChatUnreadChange,
  } = bookings;

  const b = getBookingById(bookingId);
  const isEditing = editMode || editingId === bookingId;

  useEffect(() => {
    if (!b || !editMode) return;
    if (editingId !== bookingId) startEdit(b);
  }, [b, editMode, editingId, bookingId, startEdit]);

  const stripeCheckoutDue = b ? stripeCheckoutDueFor(b) : false;
  const canEdit = b ? canEditBooking(b) : false;
  const showChat = b && !isEditing && b.status === "ACCEPTED";
  const showAcceptedAlert = b?.status === "ACCEPTED";
  const showNoticeAlert =
    b &&
    Boolean(b.renterNoticeCode) &&
    Boolean(RENTER_NOTICE_I18N[b.renterNoticeCode!]) &&
    (b.status === "CANCELLED" || b.status === "DECLINED");

  const menuItems = useMemo(() => {
    if (!b || isEditing) return [];
    const items: { label: string; onClick: () => void; destructive?: boolean }[] = [];
    if (canEdit) {
      items.push({
        label: t("reservasConta.edit"),
        onClick: () => setSearchParams({ edit: "1" }),
      });
    }
    if (b.status === "PENDING" || b.status === "ACCEPTED") {
      items.push({
        label: t("reservasConta.cancelBooking"),
        onClick: () => requestCancelBooking(b),
        destructive: true,
      });
    }
    return items;
  }, [b, canEdit, isEditing, requestCancelBooking, setSearchParams, t]);

  const bottomPad = stripeCheckoutDue && !isEditing ? "pb-28" : isEditing ? "pb-28" : canEdit && !stripeCheckoutDue ? "pb-28" : "pb-8";

  if (loading && !b) {
    return (
      <div className={cn("flex min-h-[100dvh] items-center justify-center", RENTER_PAGE_BG)}>
        <p className={cn("text-sm", RENTER_TEXT_MUTED)}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!b) {
    return (
      <div className={cn("flex min-h-[100dvh] flex-col", RENTER_PAGE_BG)}>
        <RenterBookingMobileHeader title={t("reservasConta.detailTitle")} onBack={() => navigate("/conta/reservas")} />
        <p className={cn("p-8 text-center text-sm", RENTER_TEXT_MUTED)}>{t("reservasConta.bookingNotFound")}</p>
      </div>
    );
  }

  const { totalReais } = financialBreakdown(b);
  const cancelDraftOpen = cancelDraftBookingId === b.id;

  const handleSave = async () => {
    const ok = await saveEdit({
      onSuccess: () => {
        setSearchParams({});
        navigate("/conta/reservas");
      },
    });
    if (ok) {
      setSearchParams({});
      navigate("/conta/reservas");
    }
  };

  const handleCancelEdit = () => {
    cancelEdit();
    setSearchParams({});
  };

  return (
    <div className={cn("flex min-h-[100dvh] flex-col", RENTER_PAGE_BG)}>
      <RenterBookingMobileHeader
        title={isEditing ? t("reservasConta.editTitle") : t("reservasConta.detailTitle")}
        onBack={() => {
          if (isEditing) handleCancelEdit();
          else navigate("/conta/reservas");
        }}
        menuItems={menuItems.length > 0 ? menuItems : undefined}
      />

      <div className={cn("flex-1 px-4 pt-2", bottomPad)}>
        {!isEditing ? (
          <>
            <RenterBookingMobileHero
              booking={b}
              boatImage={boatImages[b.boat.id]}
              currencyFmt={currencyFmt}
              t={t}
              fullBleed
            />

            <RenterBookingPanelDivider orientation="horizontal" />

            <MobileSection>
              <RenterBookingMobileQuickInfo booking={b} t={t} lang={i18n.language} />
            </MobileSection>

            <RenterBookingPanelDivider orientation="horizontal" />

            <MobileSection>
              <RenterBookingFinancialCard
                booking={b}
                currencyFmt={currencyFmt}
                t={t}
                lang={i18n.language}
                stripeCheckoutDue={stripeCheckoutDue}
                stripePaying={stripePayingId === b.id}
                onStripeCheckout={() => void payStripeCheckout(b.id)}
                compact
                embedded
              />
            </MobileSection>

            <RenterBookingPanelDivider orientation="horizontal" />

            <MobileSection>
              <h3 className={cn("mb-3 text-sm font-semibold", RENTER_TEXT_TITLE)}>
                {t("reservasConta.nextStepsTitle")}
              </h3>
              <RenterBookingTimeline booking={b} t={t} lang={i18n.language} compact bare />
            </MobileSection>

            {(showAcceptedAlert || showNoticeAlert || showChat) && (
              <>
                <RenterBookingPanelDivider orientation="horizontal" />
                <MobileSection className="space-y-3">
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
                      peerLabel={autoOpenChatPeerLabel ?? t("bookingChat.owner")}
                      subtitle={autoOpenChatSubtitle ?? b.boat.nome}
                      unreadCount={chatUnreadByBooking[b.id] ?? 0}
                      onUnreadChange={(n) => handleChatUnreadChange(b.id, n)}
                      autoOpen={autoOpenChat}
                    />
                  ) : null}
                </MobileSection>
              </>
            )}

            <RenterBookingPanelDivider orientation="horizontal" />

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="trip" className={MOBILE_ACCORDION_ITEM}>
                <AccordionTrigger className={MOBILE_ACCORDION_TRIGGER}>
                  {t("reservasConta.sectionTripData")}
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-0">
                  <RenterBookingDetailSections
                    booking={b}
                    editing={false}
                    editDraft={null}
                    currencyFmt={currencyFmt}
                    t={t}
                    lang={i18n.language}
                    mobileSection="trip"
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="embark" className={MOBILE_ACCORDION_ITEM}>
                <AccordionTrigger className={MOBILE_ACCORDION_TRIGGER}>
                  {t("reservar.embark")}
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-0">
                  <RenterBookingDetailSections
                    booking={b}
                    editing={false}
                    editDraft={null}
                    currencyFmt={currencyFmt}
                    t={t}
                    lang={i18n.language}
                    mobileSection="embark"
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="extras" className={MOBILE_ACCORDION_ITEM}>
                <AccordionTrigger className={MOBILE_ACCORDION_TRIGGER}>
                  {t("reservasConta.sectionExtras")}
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-0">
                  <RenterBookingDetailSections
                    booking={b}
                    editing={false}
                    editDraft={null}
                    currencyFmt={currencyFmt}
                    t={t}
                    lang={i18n.language}
                    mobileSection="extras"
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="route" className={MOBILE_ACCORDION_ITEM}>
                <AccordionTrigger className={MOBILE_ACCORDION_TRIGGER}>
                  {t("reservasConta.routeStops")}
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-0">
                  <RenterBookingDetailSections
                    booking={b}
                    editing={false}
                    editDraft={null}
                    currencyFmt={currencyFmt}
                    t={t}
                    lang={i18n.language}
                    mobileSection="route"
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="financial" className={MOBILE_ACCORDION_ITEM}>
                <AccordionTrigger className={MOBILE_ACCORDION_TRIGGER}>
                  {t("reservasConta.financialSummary")}
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-0">
                  <RenterBookingFinancialCard
                    booking={b}
                    currencyFmt={currencyFmt}
                    t={t}
                    lang={i18n.language}
                    stripeCheckoutDue={false}
                    compact
                    embedded
                    hideHeader
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {b.status === "COMPLETED" && b.ratingBoat ? (
              <>
                <RenterBookingPanelDivider orientation="horizontal" />
                <MobileSection>
                  <p className={cn("flex items-center gap-1.5 text-xs", RENTER_TEXT_BODY)}>
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    {t("reservasConta.rateBoatRecorded", { n: b.ratingBoat.stars })}
                  </p>
                </MobileSection>
              </>
            ) : null}

            {cancelDraftOpen ? (
              <>
                <RenterBookingPanelDivider orientation="horizontal" />
                <MobileSection>
                  <div className={RENTER_CANCEL_BOX}>
                    <Label htmlFor={`cancel-reason-m-${b.id}`}>{t("reservasConta.cancelReasonLabel")}</Label>
                    <Textarea
                      id={`cancel-reason-m-${b.id}`}
                      className="rounded-xl bg-background"
                      value={cancelDraftReason || ""}
                      maxLength={1000}
                      rows={3}
                      placeholder={t("reservasConta.cancelReasonPh")}
                      onChange={(e) => setCancelDraftReason(e.target.value)}
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
                        onClick={() => submitCancelBooking(b, cancelDraftReason)}
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
                        onClick={() => {
                          setCancelDraftBookingId(null);
                          setCancelDraftReason("");
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                </MobileSection>
              </>
            ) : null}
          </>
        ) : (
          <div className="space-y-4 py-4 pb-4">
            <RenterBookingDetailSections
              booking={b}
              editing
              editDraft={editDraft}
              setEditDraft={setEditDraft}
              currencyFmt={currencyFmt}
              t={t}
              lang={i18n.language}
            />
          </div>
        )}
      </div>

      {stripeCheckoutDue && !isEditing ? (
        <RenterBookingMobilePayBar
          totalLabel={currencyFmt.format(totalReais)}
          payLabel={
            stripePayingId === b.id ? t("reservasConta.payStripeSubmitting") : t("reservasConta.payNow")
          }
          paying={stripePayingId === b.id}
          onPay={() => void payStripeCheckout(b.id)}
        />
      ) : null}

      {isEditing ? (
        <RenterBookingMobileEditBar
          saveLabel={t("reservasConta.save")}
          cancelLabel={t("common.cancel")}
          onSave={() => void handleSave()}
          onCancel={handleCancelEdit}
        />
      ) : null}

      {!isEditing && !stripeCheckoutDue && canEdit && !cancelDraftOpen ? (
        <RenterBookingMobileActionBar
          primaryLabel={t("reservasConta.edit")}
          onPrimary={() => setSearchParams({ edit: "1" })}
          destructiveLabel={t("reservasConta.cancelBooking")}
          onDestructive={() => requestCancelBooking(b)}
          destructiveDisabled={Boolean(cancellingId)}
        />
      ) : null}
    </div>
  );
}
