import { useTranslation } from "react-i18next";
import {
  RENTER_BANNER_PENDING,
  RENTER_EMPTY_STATE,
  RENTER_TEXT_MUTED,
  RENTER_TEXT_SUBBODY,
} from "@/components/renter/booking/renterBookingUi";
import { RenterBookingDetailView } from "@/components/renter/booking/RenterBookingDetailView";
import { useRenterBookings } from "@/hooks/useRenterBookings";
import { cn } from "@/lib/utils";

type RenterBookingsPanelProps = {
  autoOpenChatBookingId?: string | null;
  autoOpenChatPeerLabel?: string;
  autoOpenChatSubtitle?: string;
  initialSelectedId?: string | null;
};

export function RenterBookingsPanel({
  autoOpenChatBookingId = null,
  autoOpenChatPeerLabel,
  autoOpenChatSubtitle,
  initialSelectedId = null,
}: RenterBookingsPanelProps = {}) {
  const { t } = useTranslation();
  const bookings = useRenterBookings({ autoOpenChatBookingId, initialSelectedId });
  const {
    user,
    i18n,
    currencyFmt,
    list,
    loading,
    editingId,
    editDraft,
    setEditDraft,
    cancellingId,
    cancelDraftBookingId,
    cancelDraftReason,
    setCancelDraftReason,
    chatUnreadByBooking,
    selectedId,
    setSelectedId,
    boatImages,
    pending,
    inProgress,
    done,
    cancelled,
    selectedBooking,
    saveEdit,
    startEdit,
    cancelEdit,
    submitCancelBooking,
    requestCancelBooking,
    payStripeCheckout,
    stripeCheckoutDueFor,
    canEditBooking,
    stripePayingId,
    handleChatUnreadChange,
    load,
    setCancelDraftBookingId,
  } = bookings;

  if (!user || user.role !== "banhista") return null;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className={cn("text-sm", RENTER_TEXT_MUTED)}>{t("common.loading")}</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className={RENTER_EMPTY_STATE}>
        <p className={cn("text-base font-medium", RENTER_TEXT_SUBBODY)}>{t("reservasConta.emptyAll")}</p>
        <p className={cn("mt-2 text-sm", RENTER_TEXT_MUTED)}>{t("reservasConta.emptyAllHint")}</p>
      </div>
    );
  }

  if (!selectedBooking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className={cn("text-sm", RENTER_TEXT_MUTED)}>{t("common.loading")}</p>
      </div>
    );
  }

  const b = selectedBooking;
  const stripeCheckoutDue = stripeCheckoutDueFor(b);
  const canEdit = canEditBooking(b);
  const editing = editingId === b.id;

  return (
    <div className="space-y-6">
      {pending.length > 0 && selectedBooking.status !== "PENDING" ? (
        <div className={RENTER_BANNER_PENDING}>
          {t("reservasConta.pendingBanner", { n: pending.length })}
        </div>
      ) : null}

      <RenterBookingDetailView
        booking={b}
        boatImage={boatImages[b.boat.id]}
        currencyFmt={currencyFmt}
        t={t}
        lang={i18n.language}
        editing={editing}
        editDraft={editDraft}
        setEditDraft={setEditDraft}
        onSave={() => void saveEdit()}
        onCancelEdit={cancelEdit}
        onEdit={() => startEdit(b)}
        canEdit={canEdit}
        onCancelBooking={() => requestCancelBooking(b)}
        cancellingId={cancellingId}
        cancelDraftOpen={cancelDraftBookingId === b.id}
        cancelDraftReason={cancelDraftReason}
        onCancelDraftReasonChange={setCancelDraftReason}
        onCancelDraftConfirm={() => submitCancelBooking(b, cancelDraftReason)}
        onCancelDraftClose={() => {
          setCancelDraftBookingId(null);
          setCancelDraftReason("");
        }}
        stripeCheckoutDue={stripeCheckoutDue}
        onStripeCheckout={() => void payStripeCheckout(b.id)}
        stripePaying={stripePayingId === b.id}
        chatUnreadCount={chatUnreadByBooking[b.id] ?? 0}
        onChatUnreadChange={(n) => handleChatUnreadChange(b.id, n)}
        autoOpenChat={
          autoOpenChatBookingId === b.id
            ? { peerLabel: autoOpenChatPeerLabel, subtitle: autoOpenChatSubtitle }
            : undefined
        }
        onRated={() => void load({ silent: true })}
        pendingList={pending}
        inProgressList={inProgress}
        doneList={done}
        cancelledList={cancelled}
        selectedId={selectedId ?? b.id}
        boatImages={boatImages}
        onSelectBooking={(id) => {
          setSelectedId(id);
          cancelEdit();
          setCancelDraftBookingId(null);
          setCancelDraftReason("");
        }}
      />
    </div>
  );
}
